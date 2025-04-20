const config = require('./config.js');
const util = require('./util.js');
const events = require('./events.js');


let isLoaded = false;
let mainGTMLayer;


/**
 * Trigger initial GTM events.
 */
function triggerInitialEvents() {
  if (!isLoaded)
    return;

  /* Consent granted first. */
  mainGTMLayer.push({
    event: 'consent_given',
    consent_type: 'cookie_banner',
    consent_value: 'accepted'
  });

  /* For analytics. */
  mainGTMLayer.push({
    event: 'page_view',
    page_path: location.pathname,
    page_title: document.title,
  });
}


/**
 * Load the third-parties if not yet loaded.
 * @returns A Promise.
 */
function load3rdParties() {
  if (isLoaded)
    return new Promise((res, rej) => res());

  const layer = config.GTM_DATA_LAYER;
  return util.loadGTM(config.GTM_TRACK_ID, layer)
    .then(() => {
      isLoaded = true;
      exports.mainGTMLayer = mainGTMLayer = window[layer];
    })
    .then(triggerInitialEvents);
}


/**
 * Load 3rd parties if the user has consented.
 * @returns Promise, resolved once all 3rd parties were loaded.
 */
function loadIfConsented() {
  return new Promise((res, rej) => rej()); /* Temporary only. */

  if (util.getCookieConsent() != util.COOKIE_CONSENTS.accepted)
    return new Promise((res, rej) => rej());
  return load3rdParties();
}


/* Event from: uiHandlers.js */
events.globalEvents.on('cookie-consented', () =>
  loadIfConsented().catch(() => void 0));


exports = module.exports = {
  mainGTMLayer: null,
  triggerInitialEvents,
  load3rdParties,
  loadIfConsented,
};
