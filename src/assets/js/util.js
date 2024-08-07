/* ================================================================
Utility client script for layout components
================================================================ */

(function() {
"use strict";

// utilities for documents
window.docUtil = {};

// map search queries
docUtil.query = (function() {
  const query = {};
  // get the search pairs, slice 1 to exclude leading '?'
  const pairs = window.location.search.substring(1).split("&");
  // extract each key/values
  for (let i = 0; i < pairs.length; i++) {
    const split = pairs[i].split("=");
    // put it to output
    query[
      decodeURIComponent((split[0] || "").replace(/\+/g, " "))
    ] = decodeURIComponent((split[1] || "").replace(/\+/g, " "));
  }
  // return output
  return query;
}());

// list of theme options and their corresponding media query, applied
// to the dark theme stylesheet
docUtil.THEMES = {
  auto: "(prefers-color-scheme: dark)",
  light: "not all",
  dark: "all",
};

// highlight the terms on the specified node
docUtil.highlight = function(text, node) {
  const words = text.normalize("NFD").toLowerCase().split(/\s+/g);

  // a text node
  if (node.nodeType == document.TEXT_NODE) {

    // already highlighted or is fixed not to be highlighted
    if (node.parentNode.classList.contains("highlight") ||
      node.parentNode.classList.contains("nohighlight")) { return; }

    const org = node.nodeValue,
      lower = org.normalize("NFD").toLowerCase();

    // try to match first found word
    for (let i = 0; i < words.length; i++) {
      const term = words[i];
      const idx = lower.indexOf(term);

      // word not found
      if (idx < 0) { continue; }
      const len = term.length;

      // setup span placeholder for highlighted word
      const span = document.createElement("span");
      span.className = "highlight";
      span.appendChild(document.createTextNode(org.substring(idx, idx + len)));

      // put the highlight there
      node.parentNode.insertBefore(span, node.parentNode.insertBefore(
        document.createTextNode(org.substring(idx + len)),
        node.nextSibling));
      node.nodeValue = org.substring(0, idx);

      docUtil.highlight(text, node.parentNode);
      break;
    }

    return;
  }

  // exclude button, select, textarea, and svg elements
  if (node.tagName == "BUTTON" || node.tagName == "SELECT" || node.tagName == "TEXTAREA" ||
    node.tagName == "SVG") { return; }

  // iterate through child nodes
  for (let i = 0; i < node.childNodes.length; i++) {
    docUtil.highlight(text, node.childNodes[i]);
  }
}

// remove highlight from node
docUtil.unHighlight = function(node) {
  if (node.tagName == "SPAN" && node.classList.contains("highlight")) {
    const prev = node.previousSibling;
    const next = node.nextSibling;
    const parent = node.parentNode;
    let text = "";
    let branch = node;

    // check for previous node
    if (prev && prev.nodeType == document.TEXT_NODE) {
      branch = prev;
      text += prev.nodeValue;
    }

    // put this to text
    text += node.childNodes[0].nodeValue;

    // check for next node
    if (next && next.nodeType == document.TEXT_NODE) {
      parent.removeChild(next);
      text += next.nodeValue;
    }

    // some final touches
    parent.insertBefore(document.createTextNode(text), branch);
    parent.removeChild(node);
    if (prev) { parent.removeChild(prev); }

    return;
  }

  // iterate child nodes
  let len = node.childNodes.length;
  let last;
  for (let i = 0; i < len; i++) {
    const child = node.childNodes[i];
    if (child.nodeType != document.ELEMENT_NODE) { continue; }
    docUtil.unHighlight(child);

    // this node length changes as we remove highlight from it
    len = node.childNodes.length;
    if (len != last) {
      i = 0;
      last = len;
    }
  }
}

// fetch text by url
docUtil.fetchText = function(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    // onload event handler
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };

    // onerror event handler
    xhr.onerror = function() {
      reject(new Error("Request failed"));
    };

    xhr.send();
  });
}

