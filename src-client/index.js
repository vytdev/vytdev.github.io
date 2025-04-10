const util = require('./util.js');
const query = require('./query.js');
const events = require('./events.js');
const search = require('./search/index.js');

events.globalEvents.on('load', () => {
  if (query['h'])
    util.highlight(query['h'], document.body);
  util.changeTheme(util.THEMES.light);
  search.loadIndex().then(() => {
    try {
      alert(JSON.stringify(search.query(prompt('search'))));
    } catch (e) {
      alert(e);
    }
  });
});
