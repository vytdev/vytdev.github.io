const config = require('../config.js');
const hljs = require('highlight.js');
const yaml = require('js-yaml');
const katex = require('katex');
const mdItAnchor = require('markdown-it-anchor');
const mdContainer = require('markdown-it-container');


const md = require('markdown-it')({
    html:         true,
    linkify:      true,
    typographer:  true,
    langPrefix:   "lang-",
    highlight:    mdHighlightFunc,
  });

/* General extensions for markdown. */
md.use(require('markdown-it-sub'));
md.use(require('markdown-it-sup'));
md.use(require('markdown-it-mark'));
md.use(require('markdown-it-footnote'));
md.use(require('markdown-it-deflist'));
md.use(require('markdown-it-task-lists'));
md.use(require('markdown-it-abbr'));

/* Emojis. */
md.use(require('markdown-it-emoji').full);

/* Math rendering. */
md.use(require('markdown-it-texmath'), {
    engine: (x) => katex.renderToString(x, {
      throwOnError: false,
      output: 'html',
    }),
    delimiters: 'dollars',
  });

/* Metadata. --- */
md.use(require('markdown-it-front-matter'), (frontMatter) => {
    /* Make metadata accessible per context. */
    md.metaDataRaw = frontMatter;
    md.metaData = null;
    md.metaData = yaml.load(frontMatter);
  });

/* Permalinks in headings. */
md.use(mdItAnchor, {
    slugify: slugify,
    tabIndex: false,
    permalink: mdItAnchor.permalink.linkInsideHeader({
      symbol: '&para;',
      placement: 'after',
    })
  });

/* For admonitions. */
md.use(mdContainer, 'hl', {
    render(tokens, idx) {
      const tok = tokens[idx];

      if (tok.nesting === 1) {
        /* ::: hl note Title here! */
        const type = tok.info.trim().slice(2).trim();
        let cls = type.match(/[^\s]+/)?.[0] || 'note';
        let title = type.slice(cls.length).trim();
        cls = cls.toLowerCase();

        /* No title? Use the class. */
        if (title.length == 0)
          title = cls[0].toUpperCase() + cls.slice(1);

        /* Ensure sanity... */
        cls = md.utils.escapeHtml(cls);
        title = md.utils.escapeHtml(title);

        return `<div class="admonition ${cls}">\n` +
          `<p class="admonition-title">${title}</p>\n`;
      }
      return '</div>\n';
    }
  });


/* Add some rules to wrap tables. */
md.renderer.rules.table_open = function(tokens, idx, options, env, self) {
  return '<div class="table-container">\n' +
    self.renderToken(tokens, idx, options);
};

md.renderer.rules.table_close = function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options) +
    '\n</div>';
};


/* Replace links: *.md -> *.html ; and
 * Use _blank target for external links. */
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const tok = tokens[idx];
  const attr = tok.attrs.find(attr => attr[0] === 'href');
  const href = attr[1].trim();
  const isRelativePath =
      /^\/[^\/]*/.test(href) ||
      href.startsWith('./') ||
      href.startsWith('../');
  const isRelative =
      isRelativePath ||
      href.startsWith('#') ||
      href.startsWith('?');

  /* Check if it is a local link. */
  if (isRelativePath) {

    /* Determine what index to split. */
    const sepIdx = Math.min(
      href.indexOf('?') >>> 0,
      href.indexOf('#') >>> 0);
    const INV = -1 >>> 0;

    const pathPart = sepIdx != INV ? href.slice(0, sepIdx) : href;
    const extrPart = sepIdx != INV ? href.slice(sepIdx)    : '';

    if (pathPart.endsWith('.md'))
      attr[1] = pathPart.slice(0, -2) + 'html' + extrPart;
  }

  /* External links. */
  if (!isRelative)
    tok.attrs.push([ 'target', '_blank' ]);

  return self.renderToken(tokens, idx, options);
};


/**
 * Wraps a fenced code block output.
 * @param str The code block html string.
 * @returns The wrapped string.
 */
function wrapCodeBlock(str) {
  return '<div class="hljs snippet"><pre><code>' +
    str + '</code></pre></div>';
}

/**
 * Function for markdown fenced-code block highlighting.
 * @param str The code string.
 * @param lang The language name.
 * @returns Output HTML string.
 */
function mdHighlightFunc(str, lang) {
  try {
    if (!lang || !hljs.getLanguage(lang))
      throw null;
    const result = hljs.highlight(str, {
        language: lang,
        ignoreIllegals: true,
      }).value;
    return wrapCodeBlock(result);
  }
  catch (__) {}
  return wrapCodeBlock(md.utils.escapeHtml(str));
}

/**
 * Function to slugify the input.
 * @param txt The raw text.
 * @returns The slugified text.
 */
function slugify(txt) {
  return txt
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, '-');
}

/**
 * Generates a table of contents.
 * @param src The markdown source.
 * @returns The table of contents (flat array).
 */
function genTableOfCont(src) {
  const tokens = md.parse(src, {});
  const toc = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.slice(1)); /* h1 -> 1 */
      const content = tokens[i + 1].content;

      /* markdown-it-anchor adds an ID to the token attrs. */
      const idAttr = token.attrs?.find(attr => attr[0] === 'id');
      const id = idAttr ? idAttr[1] : undefined;

      toc.push({ level, content, id });
    }
  }

  return toc;
}

/**
 * Generate table of contents html.
 * @param toc The table of contents object.
 * @returns The html string.
 */
function genTocHTML(toc) {

  /* Wrapper function to generate each level. */
  function genLvl(toc, lvl) {
    let outStr = '<div class="toc-list">\n';
    let curr = toc.shift();

    while (curr && curr.level >= lvl) {
      outStr += '<div class="toc-item"><a href="#';
      outStr += md.utils.escapeHtml(curr.id);
      outStr += '">';
      outStr += md.utils.escapeHtml(curr.content);
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

  return genLvl([...toc], 1);
}

module.exports = {
  md,
  wrapCodeBlock,
  mdHighlightFunc,
  slugify,
  genTableOfCont,
  genTocHTML,
};
