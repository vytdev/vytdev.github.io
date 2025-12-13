import config from './config.js';
import * as events from './modules/events.js';

/* Make 'require' accessible. */
if (config.EXPOSE_INTERNAL_REQUIRE)
  global.clientJSRequire = require.bind(null);

import './modules/themes.js';  /* load the theme first */
import './ui.js';
import './search-page.js';

events.globalEvents.once('load', () => {
  /*
  changeAnnouncement(`
    We've updated our policies. Please take a moment to review them:
    <a href="${pageInfo.relRoot}cookie.html">Cookie Statement</a>,
    <a href="${pageInfo.relRoot}disclaimer.html">Disclaimer</a>,
    <a href="${pageInfo.relRoot}license.html">Licensing</a>,
    <a href="${pageInfo.relRoot}privacy.html">Privacy Policy</a>,
    <a href="${pageInfo.relRoot}terms.html">Terms of Use</a>.
  `);
  */
});
