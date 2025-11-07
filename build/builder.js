import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';
import { processDocFromFS } from './page.js';
import { bundleOnce as jsBundleOnce } from './js-bundler.js';
import { makeSearchIndex, makeInfoIndex, getRecord } from './search.js';
import * as util from './util.js';
import { renderText } from './templating.js';


/**
 * Emit a file from the src folder.
 * @param relPath The path of the file relative to the src folder.
 * @param [stat] Optional stat of relPath if you already have it.
 */
export async function emitFromSrc(relPath, stat) {
  relPath = path.normalize(relPath);
  const srcPath = path.join(config.SRC, relPath);

  if (!stat)
    stat = await fs.stat(srcPath);

  /* create a folder */
  if (stat.isDirectory()) {
    await fs.mkdir(path.join(config.OUT, relPath), {recursive: true});
    util.log('dir:', relPath);
    return;
  }

  /* skip template files */
  if (relPath.endsWith(config.TMPL_SUFFIX))
    return;

  /* markdown document files */
  if (relPath.endsWith('.md')) {
    await processDocFromFS(relPath);
    util.log('doc:', relPath);
    return;
  }

  /* other static files */
  await fs.copyFile(srcPath, path.join(config.OUT, relPath));
  util.log('file:', relPath);
}


/**
 * Build everything from src folder.
 */
export async function buildSource() {
  let tasks = [];
  for await (const [fpath, stat] of util.listRecursively(config.SRC))
    tasks.push(emitFromSrc(path.relative(config.SRC, fpath), stat));
  await Promise.all(tasks);

  tasks = [];
  tasks.push(jsBundleOnce());
  tasks.push(genInfoIndex());
  tasks.push(genSearchIndex());
  tasks.push(genSiteMap());
  await Promise.all(tasks);
}


/**
 * Write text to output directory.
 * @param loc Path relative to the serving root.
 * @param cont What to write.
 */
export async function writeToOut(loc, cont) {
  await fs.writeFile(path.join(config.OUT, loc), cont, 'utf8');
}


/**
 * Build info index.
 */
export async function genInfoIndex() {
  await writeToOut(config.INFO_INDEX,
      'var infoIndex = ' + util.serializeJSObject(makeInfoIndex()));
  util.log('Created info index:', config.INFO_INDEX);
}


/**
 * Build search index.
 */
export async function genSearchIndex() {
  await writeToOut(config.SEARCH_INDEX, 
      'var searchIndex = ' + util.serializeJSObject(makeSearchIndex()));
  util.log('Created search index:', config.SEARCH_INDEX);
}


/**
 * Generate sitemap.
 */
export async function genSiteMap() {
  const data = {
    pages: Object.values(getRecord()).map(v => ({
      lastUpdated: v.pageInfo.updated,
      urlLocation: v.pageInfo.canonical,
    }))
  };

  const result = renderText(
      path.join(config.SRC, config.SITEMAP_FILE + config.TMPL_SUFFIX), data);
  await writeToOut(config.SITEMAP_FILE, result);
  util.log('Created sitemap:', config.SITEMAP_FILE);
}
