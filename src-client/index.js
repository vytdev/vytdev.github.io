const util = require('./util.js');
const events = require('./events.js');

require('uiHandlers.js');

events.globalEvents.on('load', () => {
  util.changeTheme(util.THEMES.light);
});
