import * as nlp from './nlp.js';

let stageRecord = {};


/**
 * Reset the entire indexing record.
 */
export function resetRecord() {
  stageRecord = {};
}


/**
 * Get the current record.
 * @returns The current indexing record.
 */
export function getRecord() {
  return stageRecord;
}


/**
 * Update the indexing record of a document.
 * @parm docID The identifier of the document.
 * @param pageInfo The page info of the document.
 * @param rawContent The raw markdown content (front-matter stripped).
 */
export function updateDoc(docID, pageInfo, rawContent) {
  stageRecord[docID] = {
    pageInfo,
    title:     nlp.preprocess(pageInfo.title),
    about:     nlp.preprocess(pageInfo.about),
    content:   nlp.preprocess(rawContent),
    tags:      pageInfo.tags,
    authors:   pageInfo.authors,
  };
}


/**
 * Remove a document from the indexing record.
 * @param docID The document identifier.
 */
export function removeDoc(docID) {
  delete stageRecord[docID];
}


/**
 * Make search index.
 * @returns The generated search index.
 */
export function makeSearchIndex() {
  let totalNumOfDocs = 0;

  /* Reference to hash. */
  const ref2doc = [];
  for (const k in stageRecord)
    ref2doc[totalNumOfDocs++] = k;

  /* Strings are expensive. Let us use integers. */
  const term2ref = {};
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
    const termFreqs = {};
    let totalDocLen = 0;

    for (let i = 0; i < totalNumOfDocs; i++) {
      const tokens = stageRecord[ref2doc[i]][fieldName];
      const tokFreqOnDoc = {};

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

    return [
      totalDocLen / totalNumOfDocs,  /* avg doc len */
      docLengths,
      termFreqs,
    ];
  }

  /**
   * Process tags (non-repeating terms per document).
   * @param fieldName The name of tag field to process.
   * @returns An index of tags.
   */
  function processTagsIndex(fieldName) {
    const index = {};

    for (let i = 0; i < totalNumOfDocs; i++) {
      const tags = stageRecord[ref2doc[i]][fieldName];

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
    ref2doc,
    term2ref,
    title:    processBM25Index('title'),
    about:    processBM25Index('about'),
    content:  processBM25Index('content'),
    tags:     processTagsIndex('tags'),
    authors:  processTagsIndex('authors'),
  };
}


/**
 * Page info index.
 * @returns Page info index.
 */
export function makeInfoIndex() {
  const idx = {};
  for (const k in stageRecord)
    idx[k] = stageRecord[k].pageInfo;
  return idx;
}
