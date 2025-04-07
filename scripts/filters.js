const path = require('path');
const filters = module.exports = {};

filters['url'] = function(pathName) {
  return './' + path.relative(path.dirname(this.sourceName), pathName);
}
