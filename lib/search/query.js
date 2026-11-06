/**
 * @class
 * Query builder and executor.
 */
export class Query {

  /**
   * @constructor
   */
  constructor() {
    this.optionalTerms = [];
    this.requiredTerms = [];
    this.omittedTerms = [];
  }

  /**
   * Presence options.
   */
  static OPTION  = 'option';   /* optional existence of term */
  static REQUIRE = 'require';  /* require the existence of term */
  static OMIT    = 'omit';     /* require non-existence */

  /**
   * Appends a term or list of terms into the query.
   * @param q A string or array of strings representing the terms.
   * @param [options] Optional options for the term(s). `weight` to
   * customize the term's influence on scores; `presence` to indicate
   * the requirement of the term; and `fields` to specify which
   * fields to only search from.
   * @returns this
   */
  term(q, options) {
    const weight = options?.weight ?? 1;
    const fields = options?.fields;
    const presence = options?.presence ?? Query.OPTION;

    const targetList = {
        [Query.OPTION]: this.optionalTerms,
        [Query.REQUIRE]: this.requiredTerms,
        [Query.OMIT]: this.omittedTerms,
      }[presence];

    const addTerm = (term) => targetList
        .push({ term, weight, fields, presence });

    if (typeof q === 'string')
      addTerm(q);
    else if (Array.isArray(q))
      q.forEach(addTerm);

    return this;
  }

  /**
   * Match a query against the given index.
   * @param index The index.
   * @param [fieldWeights] Optional biasing factors for certain fields.
   * @returns Record<docRef, score>
   */
  matchAgainstIndex(index, fieldWeights) {
    const fieldNames = index.getFieldNames();
    const results = Object.create(null);    /* Record<docRef, score> */

    /* helper function for enumerating candidate matches */
    function *enumMatches(term) {
      const targetFields = term.fields
          ?.filter(n => fieldNames.has(n)) ?? fieldNames;
      for (const fieldName of targetFields)
        for (const [docRef, val] of index.lookupField(fieldName, term.term))
          yield [docRef, val * (fieldWeights?.[fieldName] ?? 1)];
    }

    const hasRequiredTerms = this.requiredTerms.length > 0;
    const hasOptionalTerms = this.optionalTerms.length > 0;
    const hasOmittedTerms  = this.omittedTerms.length  > 0;
    const isNegated = !hasRequiredTerms && !hasOptionalTerms
            && hasOmittedTerms;

    /* all-negated case: start with all documents first */
    if (isNegated)
      for (const docRef of index.getDocRefs())
        results[docRef] = 0;

    /* step 1: match required terms */
    for (const term of this.requiredTerms)
      for (const [docRef, val] of enumMatches(term))
        results[docRef] = (results[docRef] ?? 0) +
              val * (term.weight ?? 1);

    /* step 2: match optionals; if there are required terms, ignore
               the docs that aren't already in the results */
    for (const term of this.optionalTerms)
      for (const [docRef, val] of enumMatches(term)) {
        if (hasRequiredTerms && !(docRef in results))
          continue;
        results[docRef] = (results[docRef] ?? 0) +
              val * (term.weight ?? 1);
      }

    /* step 3: remove the documents that includes terms that
               should not be included */
    for (const term of this.omittedTerms)
      for (const [docRef, ] of enumMatches(term))
        if (docRef in results)
          delete results[docRef];

    return results;
  }
}
