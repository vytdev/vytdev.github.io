const lang = require('./search/lang.js');

/**
 * Parse URL queries.
 * @param url The URL string.
 * @returns The parse result.
 */
function parseUrlQueries(url) {
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
const query = parseUrlQueries(window.location.search);


/* Themes (and their media query). */
const THEMES = {
  auto: 'auto',
  light: 'light',
  dark: 'dark',
};


/**
 * Change the theme.
 * @param theme The theme to use.
 */
function changeTheme(theme) {
  localStorage.setItem('theme', theme);
  const classList = document.documentElement.classList;

  /* Remove the existing .theme-* classes. */ 
  Array.from(classList).forEach(v => {
    if (v.startsWith('theme-'))
      classList.remove(v);
  });

  /* Auto theme. */
  if (theme == THEMES.auto) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? THEMES.dark : THEMES.light;
  }

  /* Update the page theme. */
  classList.add(`theme-${theme}`);
}


/**
 * Get the current theme.
 * @returns The current theme.
 */
function getCurrTheme() {
  return localStorage.getItem('theme') || THEMES.auto;
}


/**
 * Initialize the theme.
 */
function initTheme() {
  changeTheme(getCurrTheme());

  /* Auto theme updates. */
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', ev => {
      if (getCurrTheme() == THEMES.auto)
        changeTheme(THEMES.auto);
    });
}


/**
 * Possible cookie consent states.
 */
const COOKIE_CONSENTS = {
  accepted: 'accepted',
  rejected: 'rejected',
  none: 'none',
};


/**
 * Get the current cookie consent state.
 * @returns The consent state.
 */
function getCookieConsent() {
  return localStorage.getItem('cookie-decision') ?? 'none';
}


/**
 * Set the current cookie state.
 * @param val The cookie state to set.
 */
function setCookieConsent(val) {
  localStorage.setItem('cookie-decision', val);
}


/**
 * Change the announcement.
 * @param infoHtml The announcement text in HTML.
 */
function changeAnnouncement(infoHtml) {
  const block = document.querySelector('.announcement-block');
  block.innerHTML = infoHtml;
  block.style.display = 'block';
}


/**
 * Hie the announcement.
 */
function hideAnnouncement() {
  document.querySelector('.announcement-block').style.display = 'none';
}


/**
 * Highlight the terms from a node.
 * @param text The terms.
 * @param node The node.
 */
function highlight(text, node) {
  const words = lang.normalize(text).split(/\s+/g);

  /* A text node. */
  if (node.nodeType == document.TEXT_NODE) {

    /* Already highlighted or is nohighlight? */
    if (node.parentNode.classList.contains('highlight') ||
      node.parentNode.classList.contains('nohighlight'))
      return;

    const org = node.nodeValue;
    const norm = lang.normalize(org);

    /* Match and highlight words. */
    for (const term of words) {
      const idx = norm.indexOf(term);
      const len = term.length;

      if (idx < 0)
        continue;

      /* Fix: highlighting hangul was weird */
      const map = [];
      for (let i = 0; i < org.length; i++) {
        const chLen = lang.normalize(org[i]).length;
        for (let j = 0; j < chLen; j++)
          map.push(i);
      }

      const start = map[idx];
      const end = map[idx + len - 1] + 1;
      const before = org.slice(0, start);
      const match = org.slice(start, end);
      const after = org.slice(end);

      /* The node containing the highlight text. */
      const span = document.createElement('span');
      span.className = 'highlight';
      span.appendChild(document.createTextNode(match));

      /* <orig node> + <highlight> + <next nodes> */
      const afterNode = document.createTextNode(after);
      node.parentNode.insertBefore(span, node.nextSibling);
      node.parentNode.insertBefore(afterNode, span.nextSibling);
      node.nodeValue = before;

      highlight(text, node.parentNode);
      break;
    }

    return;
  }

  /* Exclude button, select, textarea, and svg elements. */
  if (node.tagName == 'BUTTON' || node.tagName == 'SELECT' ||
      node.tagName == 'TEXTAREA' || node.tagName == 'SVG')
    return;

  /* iterate through child nodes. */
  for (let i = 0; i < node.childNodes.length; i++)
    highlight(text, node.childNodes[i]);
}


/**
 * Remove highlights from a node.
 * @param node The node where to remove all 'span.highlight'.
 */
function unHighlight(node) {
  if (node.tagName == 'SPAN' && node.classList.contains('highlight')) {
    const prev = node.previousSibling;
    const next = node.nextSibling;
    const parent = node.parentNode;
    let text = '';
    let branch = node;

    /* If the prev node is a text, coalesce. */
    if (prev && prev.nodeType == document.TEXT_NODE) {
      branch = prev;
      text += prev.nodeValue;
    }

    /* Add the current node text. */
    text += node.childNodes[0].nodeValue;

    /* Coalesce the following text node. */
    if (next && next.nodeType == document.TEXT_NODE) {
      parent.removeChild(next);
      text += next.nodeValue;
    }

    /* Create the final text node, and done. */
    parent.insertBefore(document.createTextNode(text), branch);
    parent.removeChild(node);
    if (prev) { parent.removeChild(prev); }

    return;
  }

  /* This is a root node. Process each child node. */
  let len = node.childNodes.length;
  let last;
  for (let i = 0; i < len; i++) {
    const child = node.childNodes[i];
    if (child.nodeType != document.ELEMENT_NODE) { continue; }
    unHighlight(child);

    /* The node length might change if we remove highlights from them. */
    len = node.childNodes.length;
    if (len != last) {
      i = 0;
      last = len;
    }
  }
}


/**
 * Fetch a string of text from a URL through XMLHttpRequest.
 * @param url The url where to fetch the string.
 * @returns A Promise which you can extend.
 */
function fetchText(url) {
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
function loadScript(url, extras = {}) {
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
function parsePartHTML(htmlText) {
  const tmp = document.createElement('div');
  tmp.innerHTML = htmlText;
  return tmp.firstChild;
}


/**
 * Parse a full HTML object.
 * @param htmlText The full HTML.
 * @returns HTMLDocument object.
 */
function parseFullHTML(htmlText) {
  return new DOMParser().parseFromString(htmlText, 'text/html');
}


/**
 * Escape HTML from string.
 * @param text The text.
 * @returns The escaped HTML.
 */
function escapeHTML(text) {
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
function asyncSleep(n) {
  return new Promise(res => setTimeout(res, n));
}


exports = module.exports = {
  parseUrlQueries,
  query,

  /* Themes. */
  THEMES,
  changeTheme,
  getCurrTheme,
  initTheme,

  /* Cookie consents. */
  COOKIE_CONSENTS,
  getCookieConsent,
  setCookieConsent,

  /* Announcements. */
  changeAnnouncement,
  hideAnnouncement,

  /* Extra utils. */
  highlight,
  unHighlight,
  fetchText,
  loadScript,
  parsePartHTML,
  parseFullHTML,
  escapeHTML,
  asyncSleep,
};
