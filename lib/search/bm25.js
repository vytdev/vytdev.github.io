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
 * @class
 * Search engine.
 */
export class BM25Search {
  constructor(ndx) {
    this.index = ndx; /* Record<q, Record<D, w(q,D)>> */
  }

  /**
   * Search docs containing the term q.
   * @param q The query (term ID).
   * @returns Record<D, w(q,D)>
   */
  searchTerm(q) {
    return this.index[q];
  }

  /**
   * Search docs containing all terms in Q.
   * @param Q The query set.
   * @returns Record<D, w(Q,D)>
   */
  search(Q) {
    const docs = Object.create(null);
    for (const q in Q) {
      const qFactor = Q[q];
      const docs_q = this.searchTerm(q);
      for (const D in docs_q)
        docs[D] = (docs[D] ?? 0) + docs_q[D] * qFactor;
    }
    return docs
  }
}



/**
 * Function to convert an array of tokens (term IDs) into
 * a map listing the frequency of unique terms.
 * @param T The array of tokens (term IDs).
 * @returns Record<t, f(t)>
 */
export function countFrequency(T) {
  const TFs = Object.create(null);
  for (const t of T)
    TFs[t] = (TFs[t] ?? 0) + 1;
  return TFs;
}



/**
 * Calculate query boost by term frequency.
 */
export function computeQueryBoost(tf) {
  return tf;
  // or do some math? this scales the term linearly
}


/**
 * Make a query set.
 * @param TFs The queries in term frequency map.
 * @returns Record<q, qFactor>
 */
export function makeQuerySet(TFs) {
  const Q = Object.create(null);
  for (const q in TFs)
    Q[q] = computeQueryBoost(TFs[q]);
  return Q
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
  return (tf * (k1 + 1)) /
      (tf + k1 * (1 - b + b * Dlen / avgdl));
}


/**
 * @class
 * Manages documents before making the final index.
 */
export class BM25StageIndex {
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
   * @param TFs The document's tokens in TF set.
   */
  remove(D, TFs) {
    this.N--;
    for (const t in TFs)
      if (this.tfRecord[t]) {
        delete this.tfRecord[t][D];
        this.tfRecord[t].nq--;
        this.totalTerms -= TFs[t];
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
        termPart[D] = normTF * idf;
      }

      index[q] = termPart;
    }

    return index;
  }
}
