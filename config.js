import path from 'path';
import { fileURLToPath } from 'url';

export const base = path.dirname(fileURLToPath(import.meta.url));


export default {
  DEVMODE:            false,

  SITE:               'vytdev.github.io',
  TEST_PORT:          3000,
  TEST_ADDRESS:       '::', /* IPv6 loopback. */

  ROOT:               base,
  OUT:                path.join(base, 'dist'),
  SRC:                path.join(base, 'src'),

  CLIENT_ENTRY:       path.join(base, 'src-client', 'index.js'),
  CLIENT_OUTPUT:      path.join('assets', 'main.js'),

  TMPL_SUFFIX:        '.njk',
  SITEMAP_FILE:       'sitemap.xml',
  NOT_FOUND_PAGE:     '404.html',
};
