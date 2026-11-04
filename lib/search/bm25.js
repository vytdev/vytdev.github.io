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
 *  w(q,D)                precomputed idf * normTF factors
 *
 *    k1                  tf saturation stuff (free)     ~[1.2, 2.0]
 *    b                   doc len normalization (free)    [0, 1]
 */


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
    this.index = ndx; /* Record<q, Record<D, w(q,D)>> */
  }

  /**
   * Search docs containing the term q.
   * @param q The query (term ID).
   * @returns Record<D, w(q,D)>
   */
  lookup(q) {
    return this.index[q] ?? Object.create(null);
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
    this.tfRecord = Object.create(null); /* Record<t, {nq:num, [D]:num}> */
    this.Dlens = Object.create(null);    /* Record<D, |D|> */
    this.totalTerms = 0;
    this.N = 0;
  }

  /**
   * Add a document into index tracking.
   * @param D The document ID.
   * @param TFs The document's tokens in TF set.
   */
  add(D, TFs) {
    if (D in this.Dlens)
      throw new Error('Double-adding ' + D);
    this.N++;
    let Dlen = 0;
    for (const t in TFs) {
      const tf = TFs[t];
      const docFreqs = this.tfRecord[t] ?? (this.tfRecord[t] = {nq:0});
      docFreqs[D] = tf;
      docFreqs.nq++;
      Dlen += tf;
      this.totalTerms += tf;
    }
    this.Dlens[D] = Dlen;
  }

  /**
   * Remove a document from index tracking.
   * @param D The document ID.
   * @param TFs The document's tokens in TF set. Must be the same as
   * the what is suppled to .add().
   */
  remove(D, TFs) {
    if (!(D in this.Dlens))
      return;
    this.N--;
    for (const t in TFs) {
      const docFreqs = this.tfRecord[t];
      if (!docFreqs || !docFreqs[D])
        continue;
      delete docFreqs[D];
      docFreqs.nq--;
      this.totalTerms -= TFs[t];
      if (docFreqs.nq <= 0)
        delete this.tfRecord[t];
    }
    delete this.Dlens[D];
  }

  /**
   * Generate the complete precomputed index.
   * @param [k1] Saturatiom control parameter.
   * @param [b] Length normalization parameter.
   * @returns Record<q, Record<D, w(q,D)>>
   */
  finalize(k1=1.2, b=0.75) {
    if (this.N === 0)
      return Object.create(null);
    const avgdl = this.totalTerms / this.N;
    const index = Object.create(null);

    for (const q in this.tfRecord) {
      const docFreqs = this.tfRecord[q];
      const termPart = Object.create(null);
      const idf = computeIDF(this.N, docFreqs.nq);

      for (const D in docFreqs) {
        if (D === 'nq')
          continue;
        const tf = docFreqs[D];
        const Dlen = this.Dlens[D];
        const normTF = computeNormTF(
            tf, Dlen, k1, b, avgdl);
        termPart[D] = normTF * idf;      /* w(q,D) */
      }

      index[q] = termPart;
    }

    return index;
  }
}
