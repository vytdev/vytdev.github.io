// TODO: migrate to new engine

import * as search from '../lib/search/index.js';
import * as nlp from '../lib/nlp/index.js';

/** @type search.SearchStageIndex */
let stage;
let pageInfos;
resetRecord();


/**
 * Reset the entire indexing record.
 */
export function resetRecord() {
  stage = new search.SearchStageIndex();
  stage.addField('title',   'bm25');
  stage.addField('about',   'bm25');
  stage.addField('content', 'bm25');
  stage.addField('tags',    'tag');
  stage.addField('authors', 'tag');
  pageInfos = Object.create(null);
}


/**
 * Get the current record.
 * @returns The current indexing record.
 */
export function getRecord() {
  return pageInfos;
}


/**
 * Update the indexing record of a document.
 * @parm docID The identifier of the document.
 * @param pageInfo The page info of the document.
 * @param rawContent The raw markdown content (front-matter stripped).
 */
export function updateDoc(docID, pageInfo, rawContent) {
  pageInfos[docID] = pageInfo;
  stage.updateDocField(docID, 'title',   nlp.preprocessText(pageInfo.title));
  stage.updateDocField(docID, 'about',   nlp.preprocessText(pageInfo.about));
  stage.updateDocField(docID, 'content', nlp.preprocessText(rawContent));
  stage.updateDocField(docID, 'tags',    pageInfo.tags);
  stage.updateDocField(docID, 'authors', pageInfo.authors);
}


/**
 * Remove a document from the indexing record.
 * @param docID The document identifier.
 */
export function removeDoc(docID) {
  stage.removeDoc(docID);
  delete pageInfos[docID];
}


/**
 * Make search index.
 * @returns The generated search index.
 */
export function makeSearchIndex() {
  return stage.finalize();
}


/**
 * Page info index.
 * @returns Page info index.
 */
export function makeInfoIndex() {
  return pageInfos;
}
