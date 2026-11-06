import { Query } from './query.js';

export * from './nlp.js';
export * from './query.js';
export * from './storage.js';

export * from './indices/bm25.js';
export * from './indices/tags.js';
export * from './indices/index.js';


/**
 * Parses a query string and makes a Query object.
 * @param str The query string.
 * @param [pretoken] Optional pre-processing of term token.
 * @returns Query object.
 */
export function parseQueryString(str, pretoken=((q)=>q)) {
  const q = new Query();
  const terms = str.trim().split(/\s+/g);

  for (let term of terms) {
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

    /* optional preprocessing */
    term = pretoken?.(term);
    if (!term)
      continue;

    q.term(term, { fields, presence, weight });
  }

  return q;
}
