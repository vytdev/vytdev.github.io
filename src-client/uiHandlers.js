const events = require('./events.js');
const config = require('./config.js');
const query = require('./query.js');
const util = require('./util.js');


/**
 * Highlight query.
 */
events.globalEvents.on('load', () => {
  if (query['h'])
    util.highlight(query['h'], document.body);
});


/**
 * Behaviour for the sidebar toggle btn.
 */
events.globalEvents.on('load', () => {
  if (pageInfo.navHidden)
    return;
  const mainView = document.querySelector('.main-view');
  const toggle = document.getElementById('sidebar-toggle');

  /* Simply update the main-view x-offset. */
  toggle.addEventListener('change', () => {
    mainView.style.left = toggle.checked
      ? '0' : '-90%';
  });
});


/**
 * ScrollSpy for TOC.
 */
events.globalEvents.on('load', () => {
  if (pageInfo.navHidden)
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
