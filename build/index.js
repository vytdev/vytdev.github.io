import fs from 'fs/promises';
import config from '../config.js';
import * as util from './util.js';


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
 * Clean flag.
 */
if (has('--clean', '-c')) {
  await fs.rm(config.OUT, {
    recursive: true,
    force: true,
  })
  util.log('Cleaned up everything')
}


/**
 * Check whether at least one of the given flags is passed.
 * @param flags List of flags.
 * @returns True if one flag exists.
 */
function has(...flags) {
  return flags.some(flag => process.argv.includes(flag));
}
