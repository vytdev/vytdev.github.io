const util = require('./util.js');
const events = require('./events.js');
const nlp = require('./search/lang.js');
const search = require('./search/index.js');

const queryText = util.query['q'];
const queryTokens = queryText && nlp.split(queryText);
let stateEl;
let resultEl;
let searchResults;


/**
 * Update the state text.
 * @param text The text to set.
 */
function setStateText(text) {
  if (!stateEl)
    return;
  stateEl.innerText = text;
}


/**
 * Clears the result display.
 */
function clearResultsDisplay() {
  if (resultEl)
    resultEl.innerHTML = '';
}


/**
 * Sort the search results.
 * @param sortFn The sort fn from search.sortFuncs.
 * @param rev Whether to reverse the result.
 */
function sortResults(sortFn, rev = false) {
  sortFn(searchResults, rev);
}


/**
 * Generate an excerpt from text.
 * @param text The source text.
 * @param terms The terms to lookup. (must be normalized)
 * @param [span] The span of the excerpt (left and right).
 * @returns The excerpt text.
 */
function makeTextExcerpt(text, terms, span = 140) {
  if (text.length == 0)
    return '';
  const normText = nlp.normalize(text);

  const lastQueryIdx = terms
    .map(kwd => normText.lastIndexOf(kwd))
    .filter(v => v > -1)
    .slice(-1)[0];

  /* None of the keyword was found?! */
  if (!lastQueryIdx)
    return '';

  let startPos = lastQueryIdx - span;
  if (startPos < 0)
    startPos = 0;
  let endPos = lastQueryIdx + span;
  if (endPos > text.length)
    endPos = text.length;

  /* We may or may not use an ellipsis. */
  const head = startPos == 0          ? '' : '...';
  const tail = endPos == text.length  ? '' : '...';

  return head + text.slice(startPos, endPos).trim() + tail;
}


/**
 * Render a search result item.
 * @param item The item data.
 * @returns A Promise which resolves to a div.
 */
async function renderResultItem(item) {
  let aboutText = item.pageInfo.about;

  /* Try to fetch the html page. */
  try {
    const html = await util.fetchText(pageInfo.relRoot + item.pageInfo.path);
    let contentText = util
      .parseFullHTML(html)
      .getElementById('main-content')
      .innerText.replace(/\s+/g, ' ');
    contentText = makeTextExcerpt(contentText, queryTokens);
    if (contentText) aboutText = contentText;
  }
  catch {
    /* no-op. */
  }

  const docLink = pageInfo.relRoot + item.pageInfo.path
      + '?h=' + encodeURIComponent(queryText);

  /* Build the item structure. */
  let res =
  `<a class="search-item" href="${util.escapeHTML(docLink)}">
     <p class="search-item-title">${util.escapeHTML(item.pageInfo.title)}</p>
     <p class="search-item-path">${util.escapeHTML(item.pageInfo.path)}</p>
     <p class="search-item-about">${util.escapeHTML(aboutText)}</p>
     <p class="search-item-tags">`;

  /* Add tags. */
  if (item.tags)
    for (const tag of item.tags)
      res += `<span class="key-tag">${util.escapeHTML(tag)}</span>`;

  res += '<p></a>';

  /* Highlight the result. */
  const elem = util.parsePartHTML(res);
  util.highlight(queryText, elem.querySelector('.search-item-about'));
  return elem;
}


/**
 * Display each result.
 */
async function displayResults() {
  clearResultsDisplay();

  for (const item of searchResults) {
    if (!item.cachedRenderElement)
      item.cachedRenderElement = await renderResultItem(item);
    resultEl.appendChild(item.cachedRenderElement);

    /* ~40 items per second. */
    await util.asyncSleep(25);
  }
}


/**
 * Do a search. Note: it applies globally
 * @param query The query string.
 */
async function doSearch(query) {
  if (!stateEl || !resultEl)
    return;

  /* Load the index. */
  setStateText('Fetching index...');
  await search.loadSearchIndex();
  await search.loadPageDataIndex();

  /* Query the index. */
  setStateText('Searching...');
  const startTime = Date.now();
  searchResults = search.query(query);
  exports.searchResults = searchResults;
  const elapsed = (Date.now() - startTime) / 1000;
  const numOfMatches = searchResults.length;

  /* Update feedback. */
  if (numOfMatches == 0)
    setStateText(`No match was found. (${elapsed}s)`);
  else
    setStateText(`Found ${numOfMatches} matches. (${elapsed}s)`);

  /* Sort and render the results. */
  sortResults(search.sortFuncs.relevance, false);
  displayResults();
}


/**
 * Start the search once the DOM is loaded.
 */
events.globalEvents.once('load', () => {
  if (pageInfo.relRoot != './' || pageInfo.path != 'search.html')
    return;

  if (!queryText)
    return;

  /* Update the search bar. */
  const searchBar = document.getElementById('search-bar');
  searchBar.value = queryText;

  /* Necessary elements for search feedback. */
  stateEl = document.getElementById('search-state');
  resultEl = document.getElementById('search-result');

  /* Do the search. */
  doSearch(queryText);
});


exports = module.exports = {
  queryText,
  queryTokens,
  searchResults,
  setStateText,
  clearResultsDisplay,
  sortResults,
  makeTextExcerpt,
  renderResultItem,
  displayResults,
  doSearch,
};
