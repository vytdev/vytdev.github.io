import chokidar from 'chokidar';
import path from 'path';
import { rmSync } from 'fs';
import config from '../config.js';
import * as util from './util.js';
import { emitFromSrc, genInfoIndex, genSearchIndex, genSiteMap } from './builder.js';
import { removeDoc } from './search.js';
import { genUIDForDocument } from './page.js';

let watchCtx;


/**
 * Start watching the src folder.
 * Use 'stopWatching()' to stop.
 */
export async function startWatching() {
  if (watchCtx)
    throw new Error('There is already an active source watcher');

  return new Promise((res) => {

    watchCtx = chokidar.watch(config.SRC, {
        persistent: true,
      });

    let isReady = false;

    watchCtx.on('ready', () => {
      isReady = true;
      util.log('Started long-running source watcher');
      res();
    });

    watchCtx.on('all', (ev, p) => {
      if (!isReady || ev == 'ready')
        return;

      const relPath = path.relative(config.SRC, p);

      /* Create, modify, new folder, etc. */
      if ([ 'add', 'addDir', 'change' ].includes(ev))
        emitFromSrc(relPath);

      /* Delete, move, rename, etc. */
      if ([ 'unlink', 'unlinkDir' ].includes(ev)) {
        rmSync(path.join(config.OUT, relPath), {
          recursive: true,
          force: true
        });
        if (p.endsWith('.md'))
          removeDoc(genUIDForDocument(relPath));
      }

      /* Update the sitemap and indices. */
      if (p.endsWith('.md')) {
        genInfoIndex();
        genSearchIndex();
        genSiteMap();
      }

      util.log(`watch: ${ev}: ${relPath}`);
    });

  });
}


/**
 * Stop the watcher, currently if active.
 */
export async function stopWatching() {
  if (!watchCtx)
    return;
  await watchCtx.close();
  watchCtx = null;
  util.log('Stopped long-running source watcher');
}
