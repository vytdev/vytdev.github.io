import md_container from 'markdown-it-container';
import * as util from '../util.js';

/**
 * Support custom sections. Uses markdown-it-container under the hood.
 * @param md MarkdownIt instance.
 */
export default function markdownItSections(md) {

  md_container(md, 'section', {
    render: (tokens, idx) => {
      const tok = tokens[idx];

      if (tok.nesting === 1) {
        /* ::: section Title here */
        const rawTitle = tok.info.trim()
            .slice('section'.length).trimStart();
        const title = md.renderInline(rawTitle);
        const id = util.slugify(rawTitle);

        return `<div class="section" id="${id}"><div class="section-title"\n` +
          '  onclick="this.parentElement.toggleAttribute(\'data-open\')">\n' +
          `${title}\n</div><div class="section-content">\n`;
      }
      return `</div></div>\n`;
    }
  });

}
