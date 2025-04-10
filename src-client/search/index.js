const lang = require('./lang.js');
const finder = require('./finder.js');
const config = require('../config.js');
const util = require('../util.js');

/**
 * Returns whether the search index is ready.
 * @returns True if the index is ready.
 */
function isIndexReady() {
  return typeof searchIndex != 'undefined';
}


/**
 * Load the search index.
 * @returns A Promise which's resolved once the index is loaded.
 */
function loadIndex() {
  return util.loadScript(pageInfo.relRoot + config.INDEX_SEARCH);
}


/**
 * Returns the search index.
 * @returns The index or null.
 */
function getSearchIndex() {
  if (isIndexReady())
    return searchIndex;
  return null;
}


/**
 * Perform a query.
 * @param text The query string.
 * @returns An array of documents, or null.
 */
function query(text) {
  if (!isIndexReady())
    return null;
  return Object.entries(finder.performSearch(text))
    .map(([docRef, score]) => ({
      docUid: docRef,
      relevance: score,
    }));
}


module.exports = {
  isIndexReady,
  loadIndex,
  getSearchIndex,
  query,
};
