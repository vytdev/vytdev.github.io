import path from 'path';
import nunjucks from 'nunjucks';
import config from '../config.js';

/**
 * A nunjucks environment.
 */
export const env = nunjucks.configure(config.SRC, {
  autoescape: true,
  noCache: true,
});


/**
 * Render HTML using a template.
 * @param templ The template file.
 * @param data Info to pass to the template.
 * @returns HTML string.
 */
export function renderHTML(templ, data) {
  if (!templ.endsWith(config.TMPL_SUFFIX))
    return null;
  return env.render(templ, data);
}


/**
 * Locate the sensible template for the given doc path.
 * @param docPath Path to the md document.
 * @param prefer Preferred template if exists.
 * @returns Path to the template file.
 */
export function locateTemplateForDoc(docPath, prefer) {
  let curr = docPath + config.TMPL_SUFFIX;

  if (typeof prefer == 'string' && prefer != 'auto')
    if (util.isNormFile(path.join(config.SRC, prefer +
        config.TMPL_SUFFIX)))
      return prefer + config.TMPL_SUFFIX;

  /* For 'dir1/doc1.md', check 'dir1/doc1.md.njk' */
  if (util.isNormFile(path.join(config.SRC, curr)))
    return curr;

  /* Look for 'index.njk' up to the root of src folder. */
  while (curr != '.' || curr != path.sep) {
    curr = path.dirname(curr);
    const indexTmplPath = path.join(curr, 'index' + config.TMPL_SUFFIX);

    /* index.njk found! */
    if (util.isNormFile(path.join(config.SRC, indexTmplPath)))
      return indexTmplPath;
  }

  /* :/ */
  return null;
}


/**
 * Filter for generating absolute-to-relative paths from the
 * templates.
 */
env.addFilter('url', function(pathName) {
  if (this.ctx.doc.isPathIndep)
    return '/' + path.normalize(pathName);
  return './' + path.relative(path.dirname(this.ctx.sourceName), pathName);
});


/**
 * Filter for serializing JSON objects.
 */
env.addFilter('json_stringify', function(obj) {
  return JSON.stringify(obj);
});
