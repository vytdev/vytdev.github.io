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
