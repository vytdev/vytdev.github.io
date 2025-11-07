import MarkdownIt from 'markdown-it';
import katex from 'katex';
import matter from 'gray-matter';
import slugify from 'slugify';

/* external markdown plugins */
import md_anchor          from 'markdown-it-anchor';
import * as md_emoji      from 'markdown-it-emoji';
import md_footnote        from 'markdown-it-footnote';
import md_github_alerts   from 'markdown-it-github-alerts';
import md_mark            from 'markdown-it-mark';
import md_sub             from 'markdown-it-sub';
import md_sup             from 'markdown-it-sup';
import md_tasklist        from 'markdown-it-task-lists';
import md_texmath         from 'markdown-it-texmath';
import md_code_highlight  from './markdown-plugins/code-highlight.js';
import md_fix_links       from './markdown-plugins/fix-links.js';
import md_gen_toc         from './markdown-plugins/gen-toc.js';
import md_sections        from './markdown-plugins/sections.js';
import md_spoilers        from './markdown-plugins/spoilers.js';
import md_style_footnotes from './markdown-plugins/style-footnotes.js';
import md_wrap_tables     from './markdown-plugins/wrap-tables.js';


export const md = new MarkdownIt({
  linkify: true,
  typographer: true,
  html: true,
});


/**
 * Render a markdown file.
 * @param txt The markdown text.
 * @param [env] Optional env (for extra info).
 * @returns An HTML string.
 */
export function renderMarkdown(txt, env = {}) {
  const { data, content } = matter(txt);
  env.meta = data || {};
  env.rawContent = content;
  return md.render(content, env);
}


/* setup markdown-it plugins */

md.use(md_emoji.full);
md.use(md_footnote);
md.use(md_mark);
md.use(md_sub);
md.use(md_sup);
md.use(md_tasklist);

md.use(md_anchor, {
  slugify: slugify,
  tabIndex: false,
  permalink: md_anchor.permalink.linkInsideHeader({
    symbol: '&para;',
    placement: 'after',
  })
});

md.use(md_texmath, {
  engine: (x) => katex.renderToString(x, {
    throwOnError: false,
    output: 'html',
  }),
  delimiters: 'dollars',
});

md.use(md_github_alerts, {
  classPrefix: 'callout',
  markers: '*',
});

/* dedicated plugins */
md.use(md_code_highlight);
md.use(md_fix_links);
md.use(md_gen_toc);
md.use(md_sections);
md.use(md_spoilers);
md.use(md_style_footnotes);
md.use(md_wrap_tables);
