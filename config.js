const path = require('path');

module.exports = {
  ROOT_DIR:           __dirname,
  SITE_ADDRESS:       'vytdev.github.io',

  OUT_DIR:            path.join(__dirname, 'dist'),
  SRC_DIR:            path.join(__dirname, 'src'),
  BUILDER_DIR:        path.join(__dirname, 'build'),

  CLIENT_JS_DIR:      path.join(__dirname, 'src-client'),
  CLIENT_ENTRY:       'index.js',
  CLIENT_OUTPUT:      'assets/main.js',

  INDEX_SEARCH:       'assets/searchIndex.js',
  INDEX_LINKS:        'assets/linkIndex.js',
  INDEX_PAGEDATA:     'assets/pageDataIndex.js',

  SITEMAP_FILE:       'sitemap.xml',
  NOT_FOUND_PAGE:     '404.html',
  TEST_PORT:          3000,
  TEST_ADDRESS:       '::', /* IPv6 loopback. */
};
