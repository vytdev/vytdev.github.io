import hljs from 'highlight.js';

/**
 * Custom highlighting function, better CSS.
 * @param md MarkdownIt instance.
 * @param [opts] Options to pass to highlight.js
 */
export default function markdownItCodeHighlight(md, opts) {

  /**
   * @interal
   * Highlight code blocks.
   * @param str The raw code text.
   * @param lang The language of the code.
   * @returns HTML string.
   */
  function highlightCode(str, lang) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(str, opts || {
            language: lang,
            ignoreIllegals: true,
          }).value;
      }
    } catch {}
    return md.utils.escapeHtml(str);
  }

  md.renderer.rules.fence = (tokens, idx) => {
    const tok = tokens[idx];
    const lang = tok.info.trim();
    const codeHtml = highlightCode(tok.content, lang);
    return `<div class="snippet hljs lang-${lang}">${codeHtml}</div>`;
  };
}
