/**
 * Parse URL queries.
 * @param url The URL string.
 * @returns The parse result.
 */
export function parseUrlQueries(url) {
  const qIdx = url.indexOf('?');
  const hIdx = url.indexOf('#');

  /* .../path?q=a&r=b#hash */
  if (qIdx == -1 || (hIdx > -1 && qIdx > hIdx))
    return {};
  const searchPart = url.slice(qIdx, hIdx > -1 ? hIdx : undefined);

  /* Here we parse the query string. */
  const pairs = searchPart.slice(1).split('&');
  const result = {};

  const dec = (x) => decodeURIComponent((x || '').replace(/\+/g, ' '));
  for (let i = 0; i < pairs.length; i++) {
    const [key, val] = pairs[i].split('=');
    result[dec(key)] = dec(val);
  }

  return result;
}


/* Parse the current URL queries. */
export const query = parseUrlQueries(window.location.search);


/**
 * Fetch a string of text from a URL through XMLHttpRequest.
 * @param url The url where to fetch the string.
 * @returns A Promise which you can extend.
 */
export function fetchText(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    /* onload event handler. */
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };

    /* onerror event handler. */
    xhr.onerror = function() {
      reject(new Error('Request failed'));
    };

    xhr.send();
  });
}


/**
 * Load a script.
 * @param url The url to the script.
 * @param [extras] Other extra options.
 * @returns A Promise.
 */
export function loadScript(url, extras = {}) {
  return new Promise((res, rej) => {
    const sc   = document.createElement('script');
    sc.type    = 'text/javascript';
    sc.src     = url;
    sc.onload  = v => res(v);
    sc.onerror = v => rej(v);
    sc.onabort = v => rej(v);

    /* Allow some extra options. */
    const allowedAttrs = [
        'async', 'defer', 'integrity', 'crossOrigin',
        'charset', 'nonce', 'referrerPolicy', 'type'
      ];
    for (const k in extras) {
      if (k.startsWith('data-'))
        sc.setAttribute(k, extras[k]);
      else if (allowedAttrs.includes(k))
        sc[k] = extras[k];
    }

    /* Load the script. */
    document.head.appendChild(sc);
  });
}


/**
 * Parse an HTML from text. (not HTMLDocument object)
 * @param htmlText The HTML text.
 * @returns The instance of the first root child.
 */
export function parsePartHTML(htmlText) {
  const tmp = document.createElement('div');
  tmp.innerHTML = htmlText;
  return tmp.firstChild;
}


/**
 * Parse a full HTML object.
 * @param htmlText The full HTML.
 * @returns HTMLDocument object.
 */
export function parseFullHTML(htmlText) {
  return new DOMParser().parseFromString(htmlText, 'text/html');
}


/**
 * Escape HTML from string.
 * @param text The text.
 * @returns The escaped HTML.
 */
export function escapeHTML(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;');
}


/**
 * Sleep by `n` milliseconds.
 * @param n The sleep time.
 * @returns A Promise resolved after the timeout.
 */
export function asyncSleep(n) {
  return new Promise(res => setTimeout(res, n));
}


/**
 * Creates an empty object.
 * @returns Object.create(null).
 */
export function createEmptyObj() {
  return Object.create(null);
}
