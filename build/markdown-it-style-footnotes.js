/**
 * Just a style fix to the footnote block.
 * @param md MarkdownIt instance.
 */
export default function markdownItStyleFootnotes(md) {
  md.renderer.rules.footnote_block_open = () =>
    '<div class="footnotes">\n<ol class="footnotes-list">\n';

  md.renderer.rules.footnote_block_close = () =>
  '</ol></div>\n';
}
