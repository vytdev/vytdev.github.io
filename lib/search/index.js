import { SearchIndex } from './indices/index.js';

export * from './query.js';
export * from './indices/bm25.js';
export * from './indices/tags.js';
export * from './indices/index.js';


/**
 * @class
 * Manage client search queries.
 */
export class Search {

  /**
   * @constructor
   * @param index The index object to work through.
   */
  constructor(index) {
    this.index = new SearchIndex(index);
    this.fieldWeights = {};
    this._fieldNames = new Set(index.getFieldNames()); /* cache */
  }

  /**
   * Assigns a weight to the given field. The default weight is 1.
   * @param fieldName The name of the field.
   * @param fieldWeight Weight to assign to the field.
   */
  setFieldWeight(fieldName, fieldWeight) {
    if (!this._fieldNames.has(fieldName))
      throw new Error('Field not in the index: ' + fieldName);
    this.fieldWeights[fieldName] = fieldWeight;
  }

  /**
   * @generator
   * Enumerates all matches of term across the given fields,
   * with field weights already applied.
   * @param qTerm The relevant term.
   * @param [fields] Which fields to search.
   * @yields [docRef, W(term,docRef)]
   */
  *enumMatches(qTerm, fields) {
    let targetFields = fields?.filter(v => this._fieldNames.has(v));
    if (!targetFields || targetFields.length === 0)
      targetFields = this._fieldNames;

    for (const fieldName of targetFields) {
      const fieldWeight = this.fieldWeights[fieldName] ?? 1;
      for (const [docRef, val] of this.index.lookupField(fieldName, qTerm))
        yield [docRef, val * fieldWeight];
    }
  }

  /**
   * Matches the given Query object against this index.
   * @param q The Query object.
   * @returns Record<docRef, Score(D)>
   */
  match(q) {
    let results = Object.create(null);
    const add = (docRef, weight) =>
        (results[docRef] = (results[docRef] ?? 0) + weight);

    /* special case: We're just searching for the documents
           that has none of any of the omitted terms. */
    if (q.requiredTerms.length === 0 && q.optionalTerms.length === 0
        && q.omittedTerms.length > 0)
      for (const docRef of this.index.getDocRefs())
        results[docRef] = 0;

    /* step 1: MATCH ALL of the required terms. */
    for (const term of q.requiredTerms) {
      const matchedDocs = new Set();
      for (const [docRef, val] of this.enumMatches(term.term, term.fields)) {
        add(docRef, val);
        matchedDocs.add(docRef);
      }
      for (const docRef in results)
        if (!matchedDocs.has(docRef))
          delete results[docRef];
    }

    /* step 2: MATCH ANY of the optional terms. Filter out
           documents that aren't already in the results
           if there are required terms. */
    const hasRequiredTerms = q.requiredTerms.length > 0;
    for (const term of q.optionalTerms)
      for (const [docRef, val] of this.enumMatches(term.term, term.fields)) {
        if (hasRequiredTerms && !(docRef in results))
          continue;
        add(docRef, val);
      }

    /* step 3: EXCLUDE ALL documents that contain any of the
           terms that should be omitted. */
    for (const term of q.omittedTerms)
      for (const [docRef, ] of this.enumMatches(term.term, term.fields))
        delete results[docRef];

    return results;
  }
}
