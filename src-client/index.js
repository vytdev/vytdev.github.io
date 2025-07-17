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
require('search/page.js');

require('./events.js').globalEvents.once('load', () => {
  /*
  util.changeAnnouncement(`
    We've updated our policies. Please take a moment to review them:
    <a href="${pageInfo.relRoot}cookie.html">Cookie Statement</a>,
    <a href="${pageInfo.relRoot}disclaimer.html">Disclaimer</a>,
    <a href="${pageInfo.relRoot}license.html">Licensing</a>,
    <a href="${pageInfo.relRoot}privacy.html">Privacy Policy</a>,
    <a href="${pageInfo.relRoot}terms.html">Terms of Use</a>.
  `);
  */
});
