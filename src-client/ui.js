import * as util from './util.js';
import * as events from './modules/events.js';
import * as highlight from './modules/highlight.js';
import * as cookie from './modules/cookie-consent.js';
import * as themes from './modules/themes.js';
import config from './config.js';
const query = util.query;


/**
 * Highlight query.
 */
events.globalEvents.once('load', () => {
  if (query['h'])
    highlight.highlight(query['h'], document.getElementById('main-content'));
});


/**
 * Behaviour for the sidebar toggle btn.
 */
events.globalEvents.once('load', () => {
  if (uiOpts.noSidebar)
    return;
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  toggle.addEventListener('change', () => {
    sidebar.classList.toggle('sidebar-open', toggle.checked);
    toggle.setAttribute('aria-expanded', `${toggle.checked}`);
    sidebar.setAttribute('aria-hidden', `${!toggle.checked}`);
  });

  /* Responsive sidebar. */
  const vport = window.matchMedia('(min-width: 768px)');
  function handleViewportChange(e) {
    sidebar.setAttribute('aria-hidden', `${!e.matches}`);
  }

  handleViewportChange(vport.matches);
  vport.addEventListener('change', handleViewportChange);
});


/**
 * Back to top btn.
 */
events.globalEvents.once('load', () => {
  const backToTop = document.querySelector('.back-to-top');

  /* Show/hide behaviour of the btn. */
  document.addEventListener('scroll', () => {
    const scrollY = document.documentElement?.scrollTop
        ?? document.body?.scrollTop
        ?? window.scrollY ?? 0;
    backToTop.classList.toggle('show', scrollY > 40);
  });

  /* Scroll back to top when the btn is clicked. */
  backToTop.addEventListener('click', () => {
    window.scrollTo(0, 0);
  });

  /* Clicked via keyboard. */
  backToTop.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key == 'enter' || key == 'space' || key == ' ') {
      e.preventDefault();
      window.scrollTo(0, 0);
    }
  });
});


/**
 * Behaviour for the theme chooser.
 */
events.globalEvents.once('load', () => {
  if (uiOpts.noSidebar)
    return;
  let currTheme = themes.getCurrTheme();

  /* Theme chooser mechanics. */
  const themeChooser = document.getElementById('theme');
  themeChooser.querySelector(`option[value=${currTheme}]`)
    .selected = true;

  /* Theme updates. */
  themeChooser.addEventListener('change', () => {
    currTheme = themeChooser.value;
    themes.changeTheme(currTheme);
  })
});


/**
 * ScrollSpy for TOC.
 */
events.globalEvents.once('load', () => {
  if (uiOpts.noSidebar)
    return;
  const anchors = document.querySelectorAll('.toc a');

  /* Triggers every scroll. */
  document.addEventListener('scroll', () => {
    let found = false;
    for (let i = anchors.length - 1; i >= 0; i--) {
      const a = anchors[i];
      a.className = '';

      /* Anchor already found. We just need to unset previous
         '.current' anchors. */
      if (found)
        continue;

      /* Get the heading for this anchor. */
      const id = a.href.slice(a.href.indexOf('#') + 1);
      const h = document.getElementById(id);

      /* We must be in or under the heading. +20 for
         visual offset corrections. */
      const offsetTop = h.getBoundingClientRect().top;
      if (!h || config.SCROLL_MARGIN_TOP + 20 < offsetTop)
        continue;

      a.className = 'current';
      found = true;
    }
  });
});


/**
 * Cookie banner.
 */
events.globalEvents.once('load', () => {
  if (cookie.getCookieConsent() == cookie.COOKIE_ACCEPTED)
    events.globalEvents.emit('cookie-consented');

  /* Ask the user for consent if we haven't already. */
  if (cookie.getCookieConsent() != cookie.COOKIE_UNSET)
    return;

  /* Display the cookie notice. */
  const cookieNotice = document.querySelector('.cookie-notice');
  cookieNotice.style.display = 'block';

  cookieNotice.querySelector('.understood')
    .addEventListener('click', () => {
      cookie.setCookieConsent(cookie.COOKIE_ACCEPTED);
      cookieNotice.style.display = 'none';
      events.globalEvents.emit('cookie-consented');
    });
});
