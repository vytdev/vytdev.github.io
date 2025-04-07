const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const config = require('../config.js');
const emit = require('./emit.js');
const util = require('./util.js');


/**
 * Start watching the src folder.
 * @returns A chokidar event watcher instance.
 */
function startWatching() {
  const watcher = chokidar.watch(config.SRC_DIR, {
      persistent: true,
    });

  watcher.on('ready', () =>
    util.log('[watch] Ready to rock.'));

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


module.exports = { startWatching };
