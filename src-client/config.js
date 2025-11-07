export default {

  /* Exposes 'clientJSRequire' for the sake of debugging. */
  EXPOSE_INTERNAL_REQUIRE: false,

  /* Search field weights. */
  F_CONTENT:  20,
  F_TITLE:    16,
  F_TAGS:     15,
  F_ABOUT:    11,
  F_AUTHORS:  6,

  /* Indices. */
  INDEX_SEARCH:    'assets/searchIndex.js',
  INDEX_LINKS:     'assets/linkIndex.js',
  INDEX_PAGEDATA:  'assets/pageDataIndex.js',

  /* Miscellaneous. */
  SCROLL_MARGIN_TOP:   40,
};
