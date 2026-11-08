import { computeIDF } from './bm25.js';


/**
 * @class
 * Class for managing tag fields. Tag fields are a field of unique
 * terms occuring in any number to any document.
 */
export class TagIndex {

  /**
   * @constructor
   */
  constructor() {
    this.storedDocs = new Set();   /* Set<D> */
    this.tagRecord = new Map();    /* Map<tag, Set<D>> */
  }

  /**
   * @constant
   * The type of this index.
   */
  type = 'tag';

  /**
   * Adds a document into tag index.
   * @param D The document ID.
   * @param tags Tags.
   */
  add(D, tags) {
    if (this.storedDocs.has(D))
      throw new Error('Double-adding ' + D);
    this.storedDocs.add(D);
    for (const tag of tags) {
      if (!this.tagRecord.has(tag))
        this.tagRecord.set(tag, new Set());
      this.tagRecord.get(tag).add(D);
    }
  }

  /**
   * Removes a document from the staging.
   * @param D The document ID.
   */
  remove(D) {
    if (!this.storedDocs.has(D))
      return;
    this.storedDocs.delete(D);
    for (const [tag, set] of this.tagRecord.entries()) {
      set.delete(D);
      if (set.size <= 0)
        this.tagRecord.delete(tag);
    }
  }

  /**
   * Make the search-ready inverted index.
   * @returns Record<tag, [idf, D[]]>
   */
  makeInvertedIndex() {
    const N = this.storedDocs.size;
    const index = Object.create(null);
    for (const [tag, set] of this.tagRecord.entries()) {
      let idf = computeIDF(N, set.size);
      idf = Math.round(idf * 1000) / 1000;     /* reduce to 3 decimals */
      index[tag] = [idf, Array.from(set)];
    }
    return index;
  }

  /**
   * @generator
   * Iterates through the docs of a tag inverted index lookup result.
   * @param invValue The value from the inverted index.
   * @yields [D, w(q,D)]
   */
  static *iterateInvResult(invValue) {
    const idf = invValue[0];
    for (const D of invValue[1])
      yield [D, idf];
  }
}
