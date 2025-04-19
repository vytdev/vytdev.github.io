const lang = require('./lang.js');
const finder = require('./finder.js');
const config = require('../config.js');
const util = require('../util.js');


/**
 * Load the search index.
 * @returns A Promise which's resolved once the index is loaded.
 */
function loadSearchIndex() {
  return util.loadScript(pageInfo.relRoot + config.INDEX_SEARCH)
    .then(() => {
      searchIndex.ref2term = Object.create(null);
      for (const [ term, ref ] in Object.entries(searchIndex.term2ref))
        searchIndex.ref2term[ref] = term;
    })
    .then(() => {
      exports.searchIndex = searchIndex;
    });
}


/**
 * Loads the page data index.
 * @returns A Promise.
 */
function loadPageDataIndex() {
  return util.loadScript(config.INDEX_PAGEDATA)
    .then(() => {
      exports.pageDataIndex = pageDataIndex;
    });
}


/**
 * Loads the link index.
 * @returns A Promise.
 */
function loadLinkIndex() {
  return util.loadScript(config.INDEX_LINKS)
    .then(() => {
      exports.linkIndex = linkIndex;
    })
}


/**
 * Perform a query.
 * @param text The query string.
 * @returns An array of documents, or null.
 */
function query(text) {
  if (!exports.searchIndex || !exports.pageDataIndex)
    return null;
  return Object.entries(finder.performSearch(text))
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
function getAuthorsList() {
  if (!exports.searchIndex)
    return null;
  return Object.keys(searchIndex.authors)
    .map(v => searchIndex.ref2term[v]);
}


/**
 * Get tags list.
 * @returns An array of tags.
 */
function getTagsList() {
  if (!exports.searchIndex)
    return null;
  return Object.entries(searchIndex.tags)
    .map(v => searchIndex.ref2term[v]);
}


/**
 * Sorting functions
 */
const sortFuncs = {};


/**
 * Register a sorting function.
 * @param name The name of the func.
 * @param fn The sorting function ((a, b) => ...).
 */
function registerSortingFunc(name, fn) {
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


module.exports = {
  searchIndex:    null,
  pageDataIndex:  null,
  linkIndex:      null,
  loadSearchIndex,
  loadPageDataIndex,
  loadLinkIndex,
  query,
  getAuthorsList,
  getTagsList,
  sortFuncs,
  registerSortingFunc,
};
