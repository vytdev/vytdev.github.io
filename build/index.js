const args = require('mri')(process.argv.slice(2));
const fs = require('fs');
const config = require('../config.js');

/* TODO: refactor these.. */

/* Help flag. */
if (args.h || args.help) {
  showHelp();
  process.exit(1);
}

/* Clean flag. */
if (args.c || args.clean) {
  fs.rmSync(config.OUT_DIR, {
    recursive: true,
    force: true,
  });
  console.log('Clean-up finished.');
}

/* Build flag. */
if (args.b || args.build) {
  require('./emit.js').emitAll();
  require('./jspack.js').packClientJs();
  console.log('Build complete!');
}

/* Deploy flag. */
if (args.d || args.deploy) {
  const commitHash = require('child_process')
    .execSync('git rev-parse --short HEAD')
    .toString()
    .trim();
  require('gh-pages').publish(config.OUT_DIR, {
    branch: 'gh-pages',
    repo: 'https://github.com/vytdev/vytdev.github.io.git',
    message: `deploy ${commitHash}`,
  });
}

/* Watch flag. */
if (args.w || args.watch) {
  const watcher = require('./watcher.js');
  watcher.startWatching();
}

/* Pack flag. */
if (args.p || args.pack) {
  /* Packing logic here. */
}

/* Serve flag. */
if (args.s || args.serve) {
  const test = require('./test.js');
  const app = test.createStaticApp(config.OUT_DIR);
  test.startServer(app, config.TEST_ADDRESS, config.TEST_PORT);
}


/**
 * Show help message.
 */
function showHelp() {
  console.error(`tool [options...]
  -b, --build     Build the site.
  -c, --clean     Perform some cleanups.
  -d, --deploy    Deploy the built site to GitHub Pages.
  -h, --help      Show this help and exit.
  -p, --pack      Create an archive package of the site.
  -w, --watch     Watch changes from ${config.SRC_DIR} directory.
  -s, --serve     Create a local server deployment.`);
}
