const lang = require('./lang.js');
const config = require('../config.js');


/*

type docRef = number;
type docLen = number;
type tokRef = number;
type tokFreq = number;
type docUid = string;   // from dataIndex

type bm25Index = {
  docLengths: { [docRef]: docLen }
  termFreqs: { [tokRef]: Array<[docRef, tokFreq]> }
  avgDocLen: number,
};

type tagsIndex = {
  [tokRef]: docRef[],
};

type index = {
  lastIndexed:    number, // Date.now()
  totalNumOfDocs: number,
  title:     bm25Index,
  about:     bm25Index,
  content:   bm25Index,
  tags:      tagsIndex,
  authors:   tagsIndex,
  term2ref:    { [string]: tokRef },
  ref2doc:     { [docRef]: docUid },
};

*/


/**
 * A custom fast client-based search engine.
 */
class Search {

  /**
   * Make a new Search instance for the given index.
   */
  constructor(index) {
    this.index = index;

    /* state dependent */
    this.query = null;
    this.result = null;
    this._cachedPartials = null;

    this.params = {
      k1: 1.5,
      k2: 100,
      b: 0.75,
      delta: 0,
      partial: 0.005,
    };
  }


  /**
   * Process the query text, compute for query boosts, etc.
   * @param rawQuery The un-processed query text.
   * @returns An object of stemmed query and query boost pairs.
   */
  processQuery(rawQuery) {
    const toks = lang.split(rawQuery);

    /* Count the query term frequencies first. */
    const queryFreqs = Object.create(null);
    for (const tok of toks) {
      if (lang.isStopword(tok))
        continue;
      queryFreqs[tok] =
        queryFreqs[lang.stemmer(tok)] =
          (queryFreqs[tok] ?? 0) + 1;
    }

    /* Compute the query boosts. */
    const result = Object.create(null);
    for (const tok in queryFreqs)
      result[tok] = this.computeQueryBoost(queryFreqs[tok]);

    return result;
  }


  /**
   * Reset the search with a new query.
   * @param query The query string.
   */
  loadQuery(query) {
    this.query = this.processQuery(query);
    this.result = Object.create(null);
    this._cachedPartials = Object.create(null);
  }


  /**
   * Returns all the possible partial match for the query term.
   * @param term The term to get.
   * @returns Array of partial matches.
   */
  getPartialMatches(qterm) {
    if (qterm in this._cachedPartials)
      return this._cachedPartials[qterm];

    const arr = [];
    for (const k in this.index.term2ref)
      if (k != qterm && k.includes(qterm))
        arr.push(k);

    this._cachedPartials[qterm] = arr;
    return arr;
  }


  /**
   * Compute the query boost based on the frequency of the query term.
   * @param qfreq The freq of the query term.
   * @returns The new query value.
   */
  computeQueryBoost(qfreq) {
    return (qfreq + (this.params.k2 + 1)) / (qfreq + this.params.k2);
  }


  /**
   * Compute the inverse document frequency (or IDF) of a particular term.
   * @param numOfDocs Number of docs containing the term in a field index.
   * @returns The computed IDF.
   */
  computeIDF(numOfDocs) {
    return Math.log(
        (this.index.totalNumOfDocs - numOfDocs + 0.5) /
        (numOfDocs + 0.5) + 1);
  }


  /**
   * Compute the TF component of a term on a document.
   * @param docLen The length of the document where the term is from.
   * @param avgDocLen Average length of documents in the index.
   * @returns The term-frequency component.
   */
  computeTF(freqInDoc, docLen, avgDocLen) {
    const normFactor = this.params.k1 * (1 - this.params.b +
        this.params.b * (docLen / avgDocLen));
    return freqInDoc / (freqInDoc + normFactor) * (this.params.k1 + 1);
  }


  /**
   * Perform an Okapi BM25 search on a supported index.
   * @param field The BM25 search field index (title, about, content).
   * @param weight Weight to give for the field.
   */
  queryFieldBM25(field, weight) {
    const indx = this.index[field];
    const self = this;

    function searchTerm(tok, qBoost, isPartial) {
      const query = self.index.term2ref[tok];
      if (!(query in indx.termFreqs))
        return;
      const docsContainingQuery = indx.termFreqs[query];

      /* Compute for some vals. */
      const idf = self.computeIDF(docsContainingQuery.length);
      const otherFactors = idf * qBoost * weight *
          (isPartial ? self.params.partial : 1);

      /* Process each document that contains the term. */
      for (const [ docRef, freqInDoc ] of docsContainingQuery) {
        const normTF = self.computeTF(
            freqInDoc, indx.docLengths[docRef], indx.avgDocLen);
        const docResult = self.result[docRef] || (self.result[docRef] = {});
        docResult.relevance = (docResult.relevance ?? 0) +
          (normTF + self.params.delta) * otherFactors;
      }
    }

    for (const [ tok, qBoost ] of Object.entries(this.query)) {
      const partials = this.getPartialMatches(tok);
      if (!(tok in this.index.term2ref) && partials.length == 0)
        continue;

      /* exact match search */
      if (tok in this.index.term2ref)
        searchTerm(tok, qBoost, false);

      /* partial match search */
      for (const p of partials)
        searchTerm(p, qBoost, true);
    }
  }


  /**
   * Perform a tag search on a supported index. Tag indices are
   * straightforward search indices.
   * @param field The tag ndx search field index (tags, authors).
   * @param weight Weight to be assigned for the field.
   */
  queryFieldTags(field, weight) {
    const indx = this.index[field];
    const self = this;

    function searchTerm(tok, qBoost, isPartial) {
      const query = self.index.term2ref[tok];
      if (!(query in indx))
        return;

      /* Score to add per document. */
      const score = weight * qBoost * (isPartial ? self.params.partial : 1);

      for (const docRef of indx[query]) {
        const docResult = self.result[docRef] || (self.result[docRef] = {});
        docResult.relevance = (docResult.relevance ?? 0) + score;

        /* List the found tags. */
        if (!docResult[field])
          docResult[field] = [];
        if (!docResult[field].includes(tok))
          docResult[field].push(tok);
      }
    }

    for (const [ tok, qBoost ] of Object.entries(this.query)) {
      const partials = this.getPartialMatches(tok);
      if (!(tok in this.index.term2ref) && partials.length == 0)
        continue;

      /* exact match search */
      if (tok in this.index.term2ref)
        searchTerm(tok, qBoost, false);

      /* partial match search */
      for (const p of partials)
        searchTerm(p, qBoost, true);
    }
  }

  /**
   * Perform a search across all the field indices.
   */
  searchAllIndices() {
    this.queryFieldBM25('title',     config.F_TITLE);
    this.queryFieldBM25('about',     config.F_ABOUT);
    this.queryFieldBM25('content',   config.F_CONTENT);
    this.queryFieldTags('tags',      config.F_TAGS);
    this.queryFieldTags('authors',   config.F_AUTHORS);
  }

  /**
   * Do a search in a single call.
   * @param query The (unprocessed) query string.
   * @returns {docId:result} object.
   */
  fastSearch(query) {
    this.loadQuery(query);
    this.searchAllIndices();
    const remappedOut = Object.create(null);
    for (const k in this.result)
      remappedOut[this.index.ref2doc[k]] = this.result[k];
    return remappedOut;
  }
}


exports = module.exports = {
  Search
};
