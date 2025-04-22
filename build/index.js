const args = require('mri')(process.argv.slice(2));
const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const pipeline = require('./pipeline.js');


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
if (args.b || args.build || args.w || args.watch) {
  pipeline.emitAll();
  console.log('Build complete!');
}


/* Deploy flag. */
if (args.d || args.deploy) {
  const commitHash = require('child_process')
    .execSync('git rev-parse --short HEAD')
    .toString().toLowerCase().trim();

  console.log(`Commit hash: ${commitHash}`);

  require('gh-pages').publish(config.OUT_DIR, {
    branch: 'site',
    message: `deploy: ${commitHash}`,
  });
}


/* Watch flag. */
if (args.w || args.watch) {
  const watcher = require('./watcher.js');
  watcher.startWatching();
}


/* Pack flag. */
if (args.p || args.pack) {
  const JSZip = require("jszip");

  async function zipFolder(folderPath, outPath) {
    const zip = new JSZip();

    function addDirToZip(zipObj, folder) {
      const items = fs.readdirSync(folder);
      for (const item of items) {
        const fullPath = path.join(folder, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const subFolder = zipObj.folder(item);
          addDirToZip(subFolder, fullPath);
        } else {
          const data = fs.readFileSync(fullPath);
          zipObj.file(item, data);
        }
        console.log(`pack: ${fullPath}`);
      }
    }

    addDirToZip(zip, folderPath);

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(outPath, content);
  }

  zipFolder(config.OUT_DIR, `${config.SITE_ADDRESS}.zip`)
    .then(() => console.log('Zipped!'))
    .catch(console.error);
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
