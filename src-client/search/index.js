const lang = require('./lang.js');
const finder = require('./finder.js');
const config = require('../config.js');
const util = require('../util.js');


/**
 * Load the search index.
 * @returns A Promise which's resolved once the index is loaded.
 */
function loadIndex() {
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
 * Returns the search index.
 * @returns The index or null.
 */
function getSearchIndex() {
  if (exports.searchIndex)
    return searchIndex;
  return null;
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
    .map(([docRef, score]) => ({
      docUid: docRef,
      relevance: score,
      pageInfo: pageDataIndex[docRef],
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


module.exports = {
  searchIndex:    null,
  pageDataIndex:  null,
  linkIndex:      null,
  loadIndex,
  loadPageDataIndex,
  loadLinkIndex,
  getSearchIndex,
  query,
  getAuthorsList,
  getTagsList,
};
