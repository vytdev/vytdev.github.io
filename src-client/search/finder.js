const lang = require('./lang.js');
const config = require('../config.js');


/**
 * Default BM25 hyperparameter values.
 */
const bm25Defs = {
  k1: 1.5,
  k2: 100,
  b: 0.75,
  delta: 0,
};


/**
 * Fill in default BM25 parameters.
 * @param params The initial param list.
 * @returns The params with defaults set.
 */
function bm25FillDefaults(params) {
  const newParams = Object.create(null);
  for (const k in bm25Defs)
    newParams[k] = typeof params[k] != 'number'
      ? params[k]
      : bm25Defs[k];
  return newParams;
}


/**
 * Compute for the length normalization factors for
 * each document in the BM25 index 'indx'.
 * @param indx The BM25 index to process.
 * @param [p] BM25 parameters. (k1, b)
 * @returns A {docRef:normFactor} pairs for index 'indx'.
 */
function bm25NormFactors(indx, p = bm25Defs) {
  const result = Object.create(null);
  for (const [ docRef, docLen ] of Object.entries(indx.docLengths))
    result[docRef] = p.k1 * (1 - p.b + p.b * (docLen / indx.avgDocLen));
  return result;
}


/**
 * Compute the BM25 scores for term 'query'.
 * @param query The query term index.
 * @param indx The BM25 index where to search.
 * @param out A {docRef:score} pairs.
 * @param fieldW Weight to give for the field.
 * @param normFactors Doc length normalization factors.
 * @param [qBoost] Term query boost.
 * @param [p] BM25 parameters. (k1, delta)
 */
function bm25QueryTerm(query, indx, out, fieldW, normFactors,
                       qBoost = 1, p = bm25Defs)
{
  if (!(query in indx.termFreqs))
    return;

  const result = Object.create(null);
  const docsContainingQuery = indx.termFreqs[query];

  /* Compute for the term's idf. */
  const idf = Math.log(
    (searchIndex.totalNumOfDocs - docsContainingQuery.length + 0.5) /
    (docsContainingQuery.length + 0.5) + 1);
  const otherFactors = idf * qBoost * fieldW;

  /* Process each document that contains the term. */
  for (const [ docRef, freqInDoc ] of docsContainingQuery) {

    /* Compute for the normalized term freq component of the document. */
    const normTF = freqInDoc / (freqInDoc + normFactors[docRef]) * (p.k1 + 1);

    /* BM25 score of the doc for term 'query'. */
    out[docRef] = (out[docRef] ?? 0) + (normTF + p.delta) * otherFactors;
  }

}


/**
 * Perform a search for 'queries' on 'indx'.
 * @param queries An object containing query terms
 * and query boosts.
 * @param term2ref The term-to-ref mapping.
 * @param out Where to output the scores.
 * @param indx The BM25 search index.
 * @param fieldW Weight to give for the field.
 * @param [p] BM25 parameters.
 */
function bm25QueryOnField(queries, term2ref, out, indx, fieldW, p = bm25Defs) {
  const normFactors = bm25NormFactors(indx, p);
  for (const [ tok, qBoost ] of Object.entries(queries)) {
    if (!(tok in term2ref))
      continue;
    bm25QueryTerm(term2ref[tok], indx, out, fieldW, normFactors, qBoost, p);
  }
}


/**
 * Perform a tag index scoring for the documents
 * that contains the tag 'query'.
 * @param query The query tag.
 * @param indx The tag index where to search.
 * @param out Where to output the scores.
 * @param fieldW Weight to give for the field.
 * @param [qBoost] Term query boost.
 */
function tagNdxQueryTerm(query, indx, out, fieldW, qBoost = 1) {
  if (!(query in indx))
    return;
  const score = fieldW * qBoost;
  for (const docRef in indx[query])
    out[docRef] = (out[docRef] ?? 0) + score;
}


/**
 * Perform a tag index search on 'indx'.
 * @param queries An object containing query terms
 * and query boosts.
 * @param term2ref The term-to-ref mapping.
 * @param out Where to output the scores.
 * @param indx The tag search index.
 * @param fieldW Weight to give for the field.
 */
function tagNdxQueryOnField(queries, term2ref, out, indx, fieldW) {
  for (const [ tok, qBoost ] of Object.entries(queries)) {
    if (!(tok in term2ref))
      continue;
    tagNdxQueryTerm(term2ref[tok], indx, out, fieldW, qBoost);
  }
}


/**
 * Process the query text, compute for query boosts, etc.
 * @param rawQuery The un-processed query text.
 * @param k2 The term frequency saturation parameter.
 * @returns An object of stemmed query and query boost pairs.
 */
function processQuery(rawQuery, k2) {
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
    result[tok] = (queryFreqs[tok] * (k2 + 1)) / (queryFreqs[tok] + k2);

  return result;
}


/**
 * Perform a raw search across all the field index.
 * @param query The (un-processed) query string.
 * @returns A {docId:score} mapped object.
 */
function performSearch(query) {
  const q = processQuery(query, bm25Defs.k2);
  const out = Object.create(null);

  /* Perform the search for different fields. */
  bm25QueryOnField     (q, searchIndex.term2ref, out,
                        searchIndex.title,   config.F_TITLE);
  bm25QueryOnField     (q, searchIndex.term2ref, out,
                        searchIndex.about,   config.F_ABOUT);
  bm25QueryOnField     (q, searchIndex.term2ref, out,
                        searchIndex.content, config.F_CONTENT);
  tagNdxQueryOnField   (q, searchIndex.term2ref, out,
                        searchIndex.tags,    config.F_TAGS);
  tagNdxQueryOnField   (q, searchIndex.term2ref, out,
                        searchIndex.authors, config.F_AUTHORS);

  /* We need a doc uid, not an index reference. */
  const remappedOut = Object.create(null);
  for (const k in out)
    remappedOut[searchIndex.ref2doc[k]] = out[k];

  return remappedOut;
}


module.exports = {
  bm25Defs,
  bm25FillDefaults,
  bm25NormFactors,
  bm25QueryTerm,
  bm25QueryOnField,
  tagNdxQueryTerm,
  tagNdxQueryOnField,
  processQuery,
  performSearch,
};
