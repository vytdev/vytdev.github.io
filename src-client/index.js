/* Hides '.noscript's immediately */
document.documentElement.classList.replace('no-js', 'with-js');

const util = require('./util.js');

/* Load the theme. */
util.initTheme();

require('uiHandlers.js');
require('searchPage.js');
