/**
 * Wrap tables to prevent horizontal overflow. Requires css.
 * @param md MarkdownIt instance.
 */
export default function markdownItWrapTables(md) {
  md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
    '<div class="table-container">\n' + self.renderToken(tokens, idx, options);

  md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
    self.renderToken(tokens, idx, options) + '\n</div>';
}
