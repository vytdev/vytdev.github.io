const path = require('path');
const filters = {};


/**
 * Filter for generating absolute-to-relative paths from the
 * templates.
 */
filters['url'] = function(pathName) {
  if (this.ctx.doc.isPathIndep)
    return '/' + path.normalize(pathName);
  return './' + path.relative(path.dirname(this.ctx.sourceName), pathName);
};


/**
 * Filter for serializing JSON objects.
 */
filters['json_stringify'] = function(obj) {
  return JSON.stringify(obj);
};


/**
 * Add filters to the data scope.
 * @param env The nunjucks env.
 */
function mixInFilters(env) {
  for (const k of Object.keys(filters)) {
    if (typeof filters[k] != 'function')
      continue;
    env.addFilter(k, filters[k]);
  }
}


module.exports = {
  filters,
  mixInFilters,
};
