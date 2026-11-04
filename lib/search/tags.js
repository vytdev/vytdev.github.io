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
   * @param applyIDF Whether to apply IDF in scoring.
   */
  constructor(ndx, applyIDF) {
    this.index = ndx;  /* Record<q, [score, D...]> */
    this.applyIDF = applyIDF;
  }

  /**
   * Search documents that contain the tag.
   * @param q The tag.
   * @returns Record<D, w(q,D)>
   */
  lookup(q) {
    const docs = this.index[q];
    const result = Object.create(null);
    if (!docs)
      return result;

    const score = this.applyIDF ? docs[0] : 1;
    for (let i = 1; i < docs.length; i++) {
      const D = docs[i];
      result[D] = score;
    }

    return result;
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
    this.totalDocs = 0;
    this.tagRecord = Object.create(null); /* Record<tag, Set<D>> */
  }

  /**
   * Adds a document into tag index.
   * @param D The document ID.
   * @param tags Tags.
   */
  add(D, tags) {
    this.totalDocs++;
    for (const tag of tags) {
      const set = this.tagRecord[tag] ??
          (this.tagRecord[tag] = new Set());
      set.add(D);
    }
  }

  /**
   * Removes a document from the staging.
   * @param D The document ID.
   * @param tags Tags. Must be same with what was supplied to .add().
   */
  remove(D, tags) {
    this.totalDocs--;
    for (const tag of tags) {
      const set = this.tagRecord[tag];
      if (!set)
        continue;
      set.delete(D);
      if (set.size <= 0)
        delete this.tagRecord[tag];
    }
  }

  /**
   * Make the final index.
   * @returns Record<tag, [score, ...D]>
   */
  finalize() {
    const index = Object.create(null);
    for (const tag in this.tagRecord) {
      const set = this.tagRecord[tag];
      const idf = computeIDF(this.totalDocs, set.size);
      const tagPart = index[tag] = Array.from(set);
      tagPart.unshift(idf);
    }
    return index;
  }
}
