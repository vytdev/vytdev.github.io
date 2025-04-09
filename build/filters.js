const path = require('path');
const filters = {};


/**
 * Filter for generating absolute-to-relative paths from the
 * templates.
 */
filters['url'] = function(pathName) {
  if (this.doc.isPathIndep)
    return '/' + path.normalize(pathName);
  return './' + path.relative(path.dirname(this.sourceName), pathName);
}


/**
 * Add filters to the data scope.
 * @param data The data.
 */
function mixInFilters(data) {
  for (const k of Object.keys(filters)) {
    if (typeof filters[k] != 'function')
      continue;
    if (typeof data[k] != 'undefined')
      continue;
    data[k] = filters[k].bind(data);
  }
}


module.exports = {
  filters,
  mixInFilters,
};
