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
  let loaded = false;
  function fn() {
    if (loaded) { return; }
    loaded = true;
    factory();
  }
  window.onload = fn;
  document.addEventListener("DOMContentLoaded", fn)
})(function() {
"use strict";

const b  = 0.75;
const k1 = 1.5;
const k2 = 0.5;
const k3 = 1.0;

// get placeholders
const msg = document.getElementById("msg-status");
const resultDisplay = document.getElementById("search-results");
const searchInput = document.getElementById("search-bar");

msg.innerHTML = "Search here!";

function searchDocs(query) {
  if (!languageData) { return; }
  // split tokens
  const tokens = languageData.split(query);
  // repititions of each stems
  const queryTermsFreq = {};
  // query terms set to process
  const querySets = [];

  // pre-process query tokens first
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // skip stopwords
    if (languageData.stop(tok)) { continue; }
    // stem word
    const stem = languageData.stem(tok);
    // increment counters
    queryTermsFreq[stem] = (queryTermsFreq[stem] || 0) + 1;
    // add to list of terms to process
    if (!querySets.includes(stem)) { querySets.push(stem); }
  }

  // cached tf normalization factors for eache processed documents
  const cachedNormFactors = {};
  // map of relevances
  const relevances = {};

  // calculate relevance
  for (let i = 0; i < querySets.length; i++) {
    const term = querySets[i];
    const docList = searchIndex.terms[term];

    // no document found indexed containing this term
    if (!docList) { continue; }

    const docsContainTerm = docList.length;

    // the inverse document frequency of this term over the documents
    const inverseDocFreq = Math.log(
        (searchIndex.corpusSize - docsContainTerm + 0.5) /
        (docsContainTerm + 0.5) + 1
      );
    // boost for query
    const queryBoost = ((k3 + 1) * queryTermsFreq[term]) / (k3 + queryTermsFreq[term]);

    for (let j = 0; j < docsContainTerm; j++) {
      const docTermInfo = docList[j]; // [ doc number, term freq on doc ]
      const termFreq = docTermInfo[1]; // f(qi, D)
      const docLength = searchIndex.docs[docTermInfo[0]][1]; // |D|
      const docId = searchIndex.docs[docTermInfo[0]][0]; // doc hash id on dataIndex

      // get the term frequency normalization factor for this document
      const normFactor = typeof cachedNormFactors[docTermInfo[0]] == "number"
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

  const searchResult = [];

  // we need an array
  for (const docId in relevances) {
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

// utility function for getting article text
function getArticleTextFromHTML(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");

  // the article element
  const mainEl = doc.getElementById("content");
  if (!mainEl) return "";

  // remove these: ¶
  mainEl.querySelectorAll(".headerlink")
    .forEach(el => el.remove());

  // get the article text
  return mainEl.textContent || mainEl.innerText;
}

// utility function for making search summary
function makeArticleExcerpt(text, terms) {
  if (text.length == 0) return "";

  // ignore case when matching keywords
  const textLower = text.toLowerCase();

  // find the last keyword's index
  const lastQueryIndex = terms
    .map(kwd => textLower.lastIndexOf(kwd.toLowerCase()))
    .filter(v => v > -1)
    .slice(-1)[0];

  // none of the keyword was found?!
  if (!lastQueryIndex)
    return "";

  // get excerpt indices
  let startPosition = lastQueryIndex - 80;
  if (startPosition < 0) startPosition = 0;
  let endPosition = lastQueryIndex + 80;
  if (endPosition > text.length) endPosition = text.length;

  // whether to use elipsis or not
  const head = startPosition == 0 ? "" : "...";
  const tail = endPosition < text.length ? "..." : "";

  // return excerpt
  return head + text.substring(startPosition, endPosition).trim() + tail;
}

// make this function accessible
docUtil.search = searchDocs;

// search query
const q = docUtil.query["q"];

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
    const start = Date.now();
    const result = searchDocs(q);
    const delta = (Date.now() - start) / 1000;

    if (!result.length) {
      msg.innerHTML = "No result found. Try checking your spelling?";
      return;
    }

    // get query terms, used for generating excerpts
    const terms = Array.from(new Set(languageData.split(q)));

    // display to user
    let idx = 0;

    function displayResults() {
      if (idx >= result.length) { return; }
      const item = result[idx++];
      const info = dataIndex[item.identifier];

      // setup display item
      const anchor = document.createElement("a");
      anchor.appendChild(document.createTextNode(info.title));
      anchor.href = info.location + ".html?h=" + encodeURIComponent(docUtil.query["q"]);

      const title = document.createElement("h3");
      title.classList.add("search-item-title");
      title.appendChild(anchor);

      const path = document.createElement("p");
      path.classList.add("search-item-path");
      path.appendChild(document.createTextNode("/" + info.location));

      const description = document.createElement("p");
      description.classList.add("search-item-description");
      description.appendChild(document.createTextNode(info.about));

      const block = document.createElement("div");
      block.classList.add("search-item");
      block.appendChild(title);
      block.appendChild(path);
      block.appendChild(description);

      // add to results
      resultDisplay.appendChild(block);

      // delay next item to avoid lag in UI
      setTimeout(displayResults, 15);

      // deferred summarization
      docUtil.fetchText(info.location + ".html")
        .then(htmlText => {
          // make an excerpt for the article
          const excerpt = makeArticleExcerpt(getArticleTextFromHTML(htmlText), terms);
          if (excerpt.length == 0) return;

          // replace the description with the excerpt
          description.innerText = description.textContent = excerpt;

          // highlight all the occurences of the query terms in the excerpt
          terms.forEach(term => docUtil.highlight(term, description));
        })
        // no-op, the user may see the article's description if xhr fails
        .catch(() => {});
    }

    displayResults();

    msg.innerHTML = "Found " + result.length + " result(s) in " + delta + " seconds!";
  })();
}

});
