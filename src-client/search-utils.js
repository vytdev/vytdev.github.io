// TODO: rewrite the client search

import * as search from '../lib/search/index.js';
import config from './config.js';
import * as util from './util.js';


/**
 * Load the search index.
 * @returns A Promise which's resolved once the index is loaded.
 */
export async function loadSearchIndex() {
  return util.loadScript(pageInfo.relRoot + config.INDEX_SEARCH);
}


/**
 * Loads the info index.
 * @returns A Promise.
 */
export async function loadInfoIndex() {
  return util.loadScript(pageInfo.relRoot + config.INDEX_INFO);
}



// temporary function.
function getFieldBiasingFactors() {
  return {
    'title':    config.F_TITLE,
    'about':    config.F_ABOUT,
    'content':  config.F_CONTENT,
    'tags':     config.F_TAGS,
    'authors':  config.F_AUTHORS,
  };
}

/**
 * Perform a query.
 * @param text The query string.
 * @returns An array of documents, or null.
 */
export function query(text) {
  const index = new search.SearchIndex(searchIndex);
  const q = search.parseQueryString(text, t => {
    const base = search.preprocess(t);
    const substrs = [];

    // TODO: optimize this
    // partials must weight smaller
    const termsInIndex = Object.keys(index.term2ref);
    for (const term of termsInIndex)
      if (term.includes(t))
          substrs.push(term);

    return base.concat(substrs);
  });
  const results = search.match(q, index, getFieldBiasingFactors());

  return Object.entries(results)
    .map(([docRef, val]) => ({
      docUid: docRef,
      pageInfo: infoIndex[docRef],
      score: val,
    }));
}


/**
 * Sorting functions
 */
export const sortFuncs = {};


/**
 * Register a sorting function.
 * @param name The name of the func.
 * @param fn The sorting function ((a, b) => ...).
 */
export function registerSortingFunc(name, fn) {
  sortFuncs[name] = function(arr, rev = false) {
    const revVal = rev ? -1 : 1;
    return arr.sort((a, b) => fn(a, b) * revVal);
  };
}


/* Register some preset sorting funcs. */
registerSortingFunc('relevance',
  (a, b) => b.score - a.score);
registerSortingFunc('title',
  (a, b) => a.pageInfo.title < b.pageInfo.title ? -1 : 1);
registerSortingFunc('published',
  (a, b) => a.pageInfo.published < b.pageInfo.published ? -1 : 1);
registerSortingFunc('updated',
  (a, b) => a.pageInfo.updated < b.pageInfo.updated ? -1 : 1);
