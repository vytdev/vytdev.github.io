const path = require('path');

module.exports = {
  ROOT_DIR:           __dirname,
  SITE_ADDRESS:       'vytdev.github.io',
  BUILD_DIR:          path.join(__dirname, 'build'),
  SRC_DIR:            path.join(__dirname, 'src'),
  SCRIPTS_DIR:        path.join(__dirname, 'scripts'),
  CLIENT_JS_DIR:      path.join(__dirname, 'src-client'),
  CLIENT_ENTRY:       'index.js',
  CLIENT_OUTPUT:      'assets/main.js',
  NOT_FOUND_PAGE:     '404.html',
  TEST_PORT:          3000,
  TEST_ADDRESS:       '::', /* IPv6 loopback. */
};
