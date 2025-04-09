const fs = require('fs');
const path = require('path');


/**
 * Recursively list files in a directory.
 * @param dir The directory path.
 * @returns Array of pairs of files/directories with their stat.
 */
function listRecursiveSync(dir) {
  const dirStat = fs.statSync(dir);
  if (!dirStat.isDirectory())
    return;

  let results = [ [dir, dirStat] ];

  /* Read all files and directories in the curreny directory. */
  const list = fs.readdirSync(dir);

  /* Iterate through each file. */
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    /* If file is a directory, recursively list its contents. */
    if (stat.isDirectory()) {
      results = results.concat(listRecursiveSync(fullPath));
      return;
    }

    /* Push the file and its stat. */
    results.push([ fullPath, stat ]);
  });

  return results;
}


/**
 * Check if a path is a normal file.
 * @param path The path to check.
 * @returns True if the path is a normal file.
 */
function isNormFile(path) {
  return fs.existsSync(path) && fs.statSync(path).isFile();
}


/**
 * Create Date string for logging.
 * @returns The current date.
 */
function getLogDate() {
  const c = new Date();
  const year = c.getFullYear();
  const month = c.getMonth() + 1;
  const day = c.getDate();
  const hour = c.getHours();
  const min = c.getMinutes();
  const sec = c.getSeconds();
  const ms = c.getMilliseconds();
  return (
    year  .toString().padStart(4, '0') + '-' +
    month .toString().padStart(2, '0') + '-' +
    day   .toString().padStart(2, '0') + ' ' +
    hour  .toString().padStart(2, '0') + ':' +
    min   .toString().padStart(2, '0') + ':' +
    sec   .toString().padStart(2, '0') + '.' +
    ms    .toString().padStart(3, '0')
  );
}


/**
 * Log to terminal.
 * @param msg... The msgs to log.
 */
function log(...msg) {
  console.log(getLogDate() + ' ' + msg.join(' '));
}


/**
 * Get the FNV-1a hash of a string.
 * @param str The string.
 * @returns The hash.
 */
function strFnv1a(str) {
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
 * Encode a number to base-62.
 * @param num The number.
 * @returns The encoded string.
 */
function encBase62(num) {
  const charset = "0123456789" +
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
      "abcdefghijklmnopqrstuvwxyz";
  let res = '';

  if (num == 0)
    return '0';

  while (num) {
    const rem = num % 62;
    num = Math.floor(num / 62);
    res += charset[rem];
  }
  return res;
}


/**
 * Check whether a string is a valid date format that we use.
 * @param str The string to check if it follows YYYY-MM-DD.
 * @returns True if it does.
 */
function isValidDateFmt(str) {
  return /\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[0-1])/.test(str);
}


/**
 * Remove duplicates from an array.
 * @param arr The array.
 * @returns An array with duplicates removed.
 */
function removeDuplicatesFromArr(arr) {
  return [ ... new Set(arr) ];
}


module.exports = {
  listRecursiveSync,
  isNormFile,
  getLogDate,
  log,
  strFnv1a,
  encBase62,
  isValidDateFmt,
  removeDuplicatesFromArr,
};
