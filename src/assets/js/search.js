/* ================================================================
The client-side search functionality for this static website

Using a customized version of Okapi BM25 algorithm:

BM25(D, Q) = Σ i = 1 [
  ((((k1 + 1) * f(qi, D)) * ln((N - n(qi) + 1/2) / (n(qi) + 1/2) + 1) * (k2 + 1)) /
  (k1 * ((1 - b) + b * (|D| / avgdl)) + f(qi, D) + k2)) *
  (((k3 + 1) + qf(qi, Q)) / (k3 + qf(qi, Q) + 1))
]

Free parameters are:
  - b    The parameter for regulating the impact of document length normalization
  - k1   The saturation parameter
  - k2   The parameter for fixing issue of large documents
  - k3   The parameter for managing the impact of query boost

Where:
  - f(qi, D)         The frequency of term qi in document D
  - |D|              The length of document D (in words)
  - avgdl            The average of lengths of all documents
  - N                The number of documents in the corpus
  - n(qi)            The number of documents contaning the term qi
  - qf(qi, Q)        The frequency of term qi over the set of query, Q

This allows duplicate terms in query set considered to be more relevant, adding
weight to the output relevance. Also fixes issue related to precision in TF
component saturation for long documents.

================================================================ */

/*
Old implementation I used:

BM25(D, Q) = Σ i = 1 [
  (((k1 + 1) * f(qi, D)) / (k1 * ((1 - b) + b * (|D| / avgdl)) + f(qi, D))) *
  ln((N - n(qi) + 1/2) / (n(qi) + 1/2) + 1) *
  (((k3 + 1) + qf(qi, Q)) / (k3 + qf(qi, Q) + 1))
]
*/

(function(factory) {
  "use strict";
  var loaded = false;
  function fn() {
    if (loaded) { return; }
    loaded = true;
    factory();
  }
  window.onload = fn;
  document.addEventListener("DOMContentLoaded", fn)
})(function() {
"use strict";

var b  = 0.75;
var k1 = 1.5;
var k2 = 0.5;
var k3 = 1.0;

// get placeholders
var msg = document.getElementById("msg-status");
var resultDisplay = document.getElementById("search-results");
var searchInput = document.getElementById("search-bar");

msg.innerHTML = "Search here!";

function searchDocs(query) {
  if (!languageData) { return; }
  // split tokens
  var tokens = languageData.split(query);
  // repititions of each stems
  var queryTermsFreq = {};
  // query terms set to process
  var querySets = [];

  // pre-process query tokens first
  for (var i = 0; i < tokens.length; i++) {
    var tok = tokens[i];
    // skip stopwords
    if (languageData.stop(tok)) { continue; }
    // stem word
    var stem = languageData.stem(tok);
    // increment counters
    queryTermsFreq[stem] = (queryTermsFreq[stem] || 0) + 1;
    // add to list of terms to process
    if (!querySets.includes(stem)) { querySets.push(stem); }
  }

  // cached tf normalization factors for eache processed documents
  var cachedNormFactors = {};
  // map of relevances
  var relevances = {};

  // calculate relevance
  for (var i = 0; i < querySets.length; i++) {
    var term = querySets[i];
    var docList = searchIndex.terms[term];

    // no document found indexed containing this term
    if (!docList) { continue; }

    var docsContainTerm = docList.length;

    // the inverse document frequency of this term over the documents
    var inverseDocFreq = Math.log(
        (searchIndex.corpusSize - docsContainTerm + 0.5) /
        (docsContainTerm + 0.5) + 1
      );
    // boost for query
    var queryBoost = ((k3 + 1) * queryTermsFreq[term]) / (k3 + queryTermsFreq[term]);

    for (var j = 0; j < docsContainTerm; j++) {
      var docTermInfo = docList[j]; // [ doc number, term freq on doc ]
      var termFreq = docTermInfo[1]; // f(qi, D)
      var docLength = searchIndex.docs[docTermInfo[0]][1]; // |D|
      var docId = searchIndex.docs[docTermInfo[0]][0]; // doc hash id on dataIndex

      // get the term frequency normalization factor for this document
      var normFactor = typeof cachedNormFactors[docTermInfo[0]] == "number"
        ? cachedNormFactors[docTermInfo[0]]
        : cachedNormFactors[docTermInfo[0]] =
        (k1 * ((1 - b) + (b * (docLength / searchIndex.avgdl))));

      // compute for the saturated tf component, with idf at numerator and applied precision
      // issue workaround, and multiplied with query frequency for boost
      relevances[docId] = (relevances[docId] || 0) +
        (((k1 + 1) * termFreq * inverseDocFreq * (k2 + 1)) /
        (normFactor + termFreq + k2)) * queryBoost;
    }
  }

  var searchResult = [];

  // we need an array
  for (var docId in relevances) {
    if (Object.hasOwnProperty.call(relevances, docId)) {
      searchResult.push({
        identifier: docId,
        relevance: relevances[docId],
      });
    }
  }

  // sort the result
  searchResult.sort(function(a, b) {
    return b.relevance - a.relevance;
  });

  return searchResult;
}

// make this function accessible
docUtil.search = searchDocs;

// search query
var q = docUtil.query["q"];

if (q && q.length) {
  // let's show this to user
  searchInput.value = q;
  // put it on the title
  document.title = q + " \u2012 VYT Docs Search";

  // wait for the search
  (function waitSearch() {
    // wait for search index to load
    msg.innerHTML = "Loading index...";
    if (!window.searchIndex || !window.dataIndex) { return setTimeout(waitSearch, 1000); }

    // do search
    msg.innerHTML = "Searching...";
    // let's time it to show the search speed
    var start = Date.now();
    var result = searchDocs(q);
    var delta = (Date.now() - start) / 1000;

    if (!result.length) {
      msg.innerHTML = "No result found. Try checking your spelling?";
      return;
    }

    // display to users
    var idx = 0;

    function displayResults() {
      if (idx >= result.length) { return; }
      var item = result[idx++];
      var info = dataIndex[item.identifier];

      // setup display item
      var block = document.createElement("div");
      var title = document.createElement("h3");
      var anchor = document.createElement("a");
      var description = document.createElement("p");
      block.classList.add("search-item");
      title.classList.add("search-item-title");
      description.classList.add("search-item-description");
      title.appendChild(anchor);
      block.appendChild(title);
      block.appendChild(description);
      anchor.appendChild(document.createTextNode(info.title));
      description.appendChild(document.createTextNode(info.about));
      anchor.href = info.location + ".html?h=" + encodeURIComponent(docUtil.query["q"]);

      // add to results
      resultDisplay.appendChild(block);

      // delay next item to avoid lag in UI
      setTimeout(displayResults, 15);
    }

    displayResults();

    msg.innerHTML = "Found " + result.length + " result(s) in " + delta + " seconds!";
  })();
}

});
