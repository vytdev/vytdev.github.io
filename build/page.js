import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';
import * as util from './util.js';
import { removeDoc, updateDoc } from './search.js';
import { renderText, locateTemplateForDoc } from './templating.js';
import { renderMarkdown } from './markdown.js';
import { genTocHTML } from './markdown-plugins/gen-toc.js';
import * as mdUtils from 'markdown-it/lib/common/utils.mjs';

/**
 * Finalize document options (options from the front-matter).
 * @param meta The metadata object.
 * @returns The options with defaults set.
 */
export function sanitizeDocOptions(meta) {
  const result = {
    /* misc */
    layout:      'auto',
    abs_paths:   false,
    dont_index:  false,

    /* ui elements */
    no_sidebar:  false,
    no_toc:      false,
    no_search:   false,
    no_trail:    false,
    no_print:    false,

    /* metadata */
    thumbnail:   null,
    title:       'Untitled',
    about:       'No description',
    published:   '0000-01-01',
    updated:     '0000-01-01',
    tags:        [],
    authors:     ['Unknown'],
    prev_page:   null,
    next_page:   null,
  };

  if (!meta)
    return result;

  /* helper function for setting with type check. */
  const setIfType = (key, type) => {
    if (typeof meta[key] == type)
      result[key] = meta[key];
  };

  /* misc options */
  setIfType('layout',      'string');  /* template file */
  setIfType('abs_paths',   'boolean'); /* i.e., when the doc can be anywhere */
  setIfType('dont_index',  'boolean'); /* skip site-search and seo indexing */

  /* ui options */
  setIfType('no_sidebar',  'boolean'); /* the sidebar and hamburger */
  setIfType('no_toc',      'boolean'); /* table of contents */
  setIfType('no_search',   'boolean'); /* search bar */
  setIfType('no_trail',    'boolean'); /* breadcrumbs */
  setIfType('no_print',    'boolean'); /* print btn */

  /* metadata */
  setIfType('thumbnail',   'string');  /* thumbnail (mostly for seo only) */
  setIfType('title',       'string');  /* title for the document */
  setIfType('about',       'string');  /* short description abt the doc */

  /* publication and update date */
  if (typeof meta.published == 'string' && util.isValidDateFmt(meta.published))
    result.published = meta.published;
  if (typeof meta.updated == 'string' && util.isValidDateFmt(meta.updated))
    result.updated = meta.updated;

  if (meta.tags instanceof Array)
    result.tags = util.removeDuplicatesFromArr(meta.tags
      .filter(v => typeof v == 'string')
      .flatMap(v => v.split(/\s*,\s*/))
    );

  if (meta.authors instanceof Array)
    result.authors = util.removeDuplicatesFromArr(meta.authors
      .filter(v => typeof v == 'string')
    );

  /* navigation */
  if (typeof meta.prev_page == 'string')
    result.prev_page = meta.prev_page.replace(/\.md$/g, '.html');
  if (typeof meta.next_page == 'string')
    result.next_page = meta.next_page.replace(/\.md$/g, '.html');


  return result;
}


/**
 * Generate a UID for a document by path.
 * @param name The path of the document.
 * @returns The UID string.
 */
