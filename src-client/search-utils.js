import Search from './search.js';
import config from './config.js';
import * as util from './util.js';


/**
 * Load the search index.
 * @returns A Promise which's resolved once the index is loaded.
 */
export async function loadSearchIndex() {
  return util.loadScript(pageInfo.relRoot + config.INDEX_SEARCH)
    .then(() => {
      searchIndex.ref2term = Object.create(null);
      for (const term of Object.keys(searchIndex.term2ref))
        searchIndex.ref2term[searchIndex.term2ref[term]] = term;
    });
}


/**
 * Loads the page data index.
 * @returns A Promise.
 */
export async function loadPageDataIndex() {
  return util.loadScript(config.INDEX_PAGEDATA);
}


/**
 * Loads the link index.
 * @returns A Promise.
 */
export async function loadLinkIndex() {
  return util.loadScript(config.INDEX_LINKS);
}


/**
 * Perform a query.
 * @param text The query string.
 * @returns An array of documents, or null.
 */
export function query(text) {
  return Object.entries(new Search(searchIndex).fastSearch(text))
    .map(([docRef, result]) => ({
      docUid: docRef,
      pageInfo: pageDataIndex[docRef],
      ...result,
    }));
}


/**
 * Get authors list.
 * @returns An array of author username strings
 */
export function getAuthorsList() {
  return Object.keys(searchIndex.authors)
    .map(v => searchIndex.ref2term[v]);
}


/**
 * Get tags list.
 * @returns An array of tags.
 */
export function getTagsList() {
  return Object.entries(searchIndex.tags)
    .map(v => searchIndex.ref2term[v]);
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
  (a, b) => b.relevance - a.relevance);
registerSortingFunc('title',
  (a, b) => a.pageInfo.title < b.pageInfo.title ? -1 : 1);
registerSortingFunc('published',
  (a, b) => a.pageInfo.published < b.pageInfo.published ? -1 : 1);
registerSortingFunc('updated',
  (a, b) => a.pageInfo.updated < b.pageInfo.updated ? -1 : 1);
