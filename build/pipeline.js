const path = require('path');
const fs = require('fs');
const nunjucks = require('nunjucks');
const config = require('../config.js');
const page = require('./page.js');
const jspack = require('./jspack.js');
const search = require('./search.js');
const util = require('./util.js');
const filters = require('./filters.js');


const njkEnv = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(config.SRC_DIR,
    { noCache: true, watch: true }),
  { autoescape: true });
exports.njkEnv = njkEnv;

filters.mixInFilters(njkEnv);


const print = (...args) => util.log('[gen]', ...args);


/**
 * Write a string to relPath at the output directory.
 * @param relPath The path relative to the output directory.
 * @param data The data to write.
 */
function writeToOutDir(relPath, data) {
  const outputName = path.join(config.OUT_DIR, relPath);
  fs.mkdirSync(path.dirname(outputName), { recursive: true });
  fs.writeFileSync(outputName, data, 'utf8');
}


/**
 * Emit all files.
 */
function emitAll() {
  print('emit ALL');

  /* Initialize the search index. */
  search.initIndexer();

  /* Process all files from the src folder. */
  util.listRecursiveSync(config.SRC_DIR).forEach(([ file, stat ]) => {
    emitSource(path.relative(config.SRC_DIR, file));
  });

  /* Emit all dynamic files. */
  emitDynamicFiles();
}


/**
 * Emit files from the src folder.
 * @param relPath The path of the file.
 */
function emitSource(relPath) {
  relPath = path.normalize(relPath);

  const srcPath = path.join(config.SRC_DIR, relPath);
  const stat = fs.statSync(srcPath);

  /* Source is a directory. */
  if (stat.isDirectory()) {
    fs.mkdirSync(path.join(config.OUT_DIR, relPath), { recursive: true });
    print('dir:', relPath);
    return;
  }

  /* Skip template files. */
  if (relPath.endsWith(config.TMPL_SUFFIX))
    return;

  /* Markdown docs. */
  if (relPath.endsWith('.md')) {
    page.renderMarkdownDocument(relPath);
    print('page:', relPath);
    return;
  }

  /* Static files. */
  fs.copyFileSync(srcPath, path.join(config.OUT_DIR, relPath));
  print('file:', relPath);
}


/**
 * Pack the client js source.
 */
function emitClientJs() {
  const outputName = path.join(config.OUT_DIR, config.CLIENT_OUTPUT);
  fs.mkdirSync(path.dirname(outputName), { recursive: true });
  jspack.packModules(
    config.CLIENT_JS_DIR,
    config.CLIENT_ENTRY,
    outputName
  );
  print('generated client-js');
}


/**
 * Generate the search index.
 */
function emitSearchIndex() {
  writeToOutDir(config.INDEX_SEARCH, 'var searchIndex = ' +
    util.serializeJSObject(search.createSearchIndex()));
  print('generated search index');
}


/**
 * Geerate the link index.
 */
function emitLinkIndex() {
  writeToOutDir(config.INDEX_LINKS, 'var linkIndex = ' +
    util.serializeJSObject(search.createLinkIndex()));
  print('generated link index');
}


/**
 * Generate the page data index.
 */
function emitPageDataIndex() {
  writeToOutDir(config.INDEX_PAGEDATA, 'var pageDataIndex = ' +
    util.serializeJSObject(search.createPageDataIndex()));
  print('generated page data index');
}


/**
 * Generate the indices.
 */
function emitIndices() {
  emitSearchIndex();
  emitLinkIndex();
  emitPageDataIndex();
}


/**
 * Generate the sitemap.
 */
function emitSitemap() {
  const data = {
    pages: Object.values(search.getStagedDocs()).map(v => ({
      lastUpdated: v.pageInfo.updated,
      urlLocation: v.pageInfo.canonical,
    }))
  };
  const pathName = path.join(config.SRC_DIR,
      config.SITEMAP_FILE + config.TMPL_SUFFIX);
  const result = njkEnv.render(pathName, data);
  writeToOutDir(config.SITEMAP_FILE, result);
  print('generated sitemap');
}


/**
 * Emit all the dynamically generated files, such as the client-js,
 * the search index, page data index, sitemap, etc.
 */
function emitDynamicFiles() {
  emitClientJs();
  emitIndices();
  emitSitemap();
}


module.exports = {
  njkEnv,
  writeToOutDir,
  emitAll,
  emitSource,
  emitClientJs,
  emitSearchIndex,
  emitLinkIndex,
  emitPageDataIndex,
  emitIndices,
  emitSitemap,
  emitDynamicFiles,
};