// this function will be called once dom is completely loaded
function onDomInit() { if (isInit) return; isInit = true;

  const searchInput = document.getElementById("search-bar");
  const screenOverlay = document.getElementById("overlay");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarContent = document.getElementById("sidebar-content");
  const cookieNotice = document.getElementById("cookie-notice");
  const backToTop = document.getElementById("back-to-top");
  const darkTheme = document.getElementById("dark-theme");
  const mainContent = document.getElementById("content");

  // highlight terms
  if (docUtil.query["h"] && docUtil.query["h"].length) {
    docUtil.highlight(docUtil.query["h"], mainContent);
  }

  function toggleOverlay(val) {
    if (val) { screenOverlay.style.display = "block"; }
    else { screenOverlay.style.display = "none"; }
  }

  // inline auto-complete for search bar
  searchInput.addEventListener('input', function(event) {
    if (!window.searchSuggestions || !event.data || /\s/.test(event.data) || this.selectionStart < this.value.length) {
      return;
    }
    const cursorPosition = this.selectionStart;
    const match = this.value.toLowerCase().match(/(.*)?\b([^\s]+)/);
    if (!match) return;
    const word = match[2];
    let matchingSuggestion;
    let isMatched = false;

    // find matching word
    for (let i = 0; i < searchSuggestions.length; i++) {
      matchingSuggestion = searchSuggestions[i];

      if (matchingSuggestion.toLowerCase().startsWith(word)) {
        isMatched = true;
        break;
      }
    }

    if (isMatched && matchingSuggestion) {
      const completedText = matchingSuggestion.substring(word.length);
      const newText = this.value.substring(0, cursorPosition) + completedText;

      // set the input value with the completed suggestion
      this.value = newText;
      this.setSelectionRange(cursorPosition, newText.length);
    }
  });

  // search word auto-complete
  searchInput.addEventListener('keydown', function(event) {
    if (event.key == 'Tab') {
      event.preventDefault();
      this.setSelectionRange(this.selectionEnd, this.selectionEnd);
    }
  });

  // sidebar behaviour
  sidebarToggle && (sidebarToggle.onchange = function() {
    toggleOverlay(this.checked);
    if (this.checked) { sidebarContent.style.left = "0"; }
    else { sidebarContent.style.left = "-100%"; }
  });

  // when overlay is active and clicked
  screenOverlay.onclick = function() {
    if (sidebarToggle.checked) {
      toggleOverlay(false);
      sidebarToggle.checked = false;
      sidebarContent.style.left = "-100%";
    }
  };

  // back to top button behaviour
  backToTop.onclick = function() {
    window.scrollTo(0, 0);
  };

  // back to top button display
  window.onscroll = function() {
    const scrollTop = (document.documentElement && document.documentElement.scrollTop) ||
      (document.body && document.body.scrollTop) || window.scrollY;

    // show and hide back to top button
    if (scrollY > 40) { backToTop.style.right = "1em"; }
    else { backToTop.style.right = "-5em"; }
  };

  // simple utility for cookie notice
  if (localStorage.getItem("cookiesAccepted") != "yes") {
    cookieNotice.style.display = "block";

    localStorage.setItem("cookiesAccepted", "no");

    document.getElementById("accept-cookies").onclick = function() {
      localStorage.setItem("cookiesAccepted", "yes");
      cookieNotice.style.display = "none";
    }
  }

  // load last theme
  darkTheme.media = docUtil.THEMES[localStorage.getItem("theme")] || docUtil.THEMES.auto;

  // theme toggle buttons
  document.getElementById("theme-set-auto").onclick = function() {
    darkTheme.media = docUtil.THEMES.auto;
    localStorage.setItem("theme", "auto")
  };
  document.getElementById("theme-set-light").onclick = function() {
    darkTheme.media = docUtil.THEMES.light;
    localStorage.setItem("theme", "light");
  };
  document.getElementById("theme-set-dark").onclick = function() {
    darkTheme.media = docUtil.THEMES.dark;
    localStorage.setItem("theme", "dark");
  };

} // onDomInit
// run onDomInit once DOM fully loaded
var isInit = false;
window.onload = onDomInit;
document.addEventListener("DOMContentLoaded", onDomInit);
})();
