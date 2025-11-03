const nlp = require('../src-client/search/lang.js');


/**
 * Docs that are recorded and staged, ready for indexing.
 */
let stagedDocs;
initIndexer(); /* Already initialized once loaded. */


/**
 * Get the current staged docs record.
 * @returns The staged docs record.
 */
function getStagedDocs() {
  return stagedDocs;
}


/**
 * Initialize the indexer.
 */
function initIndexer() {
  stagedDocs = Object.create(null);
}


/**
 * Set a record for later indexing.
 * @param id The document hash id.
 * @param doc The document ctx.
 * @param cont The raw markdown content (without metadata).
 */
function setRecord(id, doc, cont) {
  stagedDocs[id] = {
    pageInfo:  doc,
    /* For indexing. */
    title:    nlp.processText(doc.title),
    about:    nlp.processText(doc.about),
    content:  nlp.processText(cont),
    authors:  doc.authors,
    tags:     doc.tags,
  };
}


/**
 * Remove a doc from the record.
 * @param id The document id.
 */
function rmRecord(id) {
  if (id in stagedDocs) {
    delete stagedDocs[id];
  }
}


/**
 * Create the search index.
 * @returns The generated search index.
 */
function createSearchIndex() {
  let totalNumOfDocs = 0;

  /* Reference to hash. */
  const ref2doc = [];
  for (const k in stagedDocs)
    ref2doc[totalNumOfDocs++] = k;

  /* Strings are expensive. Let us use integers. */
  const term2ref = Object.create(null);
  let termIdx = 0;
  function getTermRef(term) {
    if (!(term in term2ref))
      term2ref[term] = termIdx++;
    return term2ref[term];
  }

  /**
   * Process BM25 index for the given field name.
   * @param fieldName The name of the field to process.
   * @returns The resulting field index.
   */
  function processBM25Index(fieldName) {
    const docLengths = [];
    const termFreqs = Object.create(null);
    let totalDocLen = 0;

    for (let i = 0; i < totalNumOfDocs; i++) {
      const tokens = stagedDocs[ref2doc[i]][fieldName];
      const tokFreqOnDoc = Object.create(null);

      /* Update each term to the field index. */
      for (const tok of tokens) {
        const ref = getTermRef(tok);
        let freqs = tokFreqOnDoc[ref];

        /* Create a new term entry if tok is a new. */
        if (!freqs) {
          freqs = tokFreqOnDoc[ref] = [ i, 0 ];
          if (!termFreqs[ref])
            termFreqs[ref] = [];
          termFreqs[ref].push(freqs);
        }

        freqs[1]++;
        totalDocLen++;
      }

      /* Set the doc length. */
      docLengths[i] = tokens.length;
    }

    return {
      docLengths,
      termFreqs,
      avgDocLen: totalDocLen / totalNumOfDocs,
    };
  }

  /**
   * Process tags (non-repeating terms per document).
   * @param fieldName The name of tag field to process.
   * @returns An index of tags.
   */
  function processTagsIndex(fieldName) {
    const index = Object.create(null);

    for (let i = 0; i < totalNumOfDocs; i++) {
      const tags = stagedDocs[ref2doc[i]][fieldName];

      /* For each tag, store an array of documents
         that contains that tag. */
      for (let tok of tags) {
        tok = nlp.normalize(tok);
        const ref = getTermRef(tok);
        if (!index[ref])
          index[ref] = [];
        index[ref].push(i);
      }
    }

    return index;
  }


  return {
    lastIndexed: Date.now(),
    totalNumOfDocs,
    title:    processBM25Index('title'),
    about:    processBM25Index('about'),
    content:  processBM25Index('content'),
    tags:     processTagsIndex('tags'),
    authors:  processTagsIndex('authors'),
    term2ref,
    ref2doc,
  };
}


/**
 * Create the link index.
 * @returns The generated link index.
 */
function createLinkIndex() {
  const indx = Object.create(null);
  for (const k in stagedDocs)
    indx[k] = stagedDocs[k].pageInfo.path;
  return indx;
}


/**
 * Create the page data index.
 * @returns The generated page data index.
 */
function createPageDataIndex() {
  const indx = Object.create(null);
  for (const k in stagedDocs)
    indx[k] = stagedDocs[k].pageInfo;
  return indx;
}


module.exports = {
  getStagedDocs,
  initIndexer,
  setRecord,
  rmRecord,
  createSearchIndex,
  createLinkIndex,
  createPageDataIndex,
};
