/**
 * Loads power-calculator-embed.css + .js from this file's directory (dialogs/).
 * Use from any dialogs/views/** page: <script src="../../load-power-embed.js?v=YYYYMMDD"></script>
 * Fixes hosted vs file:// when relative ../../ paths to the embed resolve differently.
 */
(function () {
  'use strict';
  var V = '20260330';
  var cur = document.currentScript;
  if (!cur || !cur.src) {
    console.warn('load-power-embed: missing currentScript; load power-calculator-embed manually.');
    return;
  }
  var u = new URL(cur.src);
  var p = u.pathname || '';
  var slash = p.lastIndexOf('/');
  var root = u.origin + (slash >= 0 ? p.slice(0, slash + 1) : '/');

  var cssHref = root + 'power-calculator-embed.css?v=' + V;
  var jsSrc = root + 'power-calculator-embed.js?v=' + V;

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssHref;
  document.head.appendChild(link);

  var s = document.createElement('script');
  s.src = jsSrc;
  s.async = false;
  document.head.appendChild(s);
})();
