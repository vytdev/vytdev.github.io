import { computeIDF } from './bm25.js';


/**
 * @class
 * Tag searching.
 */
export class TagSearch {

  /**
   * @constructor
   * Make a new TagSearch class.
   * @param ndx The index.
   */
  constructor(ndx) {
    this.index = ndx;  /* Record<q, [idf, D[]]> */
  }

  /**
   * Search documents that contain the tag.
   * @param q The tag.
   * @returns TagSingleLookupResult
   */
  lookup(q) {
    const rawInfo = this.index[q];
    return new TagSingleLookupResult(q, rawInfo);
  }
}


/**
 * @class
 * A single tag lookup result.
 */
export class TagSingleLookupResult {

  /**
   * @constructor
   * @param q The tag.
   * @param rawInfo What's on the index.
   */
  constructor(q, rawInfo) {
    this.tag = q;
    this.idf = rawInfo?.[0] || 0;
    this.docIDs = rawInfo?.[1] || [];
  }

  /**
   * The number of docs found.
   */
  get resultCount() {
    return this.docIDs.length;
  }

  /**
   * Make this iterable.
   */
  *[Symbol.iterator]() {
    for (const D of this.docIDs)
      yield [D, this.idf];
  }
}


/**
 * @class
 * Stage before making the final tag index.
 */
export class TagStageIndex {

  /**
   * @constructor
   * Make a new TagStageIndex.
   */
  constructor() {
    this.storedDocs = new Set();   /* Set<D> */
    this.tagRecord = new Map();    /* Map<tag, Set<D>> */
  }

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
   * Make the final index.
   * @returns Record<tag, [idf, D[]]>
   */
  finalize() {
    const N = this.storedDocs.size;
    const index = Object.create(null);
    for (const [tag, set] of this.tagRecord.entries()) {
      let idf = computeIDF(N, set.size);
      idf = Math.round(idf * 1000) / 1000;     /* reduce to 3 decimals */
      index[tag] = [idf, Array.from(set)];
    }
    return index;
  }
}
