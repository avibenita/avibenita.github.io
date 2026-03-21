/**
 * Loads power-calculator-embed.css + .js from this file's directory (dialogs/).
 * Use from any dialogs/views/** page: <script src="../../load-power-embed.js?v=YYYYMMDD"></script>
 *
 * Do not use defer/async on this tag (document.currentScript must be set).
 * Keep var V in sync with CACHE_BUSTER in power-calculator-embed.js.
 */
(function () {
  'use strict';
  var V = '20260331';
  var cur = document.currentScript;
  if (!cur || !cur.src) {
    console.warn('load-power-embed: missing currentScript; add a classic script tag without defer/async.');
    return;
  }

  /** file:// often yields origin "null" — build folder URL from the script href string. */
  function folderFromScriptSrc(scriptSrc) {
    var clean = String(scriptSrc).split('#')[0].split('?')[0];
    return clean.replace(/[^/]+$/, '');
  }

  var root = folderFromScriptSrc(cur.src);
  var cssHref = root + 'power-calculator-embed.css?v=' + V;
  var jsSrc = root + 'power-calculator-embed.js?v=' + V;

  function fallbackFromPage() {
    try {
      var cssFb = new URL('../../power-calculator-embed.css?v=' + V, window.location.href).href;
      var l2 = document.createElement('link');
      l2.rel = 'stylesheet';
      l2.href = cssFb;
      document.head.appendChild(l2);

      var base = new URL('../../power-calculator-embed.js?v=' + V, window.location.href).href;
      var s2 = document.createElement('script');
      s2.async = false;
      s2.src = base;
      s2.onerror = function () {
        console.error('load-power-embed: fallback script failed', base);
      };
      document.head.appendChild(s2);
    } catch (e) {
      console.error('load-power-embed: fallback error', e);
    }
  }

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssHref;
  link.onerror = function () {
    console.error('load-power-embed: stylesheet failed', cssHref);
  };
  document.head.appendChild(link);

  var s = document.createElement('script');
  s.src = jsSrc;
  s.async = false;
  s.onerror = function () {
    console.error('load-power-embed: script failed', jsSrc, '— trying page-relative ../../');
    fallbackFromPage();
  };
  document.head.appendChild(s);
})();
