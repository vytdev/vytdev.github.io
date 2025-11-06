import md_container from 'markdown-it-container';

/**
 * Support toggleable spoilers. Uses markdown-it-container under the hood.
 * @param md MarkdownIt instance.
 */
export default function markdownItSpoilers(md) {

  md_container(md, 'spoiler', {
    validate: (params) => {
      return /^spoiler(?:-opened)?\s+/.test(params.trim());
    },
    render: (tokens, idx) => {
      const tok = tokens[idx];

      if (tok.nesting === 1) {
        /* ::: spoiler Title here!
           OR
           ::: spoiler-opened Title here! */
        let data = tok.info.trim().slice('spoiler'.length);

        /* Whether the spoiler is initially opened. */
        let isOpen = false;
        if (data.startsWith('-opened')) {
          data = data.slice('-opened'.length);
          isOpen = true;
        }

        /* Get the title. */
        data = data.trimStart();
        const title = md.renderInline(data);

        return `<details${isOpen ? ' open' : ''}>\n` +
          `<summary>${title}</summary>\n`;
      }
      return `</details>\n`;
    },
  });

}