export function genUIDForDocument(name) {
  name = path.normalize(name);
  name = name.replaceAll('\\', '/');  /* Windows separator. */
  name = name.replace(/^\//g, '');    /* Leading slashes. */
  name = name.replace(/\/$/g, '');    /* Trailing slashes. */
  return util.encodeNumber(util.strFnv1a(name), 62);
}


/**
 * Generate trail/breadcrumbs HTML for path.
 * @param filePath The path to process.
 * @param isIndex Whether the path is an index page.
 * @returns The generated HTML.
 */
export function genTrail(filePath, isIndex) {
  const parts = filePath.split(path.sep);
  const len = parts.length + (isIndex ? -1 : 0);
  parts.unshift('.'); /* The root. */

  /* Current anchor link. */
  let currPath = path.relative(path.dirname(filePath), '.');
  let html = '<div class="breadcrumbs noprint">\n';

  for (let i = 0; i < len; i++) {
    const name = parts[i];
    const displayName = i == 0 ? 'Hub'
        : name.charAt(0).toUpperCase() + name.slice(1);

    /* Process the next path. */
    currPath = path.join(currPath, name);
    const thisPath = path.join(currPath, 'index.html');

    /* We need a separator. */
    if (i != 0)
      html += '<span class="breadcrumbs-sep"> / </span>\n';

    /* Add the html. */
    html += '<a class="breadcrumbs-path"'
         +  ' href="' + mdUtils.escapeHtml(thisPath) + '">'
         +  mdUtils.escapeHtml(displayName) + '</a>\n';
  }

  return html + '</div>\n';
}


/**
 * Generate JSON-LD used by crawlers.
 * @param doc The document info (output of sanitizeDocOptions).
 * @returns A JSON string.
 */
export function genJsonLdSeo(doc) {
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
      "url": `https://${config.SITE}`,
      "logo": `https://${config.SITE}/assets/img/icon-1024x1024.png`,
    },
  });
}


/**
 * Render a markdown document.
 * @param mdPath The markdown path.
 * @param mdContent The markdown content.
 * @returns An HTML string.
 */
export function renderDocument(mdPath, mdContent) {
  if (!mdPath.endsWith('.md'))
    return;

  /* Compile markdown to HTML. */
  const mdEnv = {};
  const htmlContent = renderMarkdown(mdContent, mdEnv);
  const opts = sanitizeDocOptions(mdEnv.meta);

  const servePath = mdPath.slice(0, -2) + 'html';

  /* Build the data scope. */
  const pageInfo = {
    ident:          genUIDForDocument(mdPath),
    srcPath:        mdPath,
    path:           servePath,
    canonical:      `http://${config.SITE}/${servePath}`,
    relRoot:        mdPath.replace(/[^\/]+/g, '..').slice(1) + '/',
    isIndex:        path.basename(mdPath) == 'index.md',
    contents:       mdEnv.toc,  /* markdown-it-gen-toc */

    /* doc metadata */
    thumbnail:      opts.thumbnail,
    title:          opts.title,
    about:          opts.about,
    published:      opts.published,
    updated:        opts.updated,
    tags:           opts.tags,
    authors:        opts.authors,
    prevPage:       opts.prev_page,
    nextPage:       opts.next_page,

    /* misc */
    layout:         opts.layout,
    absPaths:       opts.abs_paths,
    dontIndex:      opts.dont_index,
  };

  /* Some UI options. */
  const uiOpts = {
    noToc:          opts.no_toc,
    noSidebar:      opts.no_sidebar,
    noTrail:        opts.no_trail,
    noSearch:       opts.no_search,
    noPrint:        opts.no_print,
  };

  /* Template context. */
  const renderCtx = {
    srcName:        mdPath,
    mdContent:      mdContent,
    htmlContent:    htmlContent,

    pageInfo:       pageInfo,
    uiOpts:         uiOpts,
    config:         config,

    /* call these only when needed */
    genToc:         () => genTocHTML(mdEnv.toc),
    genJsonLd:      () => genJsonLdSeo(pageInfo),
    genTrail:       () => genTrail(mdPath, pageInfo.isIndex),
  };

  /* Indexing. */
  if (!pageInfo.dontIndex)
    updateDoc(pageInfo.ident, pageInfo, mdEnv.rawContent);
  else
    removeDoc(pageInfo.ident);

  /* Put into a template. */
  return renderText(locateTemplateForDoc(mdPath, opts.layout), renderCtx);
}


/**
 * Process document from fs. Read from src and save to dist.
 * @param mdPath The path to the markdown file to process.
 */
export async function processDocFromFS(mdPath) {
  const srcPath = path.join(config.SRC, mdPath);
  const destPath = path.join(config.OUT, mdPath.slice(0, -2) + 'html');

  const mdContent = await fs.readFile(srcPath, 'utf8');
  const finalHTML = renderDocument(mdPath, mdContent);
  await fs.writeFile(destPath, finalHTML, 'utf8');
}
