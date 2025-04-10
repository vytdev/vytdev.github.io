const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const config = require('../config.js');
const util = require('./util.js');
const md = require('./markdown.js');
const filters = require('./filters.js');
const search = require('./search.js');


/* TODO: add dont_index option to disable indexing of document */

/**
 * Render using the given template file.
 * @param templ The template file path (relative to src folder).
 * @param data The template data.
 * @returns The rendered html raw string.
 */
function renderHTML(templ, data) {
  if (!templ.endsWith('.ejs'))
    return null;
  const pathName = path.join(config.SRC_DIR, templ);
  const content = fs.readFileSync(pathName, 'utf8');
  return ejs.render(content, data, { filename: pathName });
}


/**
 * Find a template file for a markdown document.
 * @param mdPath The path of the markdown document.
 * @param prefer The initial preferred layout, if exists.
 * @returns The template path.
 */
function locateTemplateForDoc(mdPath, prefer) {
  let curr = mdPath + '.ejs';

  if (typeof prefer == 'string' && prefer != 'auto')
    if (util.isNormFile(path.join(config.SRC_DIR, prefer + '.ejs')))
      return prefer + '.ejs';

  /* If we have 'dir1/doc1.md', check for 'dir1/doc1.md.ejs' */
  if (util.isNormFile(path.join(config.SRC_DIR, curr)))
    return curr;

  /* Look for 'index.ejs' up to the root of src folder. */
  while (curr != '.' || curr != '/') {
    curr = path.dirname(curr);
    const indexTmplPath = path.join(curr, 'index.ejs');

    /* index.ejs found! */
    if (util.isNormFile(path.join(config.SRC_DIR, indexTmplPath)))
      return indexTmplPath;
  }

  /* :/ */
  return null;
}


/**
 * Process doc options.
 * @param meta The metadata object.
 * @returns The options with defaults set.
 */
function procDocOpts(meta) {
  const result = {
    title:       'Untitled',
    about:       'No description',
    published:   '0000-01-01',
    updated:     '0000-01-01',
    tags:        [],
    authors:     ['Unknown'],
    thumbnail:   null,
    prev_page:   null,
    next_page:   null,
    layout:      'auto',
    hide_nav:    false,
    abs_paths:   false,
  };

  if (!meta)
    return result;

  /* Helper function for setting with type check. */
  const setIfType = (key, type) => {
    if (typeof meta[key] == type)
      result[key] = meta[key];
  };

  setIfType('title',       'string');
  setIfType('about',       'string');
  setIfType('thumbnail',   'string');
  setIfType('prev_page',   'string');
  setIfType('next_page',   'string');
  /* Extra options. */
  setIfType('layout',      'string');
  setIfType('hide_nav',    'boolean');
  setIfType('abs_paths',   'boolean');

  /* Publication time, in YYYY-MM-DD. */
  if (typeof meta.published == 'string' && util.isValidDateFmt(meta.published))
    result.published = meta.published;

  /* Revision time, in YYYY-MM-DD. */
  if (typeof meta.updated == 'string' && util.isValidDateFmt(meta.updated))
    result.updated = meta.updated;

  /* Tags for search indexing. */
  if (meta.tags instanceof Array)
    result.tags = util.removeDuplicatesFromArr(meta.tags
      .filter(v => typeof v == 'string')
      .flatMap(v => v.split(/\s*,\s*/))
    );

  /* List of authors. */
  if (meta.authors instanceof Array)
    result.authors = util.removeDuplicatesFromArr(meta.authors
      .filter(v => typeof v == 'string')
    );

  return result;
}


/**
 * Generate a UID for a document by path.
 * @param name The path of the document.
 * @returns The UID string.
 */
function getUidForDoc(name) {
  name = path.normalize(name);
  name = name.replace('\\', '/');  /* Windows separator. */
  name = name.replace(/^\//, '');  /* Leading slashes. */
  name = name.replace(/\/$/, '');  /* Trailing slashes. */
  return util.encBase62(util.strFnv1a(name));
}


/**
 * Render a markdown document.
 * @param mdPath The markdown path.
 */
function renderMarkdownDocument(mdPath) {
  if (!mdPath.endsWith('.md'))
    return;

  const srcPath = path.join(config.SRC_DIR, mdPath);
  const servePath = mdPath.slice(0, -2) + 'html';
  const destPath = path.join(config.OUT_DIR, servePath);

  /* Compile markdown to HTML. */
  const content = fs.readFileSync(srcPath, 'utf8');
  const mdAsHTML = md.md.render(content);
  const opts = procDocOpts(md.md.metaData);

  /* Generate toc. */
  const tabOfCont = md.genTableOfCont(content);
  const tocHTML = md.genTocHTML(tabOfCont);

  /* Build the data scope. */
  const docCtx = {
    ident:        getUidForDoc(mdPath),
    canonical:    `http://${config.SITE_ADDRESS}/${servePath}`,
    srcPath:      mdPath,
    path:         servePath,
    relRoot:      mdPath.replace(/[^\/]+/g, '..').slice(1) + '/',
    isIndex:      path.basename(mdPath) == 'index.md',
    contents:     tabOfCont,
    /* Doc metadata. */
    title:        opts.title,
    about:        opts.about,
    published:    opts.published,
    updated:      opts.updated,
    tags:         opts.tags,
    authors:      opts.authors,
    thumbnail:    opts.thumbnail,
    prevPage:     opts.prev_page,
    nextPage:     opts.next_page,
    /* Extra options. */
    usedLayout:   opts.layout,
    navHidden:    opts.hide_nav,
    isPathIndep:  opts.abs_paths,
  };

  const data = {
    sourceName:   mdPath,
    htmlContent:  mdAsHTML,
    htmlToc:      tocHTML,
    doc:          docCtx,
    config:       config,
  };

  /* Include some filters. */
  filters.mixInFilters(data);

  /* Put into a template. */
  const finalHTML =
    renderHTML(locateTemplateForDoc(mdPath, opts.layout), data);

  /* Write the final file. */
  fs.writeFileSync(destPath, finalHTML, 'utf8');

  /* Add this document to record for later index gen.
     We don't want the metadata part in the content,
     so let's remove it. */
  search.setRecord(docCtx.ident, docCtx,
    content.replace(md.md.metaDataRaw || '', ''));
}


module.exports = {
  renderHTML,
  locateTemplateForDoc,
  procDocOpts,
  getUidForDoc,
  renderMarkdownDocument,
};
