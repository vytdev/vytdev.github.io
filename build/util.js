import { existsSync, statSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';

/**
 * Let the user know what have just happened, and what is currently happening.
 * @param msg Your log.
 */
export function log(...msg) {
  console.log(getLogTime() + ' ' + msg.map(String).join(' '));
}


/**
 * Make a log time text.
 * @returns The time.
 */
export function getLogTime() {
  const c = new Date();
  const hour = c.getHours();
  const min = c.getMinutes();
  const sec = c.getSeconds();
  const ms = c.getMilliseconds();
  return ('['+
      hour  .toString().padStart(2, '0') + ':' +
      min   .toString().padStart(2, '0') + ':' +
      sec   .toString().padStart(2, '0') + '.' +
      ms    .toString().padStart(3, '0')
    +']');
}


/**
 * Compute the FNV-1a hash of a string.
 * @param str The string.
 * @returns The hash.
 */
export function strFnv1a(str) {
  const buf = new TextEncoder('utf-8').encode(str);
  const fnvPrime = 0x811C9DC5;
  let hash = 0;

  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    hash ^= b;
    hash *= fnvPrime;
    hash &= 0xFFFFFFFF;
  }

  return hash >>> 0;
}


/**
 * Encode `num` to `base`.
 * @param num The number.
 * @param [base] The base (1 to 62)
 * @returns The encoded string.
 */
export function encodeNumber(num, base = 62) {
  const charset = '0123456789' +
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz';
  let res = '';

  if (num == 0)
    return '0';
  if (base < 1 || base > 62)
    base = 10;

  while (num) {
    const rem = num % base;
    num = Math.floor(num / base);
    res += charset[rem];
  }
  return res;
}

/**
 * Check whether a string followa the format YYYY-MM-DD.
 * @param str The string to check.
 * @returns Either true or false.
 */
export function isValidDateFmt(str) {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[0-1])$/.test(str);
}


/**
 * Remove duplicates from a array.
 * @param arr The array with duplicaes.
 * @returns Array without duplicates.
 */
export function removeDuplicatesFromArr(arr) {
  return [...new Set(arr)];
}


/**
 * Runs a set of async function when user presses CTRL+C.
 * @param callbacks The funcs.
 * @returns A Promise.
 * @throws When one of the callbacks fails.
 */
export async function waitForSigInt(callbacks) {
  if (callbacks.length == 0)
    return;

  return new Promise((res, rej) => {
    const handler = () => {
      Promise.all(callbacks.map(cb => cb())).catch(rej);
      log('User interrupted');
      process.off('SIGINT', handler);
      res();
    };
    process.on('SIGINT', handler);
  });
}


/**
 * Checks whether a path points to a normal file.
 * @param path The path to check.
 * @returns True if it is a file. False if not.
 */
export function isNormFile(path) {
  return existsSync(path) && statSync(path).isFile();
}


/**
 * Recursively iterate through all files and dirs inside a directory.
 * @param dir Path to the root directory.
 * @param [dirStat] To prevent redundant calls to fs.stat() if you already
 * have it.
 * @yields A tuple of [path, stat].
 */
export async function* listRecursively(dir, dirStat) {
  if (!dirStat)
    dirStat = await fs.stat(dir);
  if (!dirStat.isDirectory())
    return;

  yield [dir, dirStat];

  /* Iterate through each file. */
  for (const file of await fs.readdir(dir)) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory())
      yield* listRecursively(fullPath, stat);
    else
      yield [ fullPath, stat ];
  }
}
