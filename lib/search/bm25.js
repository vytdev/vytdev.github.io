/*
 * Okapi BM25.
 *
 *
 * w(q,D) = IDF(q) * normTF
 * normTF = (f(q,D) * (k1 + 1)) /
 *          (f(q,D) + k1*(1-b + b * |D| / avgdl))
 * IDF(q) = ln( (N - n(q) + 0.5) /
 *              (n(q) + 0.5)  + 1)
 *
 *
 *  SYMBOL     CODEID     DESCRIPTION
 *  ------     ------     -----------
 *
 *    C                   the corpus
 *    D                   document ID (D ∈ C)
 *    q                   a term (q ∈ D)
 *
 *    N                   total number of docs
 *  n(q)         nq       number of docs containing term q
 *
 *   avgdl                average document length
 *   |D|        Dlen      document length
 *  f(q,D)       tf       freq of term q in document D 
 *
 *   IDF(q)      idf      inverse doc freq of term q
 *              normTF    normalized term freq factor
 *
 *  w(q,D)       wqD      precomputed idf * normTF factors
 *
 *    k1                  tf saturation stuff (free)     ~[1.2, 2.0]
 *    b                   doc len normalization (free)    [0, 1]
 *
 *
 *
 * Pseudo type definitions for the index.
 * --------------------------------------
 *
 * type docID = uint32;
 * type term = uint32;
 *
 * type BM25Index = {
 *   k1:        float,
 *   b:         float,
 *
 *   N:         uint32,                 // total no. of docs
 *   avgdl:     float,                  // avg doc length
 *   Dlens:     Map<docID, uint32>,     // Map<D, |D|>
 *   t_num:     uint32,                 // total no. of terms
 *   t_uniq:    uint32,                 // no. of unique terms
 *
 *   tfs?:      Map<term, Map<docID, float>>,
 *   // Map<q, Map<D, f(q,D)>>, (.size = n(q))
 *
 *   weights?:  Map<term, Map<docID, float>>,
 *   // Map<q, Map<D, w(q,D)>>,
 * };
 */



/**
 * Calculate inverse document frequency.
 * @param N
 * @param nq   n(q)
 * @returns IDF(q)
 */
export function computeIDF(N, nq) {
  return Math.log((N - nq + 0.5) / (nq + 0.5) + 1);
}


/**
 * Calculate normalized term frequency.
 * @param tf       f(q,D)
 * @param Dlen     |D|
 * @param k1
 * @param b
 * @param avgdl
 * @returns normTF
 */
export function computeNormTF(tf, Dlen, k1, b, avgdl) {
  return (tf * (k1 + 1)) /
      (tf + k1 * (1 - b + b * Dlen / avgdl));
}


/**
 * @class
 * BM25 Field Indexer.
 */
export class BM25Indexer {
  constructor() {
    this.corpus = new Map(); /* Map<D, token[]> */
    this.terms = new Map();  /* Map<q, Map<D, f(q,D)>> */
    this.totalWords = 0;
  }


  /**
   * Adds a document for tracking.
   * @param D The document.
   * @param tokens The raw token list.
   */
  add(D, tokens) {
    if (this.corpus.has(D))
      this.totalWords -= this.corpus.get(D).length;
    this.corpus.set(D, tokens);
    this.totalWords += tokens.length;
    for (const q in tokens) {
      if (!this.terms.has(q))
        this.terms.set(q, new Map());
      const termMap = this.terms.get(q);
      termMap.set(D, (termMap.get(D) ?? 0) + 1);
    }
  }


  /**
   * Remove a document from tracking.
   * @param D The document.
   */
  remove(D) {
    if (!this.corpus.has(D))
      return;
    this.totalWords -= this.corpus.get(D).length;
    this.corpus.delete(D);
    for (const [term, termMap] of this.terms.entries())
      if (termMap.has(id))
        termMap.delete(D);
  }


  /**
   * Generate the index.
   * @param [k1]
   * @param [b]
   * @returns The index.
   */
  makeIndex(k1=1.2, b=0.75) {
    const N = this.corpus.size;
    const avgdl = this.totalWords / N;
    /* Map<D, |D|> */
    const Dlens = new Map();

    for (const [D, tokens] of this.corpus.entries())
      Dlens.set(D, tokens.length);

    const index = {
      k1, b,
      N, avgdl, Dlens,
      t_num: this.totalWords,
      t_uniq: this.terms.size,
      tfs: this.terms,        /* Map<q, Map<D, f(q,D)>> */
    };

    return index;
  }


  /**
   * Precompute the entire index.
   * @param [k1]
   * @param [b]
   * @returns The index, with weights.
   */
  makePrecomputedIndex(k1=1.2, b=0.75) {
    const index = this.makeIndex(k1, b);
    const N = index.N;                                /* N */
    const avgdl = index.avgdl;                        /* avgdl */
    const Dlens = index.Dlens;

    /* process a term */
    const processTerm = (termMap) => {
      const idf = computeIDF(N, termMap.size);        /* IDF(q) */
      /* Map<D, w(q, D)> */    /* ^^^ n(q) */
      const weightsPerDoc = new Map();

      for (const [D, tf] of termMap.entries()) {      /* tf = f(q, D) */
        const Dlen = Dlens.get(D);                    /* |D| */
        const normTF = computeNormTF(tf, Dlen,        /* normTF */
            k1, b, avgdl);
        const wqD = normTF * idf;                     /* w(q, D) */
        weightsPerDoc.set(D, wqD);
      }

      return weightsPerDoc;
    }

    /* Map<q, Map<D, w(q, D)>> */
    const weights = new Map();
    for (const [q, termMap] of index.tfs.entries())
      weights.set(q, processTerm(termMap));

    index.weights = weights;
    return index;
  }
}
