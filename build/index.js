import fs from 'fs/promises';
import config from '../config.js';
import * as lsrv from './local-server.js';
import * as util from './util.js';

/* Clean-up callbacks after the user presses CTRL+C. */
const sigintTriggers = [];


/**
 * Show help and exit.
 */
if (has('--help', '-h')) {
  console.log(
    `${process.argv[1]} [options]\n` +
    '  -h  --help         Show this help and exit.\n' +
    '  -c  --clean        Perform workspace cleanup.\n' +
    '  -b  --build        Build the entire site.\n' +
    '  -w  --watch        Observe changes from the src folfer.\n' +
    '  -s  --serve        Start a local test server.\n' +
    '  -p  --pack         Create an archive of the current output.');
  process.exit(1);
}


/**
 * Delete the out dir.
 */
if (has('--clean', '-c')) {
  await fs.rm(config.OUT, {
    recursive: true,
    force: true,
  });
  util.log('Cleaned up everything');
}


/**
 * Do a complete build.
 */
// TODO


/**
 * Starts a local test server.
 */
if (has('--serve', '-s')) {
  const app = lsrv.createStaticApp(config.OUT);
  const srv = await lsrv.startServer(
       app, config.TEST_ADDRESS, config.TEST_PORT);
  sigintTriggers.push(() => lsrv.stopServer(srv));
}


/**
 * Build while editing.
 */
// TODO


/**
 * Ensure everything is done before continuing.
 */
await util.waitForSigInt(sigintTriggers);


/**
 * Create an archive of the generated output dir.
 */
// TODO


/**
 * Ensure we have already exited at this point.
 */
process.exit(0);

/**
 * Check whether at least one of the given flags is passed.
 * @param flags List of flags.
 * @returns True if one flag exists.
 */
function has(...flags) {
  return flags.some(flag => process.argv.includes(flag));
}
