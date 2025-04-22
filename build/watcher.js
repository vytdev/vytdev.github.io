const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const config = require('../config.js');
const util = require('./util.js');
const pipeline = require('./pipeline.js');
const search = require('./search.js');
const page = require('./page.js');


/**
 * Start watching the src folder.
 * @returns A chokidar event watcher instance.
 */
function startWatchingSrc() {
  const watcher = chokidar.watch(config.SRC_DIR, {
      persistent: true,
    });

  let isReady = false;

  watcher.on('ready', () => {
    isReady = true;
    util.log(`[watch] Ready to rock. (${config.SRC_DIR})`);
  });

  watcher.on('all', (ev, p) => {
    if (!isReady || ev == 'ready')
      return;

    const relPath = path.relative(config.SRC_DIR, p);

    /* Create, modify, new folder, etc. */
    if ([ 'add', 'addDir', 'change' ].includes(ev)) {
      pipeline.emitSource(relPath);
    }

    /* Delete, move, rename, etc. */
    if ([ 'unlink', 'unlinkDir' ].includes(ev)) {
      fs.rmSync(path.join(config.OUT_DIR, relPath), {
        recursive: true,
        force: true
      });
      if (p.endsWith('.md'))
        search.rmRecord(page.getUidForDoc(relPath));
    }

    /* Update the sitemap and indices. */
    if (p.endsWith('.md')) {
      pipeline.emitIndices();
      pipeline.emitSitemap();
    }

    util.log(`[watch] ${ev}: ${relPath}`);
  });

  return watcher;
}


/**
 * Start watching the client-js src folder.
 * @returns A chokidar event watcher instance.
 */
function startWatchingClientJsSrc() {
  const watcher = chokidar.watch(config.CLIENT_JS_DIR, {
      persistent: true,
    });

  let isReady = false;

  watcher.on('ready', () => {
    isReady = true;
    util.log(`[watch] Ready to rock. (${config.CLIENT_JS_DIR})`);
  });

  watcher.on('all', (ev, p) => {
    if (!isReady || ev == 'ready')
      return;

    const relPath = path.relative(config.SRC_DIR, p);

    pipeline.emitClientJs();
    util.log(`[watch] ${ev}: ${relPath}`);
  });

  return watcher;
}


/**
 * Start watching all source folders.
 */
function startWatching() {
  startWatchingSrc();
  startWatchingClientJsSrc();
}


module.exports = {
  startWatchingSrc,
  startWatchingClientJsSrc,
  startWatching,
};
