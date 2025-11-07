import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';
import { processDocFromFS } from './page.js';
import { bundleOnce as jsBundleOnce } from './js-bundler.js';
import * as util from './util.js';


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
  const tasks = [];
  for await (const [fpath, stat] of util.listRecursively(config.SRC))
    tasks.push(emitFromSrc(path.relative(config.SRC, fpath), stat));
  tasks.push(jsBundleOnce());
  return Promise.all(tasks);
}


// TODO: sitemap and indices
