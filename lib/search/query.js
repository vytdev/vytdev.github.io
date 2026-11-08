/**
 * @class
 * Query builder.
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
   * Parses a query string into a Query object.
   * @param str The query string.
   * @param [addfn] Function for adding the term to the query.
   * Must be of type: (q, term, options) => void.
   * @returns The same Query object.
   */
  static parseQueryString(str, addfn) {
    if (!addfn)
      addfn = (q, term, options) => q.term(term, options);
    const q = new Query();
    const terms = str.split(/\s+/g);

    for (let term of terms) {
      if (!term || term.length === 0)
        continue;

      /* parse fields list */
      let fields;
      const colonNdx = term.indexOf(':');
      if (colonNdx !== -1)
        fields = term.slice(0, colonNdx).split(',');
      term = term.slice(colonNdx + 1);

      /* parse presence indicator */
      let presence = Query.OPTION;
      if (term[0] == '-')
        presence = Query.OMIT;
      if (term[0] == '+')
        presence = Query.REQUIRE;
      if (presence != Query.OPTION)
        term = term.slice(1);

      /* parse query boost */
      let weight;
      const caretNdx = term.lastIndexOf('^');
      if (caretNdx !== -1) {
        weight = +term.slice(caretNdx + 1);
        term = term.slice(0, caretNdx);
      }

      addfn(q, term, { fields, presence, weight });
    }

    return q;
  }
}
