/*
 * type SearchIndex = {
 *   lastIndexing: number,
 *   numOfDocs: number,
 *   id2docRef: Record<D, docRef>,
 *   term2ref: Record<term, ID>,
 *   fields: Record<fieldName, [type, invertedIndex]>,
 * };
 */

import { BM25TermResult, BM25StageIndex } from './bm25.js';
import { TagTermResult, TagStageIndex } from './tags.js';


/**
 * Used to identify which handler for a field to use.
 */
export const fieldHandlers = {
  'bm25': { TermResult: BM25TermResult, StageIndex: BM25StageIndex },
  'tag':  { TermResult: TagTermResult,  StageIndex: TagStageIndex  },
};


/**
 * @class
 * Main searching interface.
 */
export class SearchIndex {

  /**
   * @constructor
   * @param index The search index.
   */
  constructor(index) {
    this.lastIndexing = index.lastIndexing;
    this.numOfDocs = index.numOfDocs;
    this.id2docRef = index.id2docRef; /* internal */
    this.term2ref = index.term2ref;   /* internal */
    this.fields = index.fields;
  }

  /**
   * Looks up a certain field.
   * @param fieldName The name of the field.
   * @param qTerm The term to lookup.
   * @returns The search result.
   */
  lookupField(fieldName, qTerm) {
    const field = this.fields[fieldName];
    if (!field)
      throw new Error('No such field: ' + fieldName);
    const fieldType = field[0];
    const invertedIndex = field[1];

    const resultHandler = fieldHandlers[fieldType]?.TermResult;
    if (!resultHandler)
      throw new Error('Unrecognized field type: ' + fieldType);

    const q = this.term2ref[qTerm];
    return new resultHandler(this, qTerm, invertedIndex[q]);
  }

  /**
   * Returns a list of all the field names available.
   * @returns The field anmes.
   */
  getFieldNames() {
    return Object.keys(this.fields);
  }
}


/**
 * @class
 * Search index staging class. Manages stuff before making the final
 * index.
 */
export class SearchStageIndex {

  /**
   * @constructor
   */
  constructor() {
    this.docRef2ID = new Map();     /* Map<docRef, D> */
    this._docIDNdx = 0;
    this.term2ref = Object.create(null);
    this._termRefNdx = 0;
    this.fields = {};
  }

  /**
   * Adds a field onto the stage index.
   * @param fieldName Name of the field.
   * @param type Type of the field's index.
   */
  addField(fieldName, type) {
    if (!(type in fieldHandlers))
      throw new Error('Unrecognized field type: ' + type);
    this.fields[fieldName] = new fieldHandlers[type].StageIndex(this);
  }

  /**
   * Removes a field.
   * @param fieldName The name of the field to remove.
   */
  removeField(fieldName) {
    delete this.fields[fieldName];
  }

  /**
   * Gets the field staging class.
   * @param fieldName The name of the field.
   * @returns The stage index instance.
   */
  getField(fieldName) {
    return this.fields[fieldName];
  }

  /**
   * Get a term reference for a unique term.
   * @param term The term.
   * @returns Numerical term reference.
   */
  _getTermRef(term) {
    if (!(term in this.term2ref))
      this.term2ref[term] = this._termRefNdx++;
    return this.term2ref[term];
  }

  /**
   * Remove a document from the stage index.
   * @param docRef The reference to the document to remove.
   */
  removeDoc(docRef) {
    if (!this.docRef2ID.has(docRef))
      return;
    const D = this.docRef2ID.get(docRef);
    for (const fieldName in this.fields) {
      const stage = this.fields[fieldName];
      stage.remove(D);
    }
    this.docRef2ID.delete(docRef);
  }

  /**
   * Adds contents of a doc to a specific field.
   * @param docRef The reference to the document.
   * @param fieldName The name of the field where to stage the doc.
   * @param terms The terms to index.
   */
  updateDocField(docRef, fieldName, terms) {
    const stage = this.fields[fieldName];
    if (!stage)
      throw new Error('Unknown field: ' + fieldName);
    /* get doc ID */
    if (!this.docRef2ID.has(docRef))
      this.docRef2ID.set(docRef, this._docIDNdx++);
    const D = this.docRef2ID.get(docRef);
    /* add to stage */
    stage.add(D, terms.map(t => this._getTermRef(t)));
  }

  /**
   * Finalize the index.
   * @returns The index object.
   */
  finalize() {
    const id2docRef = Object.create(null);
    for (const [docRef, D] of this.docRef2ID.entries())
      id2docRef[D] = docRef;

    const fields = {};
    for (const [fieldName, stage] of Object.entries(this.fields))
      fields[fieldName] = [stage.type, stage.makeInvertedIndex()];

    const index = {
      lastIndexing: Date.now(),
      numOfDocs: this.docRef2ID.size,
      id2docRef: id2docRef,
      term2ref: this.term2ref,
      fields: fields,
    };

    return index;
  }
}
