const path = require('path');
const filters = module.exports = {};

filters['url'] = function(pathName) {
  if (this.doc.isPathIndep)
    return '/' + path.normalize(pathName);
  return './' + path.relative(path.dirname(this.sourceName), pathName);
}
