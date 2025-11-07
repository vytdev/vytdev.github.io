/**
 * Replace '.md' to '.html', and add target=_blank for external links.
 * @param md MarkdownIt instance.
 */
export default function markdownItFixLinks(md) {
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
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
}
