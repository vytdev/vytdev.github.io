/* Themes (and their media query). */
exports.THEMES = {
  auto: '(prefers-color-scheme: dark)',
  light: 'not all',
  dark: 'all',
};

/**
 * Change the theme.
 * @param theme The theme to use.
 */
exports.changeTheme = function(theme) {
  document.getElementById('dark-theme').media = theme;
}

/**
 * Highlight the terms from a node.
 * @param text The terms.
 * @param node The node.
 */
exports.highlight = function(text, node) {
  const words = text.normalize('NFD').toLowerCase().split(/\s+/g);

  /* A text node. */
  if (node.nodeType == document.TEXT_NODE) {

    /* Already highlighted or is nohighlight? */
    if (node.parentNode.classList.contains('highlight') ||
      node.parentNode.classList.contains('nohighlight'))
    { return; }

    const org = node.nodeValue,
      lower = org.normalize('NFD').toLowerCase();

    /* Match and highlight words. */
    for (let i = 0; i < words.length; i++) {
      const term = words[i];
      const idx = lower.indexOf(term);

      if (idx < 0) { continue; }
      const len = term.length;

      /* Setup a highlight container. */
      const span = document.createElement('span');
      span.className = 'highlight';
      span.appendChild(document.createTextNode(org.substring(idx, idx + len)));

      /* Highlight. */
      node.parentNode.insertBefore(span, node.parentNode.insertBefore(
        document.createTextNode(org.substring(idx + len)),
        node.nextSibling));
      node.nodeValue = org.substring(0, idx);

      exports.highlight(text, node.parentNode);
      break;
    }

    return;
  }

  /* Exclude button, select, textarea, and svg elements. */
  if (node.tagName == 'BUTTON' || node.tagName == 'SELECT' ||
      node.tagName == 'TEXTAREA' || node.tagName == 'SVG')
  { return; }

  /* iterate through child nodes. */
  for (let i = 0; i < node.childNodes.length; i++) {
    exports.highlight(text, node.childNodes[i]);
  }
}


/**
 * Remove highlights from a node.
 * @param node The node where to remove all 'span.highlight'.
 */
exports.unHighlight = function(node) {
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
    exports.unHighlight(child);

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
exports.fetchText = function(url) {
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
