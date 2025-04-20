const util = require('./util.js');
const config = require('./config.js');

/* Make 'require' accessible. */
if (config.EXPOSE_INTERNAL_REQUIRE)
  global.clientJSRequire = require.bind(null);

/* Hides '.noscript's immediately */
document.documentElement.classList.replace('no-js', 'with-js');

/* Load the theme. */
util.initTheme();

require('uiHandlers.js');
require('searchPage.js');
require('3rd-parties.js');
