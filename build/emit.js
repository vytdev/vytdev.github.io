const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const config = require('../config.js');
const util = require('./util.js');
const md = require('./markdown.js');
const filters = require('./filters.js');


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

/**
 * Emit files from the src folder.
 */
function emitAll() {
  util.listRecursiveSync(config.SRC_DIR).forEach(([ file, stat ]) => {
    emitFile(path.relative(config.SRC_DIR, file));
  });
}


/**
 * Emit a source file.
 * @param srcFile The source file relative to source folder.
 */
function emitFile(srcFile) {
  const srcPath = path.join(config.SRC_DIR, srcFile);
  const stat = fs.statSync(srcPath);

  /* File is a directory. */
  if (stat.isDirectory()) {
    fs.mkdirSync(path.join(config.OUT_DIR, srcFile), { recursive: true });
    return;
  }

  /* It is a template file. */
  if (srcFile.endsWith('.ejs'))
    return;

  util.log("emit: " + srcFile);

  /* Not a markdown file. Special file or a static asset? */
  if (!srcFile.endsWith('.md')) {
    handleUnknownFile(srcFile);
    return;
  }

  /* Markdown files. */
  renderMarkdownDocument(srcFile);
}


/**
 * Handle the emission of unknown files.
 * @param srcFile The source file name.
 */
function handleUnknownFile(srcFile) {
  const name = path.basename(srcFile);

  /* Other static assets. */
  fs.copyFileSync(
    path.join(config.SRC_DIR, srcFile),
    path.join(config.OUT_DIR, srcFile));
}


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

  setIfType('title',     'string');
  setIfType('about',     'string');
  setIfType('thumbnail', 'string');
  setIfType('prev_page', 'string');
  setIfType('next_page', 'string');
  setIfType('layout',    'string');
  /* Rendering options. */
  setIfType('hide_nav',  'boolean');
  setIfType('abs_paths', 'boolean');

  /* Publication time, in YYYY-MM-DD. */
  if (typeof meta.published == 'string' && util.isValidDateFmt(meta.published))
    result.published = meta.published;

  /* Revision time, in YYYY-MM-DD. */
  if (typeof meta.updated == 'string' && util.isValidDateFmt(meta.updated))
    result.updated = meta.updated;

  /* Tags for search indexing. */
  if (meta.tags instanceof Array)
    result.tags = meta.tags
      .filter(v => typeof v == 'string')
      .flatMap(v => v.split(/\s*,\s*/));

  /* List of authors. */
  if (meta.authors instanceof Array)
    result.authors = meta.authors
      .filter(v => typeof v == 'string');

  return result;
}


/**
 * Render a markdown document.
 * @param mdPath The markdown path.
 */
function renderMarkdownDocument(mdPath) {
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
    ident:        util.encBase62(util.strFnv1a(mdPath)),
    canonical:    `http://${config.SITE_ADDRESS}/${servePath}`,
    srcPath:      mdPath,
    path:         servePath,
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
    /* Rendering details. */
    hasNav:       !opts.hide_nav,
    usedLayout:   opts.layout,
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
  mixInFilters(data);

  /* Put into a template. */
  const finalHTML =
    renderHTML(locateTemplateForDoc(mdPath, opts.layout), data);

  /* Write the final file. */
  fs.writeFileSync(destPath, finalHTML, 'utf8');

  /* TODO: Do other stuff here. e.g.: tokenization, indexing. */
}


module.exports = {
  mixInFilters,
  emitAll,
  emitFile,
  handleUnknownFile,
  renderHTML,
  locateTemplateForDoc,
  procDocOpts,
  renderMarkdownDocument,
};
