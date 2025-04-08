const util = require('./util.js');
const query = require('./query.js');
const events = require('./events.js');

events.globalEvents.on('load', () => {
  if (query['h'])
    util.highlight(query['h'], document.body);
  util.changeTheme(util.THEMES.light);
});
