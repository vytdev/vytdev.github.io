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
 */


// index:  Record<q, [D[], wqD[]]


/**
 * @class
 * Search engine.
 */
export class BM25Search {

  /**
   * @constructor
   * Make a new BM25Search class.
   * @param ndx The index.
   */
  constructor(ndx) {
    this.index = ndx; /* Record<q, [D[], Array<w(q,D)>]> */
  }

  /**
   * Search docs containing the term q.
   * @param q The query (term ID).
   * @returns [D[], Array<w(q,D)>]
   */
  lookup(q) {
    const rawInfo = this.index[q];
    return new BM25SingleLookupResult(q, rawInfo);
  }
}


/**
 * @class
 * A single BM25 search result.
 */
export class BM25SingleLookupResult {

  /**
   * @constructor
   * @param q The term.
   * @param rawInfo Raw index data.
   */
  constructor(q, rawInfo) {
    this.term = q;
    this.docIDs = rawInfo?.[0] || [];
    this.weights = rawInfo?.[1] || [];
  }

  /**
   * Numbrr of docs found.
   */
  get resultCount() {
    return this.docIDs.length;
  }

  /**
   * Make this iterable.
   */
  *[Symbol.iterator]() {
    for (let i = 0; i < this.docIDs.length; i++)
      yield [this.docIDs[i], this.weights[i]];
  }
}


/**
 * Calculate inverse document frequency.
 * @param N Total number of docs.
 * @param nq Number of docs containing q.
 * @returns The IDF.
 */
export function computeIDF(N, nq) {
  return Math.log((N - nq + 0.5) / (nq + 0.5) + 1);
}


/**
 * Calculate the normalized term frequency.
 * @param tf The term frequency of term q.
 * @param Dlen The length of the current document.
 * @param k1 Saturation control parameter.
 * @param b Doc length normalization parameter.
 * @param avgdl The average document length.
 * @returns Normalized saturated term frequency.
 */
export function computeNormTF(tf, Dlen, k1, b, avgdl) {
  if (avgdl === 0)
    return 0;
  return (tf * (k1 + 1)) /
      (tf + k1 * (1 - b + b * Dlen / avgdl));
}


/**
 * @class
 * Manages documents before making the final index.
 */
export class BM25StageIndex {

  /**
   * @constructor
   * Make a new BM25StageIndex.
   */
  constructor() {
    this.tfRecord = new Map();      /* Map<t, Map<D, tf>> */
    this.Dlens = new Map();         /* Map<D, |D|> */
    this.totalTerms = 0;
  }

  /**
   * Add a document into index tracking.
   * @param D The document ID.
   * @param TFs The document's tokens in TF set.
   */
  add(D, TFs) {
    if (this.Dlens.has(D))
      throw new Error('Double-adding ' + D);
    let Dlen = 0;

    for (const t in TFs) {
      const tf = TFs[t];
      Dlen += tf;
      this.totalTerms += tf;
      if (!this.tfRecord.has(t))
        this.tfRecord.set(t, new Map());
      this.tfRecord.get(t).set(D, tf);
    }

    this.Dlens.set(D, Dlen);
  }

  /**
   * Remove a document from index tracking.
   * @param D The document ID.
   */
  remove(D) {
    if (!this.Dlens.has(D))
      return;
    this.Dlens.delete(D);

    for (const [t, docFreqs] of this.tfRecord.entries()) {
      if (!docFreqs.has(D))
        continue;
      const tf = docFreqs.get(D);
      this.totalTerms -= tf;
      docFreqs.delete(D);
      if (docFreqs.size <= 0)
        this.tfRecord.delete(t);
    }
  }

  /**
   * Generate the complete precomputed index.
   * @param [k1] Saturatiom control parameter.
   * @param [b] Length normalization parameter.
   * @returns Record<q, [D[], Array<w(q,D)>]>
   */
  finalize(k1=1.2, b=0.75) {
    const N = this.Dlens.size;
    if (N === 0)
      return Object.create(null);
    const avgdl = this.totalTerms / N;
    const index = Object.create(null);

    for (const [t, docFreqs] of this.tfRecord.entries()) {
      const termPart  = index[t]    = [];
      const docIDs    = termPart[0] = [];
      const weights   = termPart[1] = [];
      let i = 0;

      const idf = computeIDF(N, docFreqs.size);

      for (const [D, tf] of docFreqs.entries()) {
        const Dlen = this.Dlens.get(D);
        const normTF = computeNormTF(tf, Dlen, k1, b, avgdl);
        let wqD = normTF * idf;

        /* max last 3 decimals */
        wqD = Math.round(wqD * 1000) / 1000;

        docIDs[i]  = D;
        weights[i] = wqD;      /* w(q,D) */
        i++;
      }
    }

    return index;
  }
}
