const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const config = require('../config.js');
const emit = require('./emit.js');
const util = require('./util.js');
const jspack = require('./jspack.js');


/**
 * Start watching the src folder.
 * @returns A chokidar event watcher instance.
 */
function startWatchingSrc() {
  const watcher = chokidar.watch(config.SRC_DIR, {
      persistent: true,
    });

  watcher.on('ready', () =>
    util.log(`[watch] Ready to rock. (${config.SRC_DIR})`));

  watcher.on('all', (ev, p) => {
    if (ev == 'ready')
      return;

    const relPath = path.relative(config.SRC_DIR, p);

    /* Create, modify, new folder, etc. */
    if ([ 'add', 'addDir', 'change' ].includes(ev))
      emit.emitFile(relPath);

    /* Delete, move, rename, etc. */
    if ([ 'unlink', 'unlinkDir' ].includes(ev))
      fs.rmSync(path.join(config.BUILD_DIR, relPath), {
        recursive: true,
        force: true
      });

    util.log(`[watch] ${ev}: ${p}`);
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

  watcher.on('ready', () =>
    util.log(`[watch] Ready to rock. (${config.CLIENT_JS_DIR})`));

  watcher.on('all', (ev, p) => {
    if (ev == 'ready')
      return;

    jspack.packClientJs();
    util.log(`[watch] ${ev}: ${p}`);
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
