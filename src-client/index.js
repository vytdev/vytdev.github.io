/* Hides '.noscript's immediately */
document.documentElement.classList.replace('no-js', 'with-js');
const util = require('./util.js');

util.initTheme();
require('uiHandlers.js');
