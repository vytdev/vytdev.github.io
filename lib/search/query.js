import * as nlp from '../nlp/index.js';

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
   * Parses a clause.
   * @param clause The clause string.
   * @returns [term, termOptions]
   */
  static parseClause(clause) {
    if (typeof clause !== 'string' || clause.length === 0)
      return [];

    /* parse fields list */
    let fields;
    const colonNdx = clause.indexOf(':');
    if (colonNdx !== -1)
      fields = clause.slice(0, colonNdx).split(',');
    clause = clause.slice(colonNdx + 1);

    /* parse presence indicator */
    let presence = Query.OPTION;
    if (clause[0] == '-')
      presence = Query.OMIT;
    if (clause[0] == '+')
      presence = Query.REQUIRE;
    if (presence != Query.OPTION)
      clause = clause.slice(1);

    /* parse query boost */
    let weight = 1;
    const caretNdx = clause.lastIndexOf('^');
    if (caretNdx !== -1) {
      weight = +clause.slice(caretNdx + 1);
      if (isNaN(weight))
        weight = 1;
      else
        clause = clause.slice(0, caretNdx);
    }

    return [clause, { fields, presence, weight }];
  }

  /**
   * Parses a query string into a Query object.
   * NOTE: This uses NLP for processing.
   * @param str The query string.
   * @param [addfn] Function for adding the term to the query.
   * Must be of type: (q, term, options) => void.
   * @returns The same Query object.
   */
  static parseQueryString(str, addfn) {
    if (!addfn)
      addfn = (q, term, options) => q.term(term, options);
    const q = new Query();
    const tokens = nlp.preTokenPipeline.transform(str);

    for (const token of tokens) {
      let [term, options] = this.parseClause(token);
      term = nlp.postTokenPipeline.transform(term);
      if (!term)
        continue;
      addfn(q, term, options);
    }

    return q;
  }
}
