const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const util = require('./util.js');
const md = require('./markdown.js');
const search = require('./search.js');
const pipeline = require('./pipeline.js');


/**
 * Render using the given template file.
 * @param templ The template file path (relative to src folder).
 * @param data The template data.
 * @returns The rendered html raw string.
 */
function renderHTML(templ, data) {
  if (!templ.endsWith(config.TMPL_SUFFIX))
    return null;
  return pipeline.njkEnv.render(templ, data);
}


/**
 * Find a template file for a markdown document.
 * @param mdPath The path of the markdown document.
 * @param prefer The initial preferred layout, if exists.
 * @returns The template path.
 */
function locateTemplateForDoc(mdPath, prefer) {
  let curr = mdPath + config.TMPL_SUFFIX;

  if (typeof prefer == 'string' && prefer != 'auto')
    if (util.isNormFile(path.join(config.SRC_DIR, prefer +
        config.TMPL_SUFFIX)))
      return prefer + config.TMPL_SUFFIX;

  /* If we have 'dir1/doc1.md', check for 'dir1/doc1.md.njk' */
  if (util.isNormFile(path.join(config.SRC_DIR, curr)))
    return curr;

  /* Look for 'index.njk' up to the root of src folder. */
  while (curr != '.' || curr != '/') {
    curr = path.dirname(curr);
    const indexTmplPath = path.join(curr, 'index' + config.TMPL_SUFFIX);

    /* index.njk found! */
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
    dont_index:  false,
    no_toc:      false,
    no_trail:    false,
    no_sbar:     false,
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
  /* Extra options. */
  setIfType('layout',      'string');
  setIfType('hide_nav',    'boolean');
  setIfType('abs_paths',   'boolean');
  setIfType('dont_index',  'boolean');
  setIfType('no_toc',      'boolean');
  setIfType('no_trail',    'boolean'); /* Breadcrumbs */
  setIfType('no_sbar',     'boolean'); /* Search bar */

  /* Prev and next page. */
  if (typeof meta.prev_page == 'string')
    result.prev_page = meta.prev_page.replace(/\.md$/g, '.html');
  if (typeof meta.next_page == 'string')
    result.next_page = meta.next_page.replace(/\.md$/g, '.html');

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
  name = name.replaceAll('\\', '/');  /* Windows separator. */
  name = name.replace(/^\//g, '');    /* Leading slashes. */
  name = name.replace(/\/$/g, '');    /* Trailing slashes. */
  return util.encBase62(util.strFnv1a(name));
}


/**
 * Generate breadcrumbs HTML for path.
 * @param filePath The path to process.
 * @param isIndex Whether the path is an index page.
 * @returns The generated HTML.
 */
function genBreadcrumbs(filePath, isIndex) {
  const parts = filePath.split(path.sep);
  const len = parts.length + (isIndex ? -1 : 0);
  parts.unshift('.'); /* The root. */

  /* Current anchor link. */
  let currPath = path.relative(path.dirname(filePath), '.');
  let html = '<div class="breadcrumbs">\n';

  for (let i = 0; i < len; i++) {
    const name = parts[i];
    const displayName = i == 0 ? 'Hub'
        : name.charAt(0).toUpperCase() + name.slice(1);

    /* Process the next path. */
    currPath = path.join(currPath, name);
    const thisPath = path.join(currPath, 'index.html');

    /* We need a separator. */
    if (i != 0)
      html += '<span class="breadcrumbs-sep"> &gt; </span>\n';

    /* Add the html. */
    html += '<a class="breadcrumbs-path"'
         +  ' href="' + md.mdInstance.utils.escapeHtml(thisPath) + '">'
         +  md.mdInstance.utils.escapeHtml(displayName) + '</a>\n';
  }

  return html + '</div>\n';
}


function genJsonLdSeo(doc) {
  return JSON.stringify({
    "@context": "https://schema.org/",
    "@type": doc.path == 'index.html' ? 'WebSite' : 'WebPage',
    "title":          doc.title,
    "headline":       doc.title,
    "description":    doc.about,
    "datePublished":  doc.published,
    "dateModified":   doc.updated,
    "image":          doc.thumbnail || undefined,
    "keywords":       doc.tags.join(', '),
    "author": doc.authors.map(v => ({
      "@type": "Person",
      "name": v,
      "sameAs": `https://github.com/${v}`,
    })),
    "publisher": {
      "@type": "Organization",
      "name": "VYT Hub",
      "url": `https://${config.SITE_ADDRESS}`,
      "logo": `https://${config.SITE_ADDRESS}/assets/img/icon-1024x1024.png`,
    },
  });
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
  const mdEnv = Object.create(null);
  const content = fs.readFileSync(srcPath, 'utf8');
  const mdAsHTML = md.renderMarkdown(content, mdEnv);
  const opts = procDocOpts(mdEnv.metaData);

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
    notIndexed:   opts.dont_index,
    noToc:        opts.no_toc,
    noBreadcrumbs:  opts.no_trail,
    noSearchBar:  opts.no_sbar,
  };

  const data = {
    sourceName:   mdPath,
    htmlContent:  mdAsHTML,
    htmlToc:      tocHTML,
    htmlBreadcrumbs:  opts.no_trail
        ? '' : genBreadcrumbs(mdPath, docCtx.isIndex),
    jsonLdSeo:    genJsonLdSeo(docCtx),
    doc:          docCtx,
    config:       config,
  };

  /* Put into a template. */
  const finalHTML =
    renderHTML(locateTemplateForDoc(mdPath, opts.layout), data);

  /* Write the final file. */
  fs.writeFileSync(destPath, finalHTML, 'utf8');

  /* Add this document to record for later index gen.
     We don't want the metadata part in the content,
     so let's remove it. */
  if (!opts.dont_index)
    search.setRecord(docCtx.ident, docCtx,
      content.replace(mdEnv.metaDataRaw || '', ''));
  else
    search.rmRecord(docCtx.ident);
}


module.exports = {
  renderHTML,
  locateTemplateForDoc,
  procDocOpts,
  getUidForDoc,
  renderMarkdownDocument,
};
