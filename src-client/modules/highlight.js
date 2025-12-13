import * as nlp  from '../../build/nlp.js';

/**
 * Highlight the terms from a node.
 * @param text The terms.
 * @param node The node.
 */
export function highlight(text, node) {
  const words = nlp.normalize(text).split(/\s+/g);

  /* A text node. */
  if (node.nodeType == document.TEXT_NODE) {

    /* Already highlighted or is nohighlight? */
    if (node.parentNode.classList.contains('highlight') ||
      node.parentNode.classList.contains('nohighlight'))
      return;

    const org = node.nodeValue;
    const norm = nlp.normalize(org);

    /* Match and highlight words. */
    for (const term of words) {
      const idx = norm.indexOf(term);
      const len = term.length;

      if (idx < 0)
        continue;

      /* Fix: highlighting hangul was weird */
      const map = [];
      for (let i = 0; i < org.length; i++) {
        const chLen = nlp.normalize(org[i]).length;
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
export function unHighlight(node) {
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
