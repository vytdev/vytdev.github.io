/**
 * Generate a table-of-contents and store it into env. Requires
 * markdown-it-anchor to be enabled.
 * @param md MarkdownIt instance.
 */
export default function markdownItGenTOC(md) {

  md.core.ruler.push('generate_toc', (state) => {
    const tokens = state.tokens;
    const toc = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.slice(1)); /* h1 -> 1 */
        const content = md.renderInline(tokens[i + 1].content);

        /* markdown-it-anchor adds an ID to the token attrs. */
        const idAttr = token.attrs?.find(attr => attr[0] === 'id');
        const id = idAttr ? idAttr[1] : undefined;

        toc.push({ level, content, id });
      }
    }

    state.env.toc = toc;
  });

}


/**
 * Helper function to generate HTML from the TOC object.
 * @param toc The table of contents object.
 * @param [maxLvl] The maximum nest level to process.
 * @returns The html string.
 */
export function genTocHTML(toc, maxLvl = 2) {

  /* Wrapper function to generate each level. */
  function genLvl(toc, lvl) {
    if (lvl > maxLvl) {
      while (toc[0] && toc[0].level > maxLvl)
        toc.shift();
      return '';
    }

    let outStr = '<div class="toc-list">\n';
    let curr = toc.shift();

    while (curr && curr.level >= lvl) {
      outStr += '<div class="toc-item"><a href="#';
      outStr += md.utils.escapeHtml(curr.id);
      outStr += '">';
      outStr += curr.content;
      outStr += '</a>';
      curr = toc[0];
      if (curr?.level > lvl)
        outStr += genLvl(toc, lvl + 1);
      curr = toc.shift();
      outStr += '</div>\n';
    }

    toc.unshift(curr);
    outStr += '</div>';
    return outStr;
  }

  return '<div class="toc">' + genLvl([...toc], 1) + '</div>';
}
