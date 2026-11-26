/**
 * Guided-walkthrough player.
 * The branded preview is in the dialog immediately. The video file is
 * requested when the dialog opens, and playback starts as soon as it can.
 * Chapter navigation is optional and lives below the video, from the
 * walkthrough catalog. Videos without chapters keep this same player.
 */
(function () {
  'use strict';

  var STYLE_ID = 'statistico-demo-video-style';
  var ROOT_ID = 'demoVideoBackdrop';
  var LOGO_SRC = '/Statistico-Website/assets/statistico-logo-dark-bg.svg';
  var opener = null;
  var session = 0;
  var settleTimer = 0;
  var prepareTimer = 0;
  var copyTimer = 0;
  var mediaAbort = null;
  var mediaToken = 0;
  var mediaReady = false;
  var durationOk = false;
  var chaptersEnabled = false;
  var openedForChapter = false;
  var activeConfig = null;
  var pendingSeek = null;
  var seekSerial = 0;
  var seekWait = null;
  var selectNavigating = false;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.demo-video-backdrop{position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px 18px;background:rgba(6,10,16,.78);opacity:0;pointer-events:none}',
      '.demo-video-backdrop.is-open{opacity:1;pointer-events:auto}',
      '.demo-video-dialog{position:relative;width:min(1560px,calc(100vw - 36px));max-height:calc(100vh - 32px);overflow:auto;display:flex;flex-direction:column;gap:0;padding:18px 20px 16px;border-radius:20px;background:#0e1622;color:#f8fafc;font-family:Inter,"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;box-shadow:0 28px 70px rgba(0,0,0,.42);opacity:0;transform:scale(.985)}',
      '.demo-video-dialog>*{flex-shrink:0}',
      '.demo-video-backdrop,.demo-video-dialog{transition:opacity 250ms ease,transform 250ms ease}',
      '.demo-video-backdrop.is-open .demo-video-dialog{opacity:1;transform:scale(1)}',
      '.demo-video-backdrop.is-settled,.demo-video-backdrop.is-settled .demo-video-dialog{transition:none;transform:none;opacity:1;filter:none}',
      '.demo-video-backdrop[hidden]{display:none !important}',
      '.demo-video-kicker{margin:0 48px 0 0;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,.68)}',
      '.demo-video-title{margin:6px 44px 12px 0;font-size:1.55rem;font-weight:650;line-height:1.2;letter-spacing:-.02em;color:#f8fafc}',
      '.demo-video-lead{display:none}',
      '.demo-video-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border:0;border-radius:999px;background:transparent;color:rgba(226,232,240,.78);cursor:pointer;font:400 26px/1 Inter,"Segoe UI",sans-serif}',
      '.demo-video-close:hover{color:#fff;background:rgba(255,255,255,.06)}',
      '.demo-video-close:focus-visible,.demo-video-play:focus-visible,.demo-video-link:focus-visible,.demo-video-copy:focus-visible,.demo-video-jump select:focus-visible,.demo-video-copy-fallback:focus-visible{outline:2px solid #e4c16a;outline-offset:3px}',
      '.demo-video-frame{position:relative;width:min(100%,calc((100vh - 148px)*16/9));max-height:calc(100vh - 148px);margin-inline:auto;aspect-ratio:16/9;flex:none;border-radius:16px;overflow:hidden;background:#0c1422;box-shadow:0 22px 48px rgba(0,0,0,.36),0 0 0 1px rgba(228,193,106,.42)}',
      '.demo-video-dialog.has-chapters .demo-video-frame{width:min(100%,calc((100vh - 228px)*16/9));max-height:calc(100vh - 228px)}',
      '.demo-video-frame video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;opacity:0}',
      '.demo-video-frame video:fullscreen,.demo-video-frame video:-webkit-full-screen{width:100%;height:100%;object-fit:contain;background:#000}',
      '.demo-video-frame video.is-ready{opacity:1}',
      '.demo-video-preview{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}',
      '.demo-video-preview.is-hidden{opacity:0;visibility:hidden;pointer-events:none}',
      '.demo-video-preview.is-preparing .demo-video-shot,.demo-video-preview.is-preparing .demo-video-veil,.demo-video-preview.is-preparing .demo-video-logo,.demo-video-preview.is-preparing .demo-video-play{display:none}',
      '.demo-video-shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
      '.demo-video-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,16,32,.62),rgba(8,16,32,.34) 42%,rgba(8,16,32,.58))}',
      '.demo-video-logo{position:relative;z-index:1;width:min(240px,58%);height:auto;filter:drop-shadow(0 8px 18px rgba(0,0,0,.35))}',
      '.demo-video-play{position:relative;z-index:1;width:78px;height:78px;border:0;border-radius:50%;cursor:pointer;color:#1c1404;background:radial-gradient(circle at 35% 30%,#f8e7b0,#e4c16a 46%,#b8892e);box-shadow:0 12px 28px rgba(0,0,0,.35),0 0 0 8px rgba(228,193,106,.18);display:grid;place-items:center}',
      '.demo-video-play svg{width:26px;height:26px;margin-left:3px}',
      '.demo-video-play[hidden],.demo-video-preparing[hidden],.demo-video-error[hidden],.demo-video-chapters[hidden],.demo-video-copy-fallback[hidden]{display:none !important}',
      '.demo-video-preparing{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;margin:0;color:#f8fafc;font-size:.84rem;font-weight:600;letter-spacing:.01em;text-shadow:0 1px 8px rgba(0,0,0,.45)}',
      '.demo-video-progress{width:84px;height:3px;border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden}',
      '.demo-video-progress span{display:block;width:42%;height:100%;border-radius:inherit;background:#e4c16a;animation:demo-video-progress 1s ease-in-out infinite}',
      '@keyframes demo-video-progress{0%{transform:translateX(-130%)}100%{transform:translateX(280%)}}',
      '.demo-video-chapters{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:12px}',
      '.demo-video-jump{display:flex;flex-direction:column;gap:4px;min-width:min(100%,240px);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(226,232,240,.68)}',
      '.demo-video-jump select{width:min(420px,100%);height:36px;padding:0 10px;border-radius:8px;border:1px solid rgba(228,193,106,.45);background:#152033;color:#f8fafc;font:600 13px/1.2 Inter,"Segoe UI",sans-serif;letter-spacing:0;text-transform:none}',
      '.demo-video-chapter-title{margin:0;flex:1 1 180px;min-width:min(100%,160px);font-size:.95rem;font-weight:650;line-height:1.3;color:#f8fafc}',
      '.demo-video-copy{height:36px;padding:0 12px;border-radius:8px;border:1px solid rgba(125,211,252,.4);background:transparent;color:#7dd3fc;font:700 13px/1 Inter,"Segoe UI",sans-serif;cursor:pointer;white-space:nowrap}',
      '.demo-video-copy:hover{background:rgba(125,211,252,.08)}',
      '.demo-video-copy-status{min-height:1em;font-size:.82rem;font-weight:650;color:#e4c16a}',
      '.demo-video-copy-fallback{flex:1 1 220px;min-width:min(100%,180px);height:36px;padding:0 10px;border-radius:8px;border:1px solid rgba(228,193,106,.45);background:#0c1422;color:#f8fafc;font:500 13px/1.2 Inter,"Segoe UI",sans-serif}',
      '.demo-video-error{margin:12px 0 0;color:#e2e8f0;font-size:.92rem;line-height:1.45}',
      '.demo-video-link{color:#e4c16a;font-weight:700}',
      '@media (max-height:760px){.demo-video-dialog.has-chapters{padding:12px 14px 12px}.demo-video-dialog.has-chapters .demo-video-title{font-size:1.25rem;margin-bottom:8px}.demo-video-dialog.has-chapters .demo-video-frame{width:min(100%,calc((100vh - 196px)*16/9));max-height:calc(100vh - 196px)}}',
      '@media (max-width:640px){.demo-video-backdrop{padding:12px}.demo-video-dialog{padding:18px 14px 14px;border-radius:16px}.demo-video-title{font-size:1.2rem}.demo-video-play{width:68px;height:68px}.demo-video-frame{width:min(100%,calc((100vh - 128px)*16/9));max-height:calc(100vh - 128px)}.demo-video-dialog.has-chapters .demo-video-frame{width:min(100%,calc((100vh - 220px)*16/9));max-height:calc(100vh - 220px)}.demo-video-jump,.demo-video-jump select,.demo-video-chapter-title,.demo-video-copy{width:100%}}',
      '@media (prefers-reduced-motion:reduce){.demo-video-backdrop,.demo-video-dialog,.demo-video-progress span{transition:none;animation:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  function playIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5z"/></svg>';
  }

  function ensureDialog() {
    var existing = document.getElementById(ROOT_ID);
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="demo-video-backdrop" id="demoVideoBackdrop" role="dialog" aria-modal="true" aria-labelledby="demoVideoTitle" hidden>',
      '  <div class="demo-video-dialog" id="demoVideoDialog">',
      '    <button type="button" class="demo-video-close" id="demoVideoClose" aria-label="Close">\u00d7</button>',
      '    <p class="demo-video-kicker" id="demoVideoKicker"></p>',
      '    <h2 class="demo-video-title" id="demoVideoTitle"></h2>',
      '    <p class="demo-video-lead" id="demoVideoLead"></p>',
      '    <div class="demo-video-frame">',
      '      <video id="demoVideo" playsinline preload="auto"></video>',
      '      <div class="demo-video-preview" id="demoVideoPreview">',
      '        <img class="demo-video-shot" id="demoVideoShot" alt="">',
      '        <div class="demo-video-veil"></div>',
      '        <img class="demo-video-logo" src="' + LOGO_SRC + '" alt="Statistico Interactive">',
      '        <button type="button" class="demo-video-play" id="demoVideoPlay" aria-label="Play the guided walkthrough">' + playIcon() + '</button>',
      '        <p class="demo-video-preparing" id="demoVideoPreparing" hidden>',
      '          <span class="demo-video-progress" aria-hidden="true"><span></span></span>',
      '          Preparing your walkthrough\u2026',
      '        </p>',
      '      </div>',
      '    </div>',
      '    <div class="demo-video-chapters" id="demoVideoChapters" hidden>',
      '      <label class="demo-video-jump" for="demoVideoChapterSelect">Jump to a section',
      '        <select id="demoVideoChapterSelect"></select>',
      '      </label>',
      '      <p class="demo-video-chapter-title" id="demoVideoChapterTitle"></p>',
      '      <button type="button" class="demo-video-copy" id="demoVideoCopy">Copy section link</button>',
      '      <span class="demo-video-copy-status" id="demoVideoCopyStatus" role="status" aria-live="polite"></span>',
      '      <input class="demo-video-copy-fallback" id="demoVideoCopyFallback" type="text" readonly hidden aria-label="Section link">',
      '    </div>',
      '    <p class="demo-video-error" id="demoVideoError" hidden>',
      '      This walkthrough could not be played.',
      '      <a class="demo-video-link" id="demoVideoDirect" href="#">Open the video</a>',
      '    </p>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap.firstChild);
    var backdrop = document.getElementById(ROOT_ID);
    armFullscreen(backdrop.querySelector('video'), backdrop);
    return backdrop;
  }

  function settle(backdrop) {
    if (backdrop) backdrop.classList.add('is-settled');
  }

  function armFullscreen(video, backdrop) {
    ['requestFullscreen', 'webkitRequestFullscreen'].forEach(function (name) {
      var orig = video[name];
      if (typeof orig !== 'function') return;
      video[name] = function () {
        settle(backdrop);
        return orig.apply(video, arguments);
      };
    });
  }

  function els() {
    return {
      backdrop: document.getElementById(ROOT_ID),
      dialog: document.getElementById('demoVideoDialog'),
      video: document.getElementById('demoVideo'),
      preview: document.getElementById('demoVideoPreview'),
      shot: document.getElementById('demoVideoShot'),
      play: document.getElementById('demoVideoPlay'),
      preparing: document.getElementById('demoVideoPreparing'),
      error: document.getElementById('demoVideoError'),
      direct: document.getElementById('demoVideoDirect'),
      close: document.getElementById('demoVideoClose'),
      chapters: document.getElementById('demoVideoChapters'),
      chapterSelect: document.getElementById('demoVideoChapterSelect'),
      chapterTitle: document.getElementById('demoVideoChapterTitle'),
      copy: document.getElementById('demoVideoCopy'),
      copyStatus: document.getElementById('demoVideoCopyStatus'),
      copyFallback: document.getElementById('demoVideoCopyFallback')
    };
  }

  function showCover(mode) {
    var ui = els();
    if (!ui.preview) return;
    ui.preview.classList.toggle('is-preparing', mode === 'preparing');
    ui.preview.classList.toggle('is-hidden', mode === 'none');
    if (mode === 'preparing' || mode === 'play') {
      ui.video.classList.remove('is-ready');
      ui.video.controls = false;
    }
    ui.preparing.hidden = mode !== 'preparing';
    ui.play.hidden = mode !== 'play';
  }

  function revealVideo() {
    var ui = els();
    if (!ui.video || !ui.backdrop || ui.backdrop.hidden || !ui.video.getAttribute('src')) return;
    clearTimeout(prepareTimer);
    ui.video.classList.add('is-ready');
    ui.video.controls = true;
    ui.preview.classList.remove('is-preparing');
    ui.preview.classList.add('is-hidden');
    ui.preparing.hidden = true;
    ui.play.hidden = true;
  }

  function begin(token) {
    var ui = els();
    clearTimeout(prepareTimer);
    showCover('none');
    prepareTimer = setTimeout(function () {
      var current = els();
      if (token !== session || !current.video || current.backdrop.hidden) return;
      if (!current.play.hidden || !current.video.paused || current.video.readyState >= 2) return;
      showCover('preparing');
    }, 220);
    var pending = ui.video.play();
    if (!pending || !pending.then) return;
    pending.then(function () {
      if (token !== session) return;
      revealVideo();
    }).catch(function () {
      if (token !== session) return;
      clearTimeout(prepareTimer);
      if (!ui.video.paused && ui.video.readyState >= 2) {
        revealVideo();
        return;
      }
      showCover('play');
    });
  }

  function formatStamp(seconds) {
    var total = Math.round(Number(seconds) || 0);
    var minutes = Math.floor(total / 60);
    var remain = total % 60;
    return minutes + ':' + (remain < 10 ? '0' : '') + remain;
  }

  function findChapter(config, id) {
    var chapters = config && config.chapters;
    if (!chapters || !id) return null;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].id === id) return chapters[i];
    }
    return null;
  }

  function chapterAt(time) {
    var chapters = activeConfig && activeConfig.chapters;
    if (!chapters || !chapters.length) return null;
    var found = chapters[0];
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].start <= time + 0.05) found = chapters[i];
      else break;
    }
    return found;
  }

  function durationMatches(video, config) {
    if (!config || !config.chapters || !config.chapters.length) return false;
    if (config.expectedDuration == null) return true;
    var duration = video.duration;
    if (!isFinite(duration) || duration <= 0) return false;
    return Math.abs(duration - config.expectedDuration) <= config.durationTolerance;
  }

  function showChapters() {
    var ui = els();
    if (ui.chapters) ui.chapters.hidden = false;
    if (ui.dialog) ui.dialog.classList.add('has-chapters');
  }

  function hideChapters() {
    var ui = els();
    if (ui.chapters) ui.chapters.hidden = true;
    if (ui.dialog) ui.dialog.classList.remove('has-chapters');
  }

  function renderChapterOptions(config, selectedId) {
    var ui = els();
    if (!ui.chapterSelect) return;
    ui.chapterSelect.innerHTML = '';
    config.chapters.forEach(function (chapter) {
      var option = document.createElement('option');
      option.value = chapter.id;
      option.textContent = formatStamp(chapter.start) + '  ' + chapter.title;
      ui.chapterSelect.appendChild(option);
    });
    if (selectedId) ui.chapterSelect.value = selectedId;
    var selected = findChapter(config, ui.chapterSelect.value) || config.chapters[0];
    if (ui.chapterTitle) ui.chapterTitle.textContent = selected ? selected.title : '';
  }

  function updateChapterUi(chapter) {
    if (!chapter) return;
    var ui = els();
    if (ui.chapterTitle) ui.chapterTitle.textContent = chapter.title;
    if (ui.chapterSelect && ui.chapterSelect.value !== chapter.id) ui.chapterSelect.value = chapter.id;
  }

  function sectionUrl(videoId, chapterId) {
    var url = new URL(window.location.href);
    url.searchParams.set('video', videoId);
    url.searchParams.set('chapter', chapterId);
    return url.toString();
  }

  function writeUrl(videoId, chapterId) {
    if (!videoId || !window.history || !history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.set('video', videoId);
    if (chapterId) url.searchParams.set('chapter', chapterId);
    else url.searchParams.delete('chapter');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }

  function clearSeekWait() {
    var video = document.getElementById('demoVideo');
    if (seekWait && video) video.removeEventListener('seeked', seekWait);
    seekWait = null;
  }

  function releaseMedia() {
    if (mediaAbort) {
      mediaAbort.abort();
      mediaAbort = null;
    }
    clearSeekWait();
    pendingSeek = null;
    mediaReady = false;
    durationOk = false;
    chaptersEnabled = false;
  }

  function applySeek(job) {
    if (!job || job.id !== seekSerial || job.token !== session) return;
    var video = els().video;
    if (!video || video.readyState < 1) return;
    clearSeekWait();
    var start = Number(job.chapter.start) || 0;
    function finish() {
      if (job.finished || job.id !== seekSerial || job.token !== session) return;
      if (Math.abs(video.currentTime - start) > 0.5) return;
      job.finished = true;
      clearSeekWait();
      if (pendingSeek && pendingSeek.id === job.id) pendingSeek = null;
      if (job.play) begin(job.token);
      else {
        try { video.pause(); } catch (ignore) {}
        showCover('play');
      }
    }
    seekWait = function () { finish(); };
    video.addEventListener('seeked', seekWait);
    try {
      video.currentTime = start;
    } catch (ignore) {
      clearSeekWait();
      return;
    }
    if (Math.abs(video.currentTime - start) < 0.08) finish();
  }

  function requestSeek(chapter, play, token) {
    if (!chapter) return;
    var job = {
      id: ++seekSerial,
      token: token || session,
      chapter: chapter,
      play: !!play,
      finished: false
    };
    pendingSeek = job;
    updateChapterUi(chapter);
    if (!mediaReady) return;
    if (!durationOk) {
      pendingSeek = null;
      return;
    }
    applySeek(job);
  }

  function onLoadedMetadata() {
    if (mediaToken !== session) return;
    var ui = els();
    mediaReady = true;
    durationOk = !!(ui.video && durationMatches(ui.video, activeConfig));
    if (!durationOk) {
      pendingSeek = null;
      clearSeekWait();
      chaptersEnabled = false;
      hideChapters();
      if (openedForChapter && ui.video && ui.video.paused) begin(session);
      return;
    }
    chaptersEnabled = true;
    showChapters();
    if (pendingSeek) applySeek(pendingSeek);
  }

  function syncFromTime() {
    if (mediaToken !== session || !chaptersEnabled || pendingSeek) return;
    var ui = els();
    if (!ui.video || selectNavigating) return;
    updateChapterUi(chapterAt(ui.video.currentTime));
  }

  function bindMedia(token) {
    releaseMedia();
    mediaAbort = new AbortController();
    mediaToken = token;
    var video = els().video;
    var signal = mediaAbort.signal;
    video.addEventListener('loadedmetadata', onLoadedMetadata, { signal: signal });
    video.addEventListener('timeupdate', syncFromTime, { signal: signal });
    video.addEventListener('seeked', syncFromTime, { signal: signal });
  }

  function confirmCopied() {
    var status = els().copyStatus;
    if (!status) return;
    status.textContent = 'Link copied';
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () {
      var current = els().copyStatus;
      if (current) current.textContent = '';
    }, 2000);
  }

  function showCopyFallback(url) {
    var ui = els();
    if (!ui.copyFallback) return;
    ui.copyFallback.hidden = false;
    ui.copyFallback.value = url;
    ui.copyFallback.focus();
    ui.copyFallback.select();
    if (ui.copyStatus) ui.copyStatus.textContent = 'Select and copy this link';
  }

  function copySectionLink() {
    var ui = els();
    if (!activeConfig || !activeConfig.id || !ui.chapterSelect) return;
    var chapter = findChapter(activeConfig, ui.chapterSelect.value) || chapterAt(ui.video ? ui.video.currentTime : 0);
    if (!chapter) return;
    var url = sectionUrl(activeConfig.id, chapter.id);
    writeUrl(activeConfig.id, chapter.id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(confirmCopied).catch(function () {
        showCopyFallback(url);
      });
      return;
    }
    showCopyFallback(url);
  }

  function resetCopyUi() {
    var ui = els();
    clearTimeout(copyTimer);
    if (ui.copyStatus) ui.copyStatus.textContent = '';
    if (ui.copyFallback) {
      ui.copyFallback.hidden = true;
      ui.copyFallback.value = '';
    }
  }

  function open(options) {
    options = options || {};
    ensureStyles();
    var backdrop = ensureDialog();
    var ui = els();
    var token = ++session;
    openedForChapter = false;
    selectNavigating = false;
    opener = options.returnFocus || document.activeElement;
    activeConfig = {
      id: options.videoId || options.id || '',
      chapters: Array.isArray(options.chapters) ? options.chapters.slice() : [],
      expectedDuration: typeof options.expectedDuration === 'number' ? options.expectedDuration : null,
      durationTolerance: typeof options.durationTolerance === 'number' ? options.durationTolerance : 0.5
    };
    var requested = findChapter(activeConfig, options.chapterId);
    var invalidChapter = !!(options.chapterId && !requested);
    document.getElementById('demoVideoKicker').textContent = options.kicker || '';
    document.getElementById('demoVideoTitle').textContent = options.title || options.headline || 'Guided walkthrough';
    document.getElementById('demoVideoLead').textContent = options.lead || '';
    ui.error.hidden = true;
    ui.direct.href = options.src;
    ui.shot.src = options.poster || '';
    ui.shot.hidden = !options.poster;
    resetCopyUi();
    showCover('none');
    ui.video.pause();
    var pausedChapter = !!(requested && options.autoplay === false);
    openedForChapter = pausedChapter;
    bindMedia(token);
    ui.video.src = options.src;
    if (activeConfig.chapters.length && !invalidChapter && (!mediaReady || durationOk)) {
      var initial = requested || activeConfig.chapters[0];
      renderChapterOptions(activeConfig, initial.id);
      showChapters();
    } else {
      hideChapters();
    }
    if (!options.skipUrl && activeConfig.id) writeUrl(activeConfig.id, requested ? requested.id : '');
    backdrop.hidden = false;
    backdrop.classList.remove('is-open');
    backdrop.classList.remove('is-settled');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    clearTimeout(settleTimer);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('is-open');
      });
    });
    settleTimer = setTimeout(function () { settle(backdrop); }, 260);
    if (pausedChapter) {
      if (mediaReady && !durationOk) return;
      requestSeek(requested, false, token);
      if (!mediaReady || pendingSeek) showCover('play');
      return;
    }
    begin(token);
  }

  function close() {
    var ui = els();
    if (!ui.backdrop || ui.backdrop.hidden) return;
    session += 1;
    selectNavigating = false;
    clearTimeout(settleTimer);
    clearTimeout(prepareTimer);
    releaseMedia();
    openedForChapter = false;
    activeConfig = null;
    resetCopyUi();
    hideChapters();
    ui.backdrop.classList.remove('is-open');
    ui.backdrop.classList.remove('is-settled');
    ui.backdrop.hidden = true;
    ui.video.pause();
    ui.video.removeAttribute('src');
    ui.video.load();
    ui.video.classList.remove('is-ready');
    ui.video.controls = false;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }

  function openFromCatalog(config, chapterId, autoplay, returnFocus) {
    var requested = findChapter({ chapters: config.chapters || [] }, chapterId);
    open({
      id: config.id,
      videoId: config.id,
      kicker: config.kicker,
      title: config.title || config.headline,
      lead: config.lead,
      src: config.src,
      poster: config.poster,
      chapters: config.chapters,
      expectedDuration: config.expectedDuration,
      durationTolerance: config.durationTolerance,
      chapterId: requested ? requested.id : null,
      autoplay: autoplay,
      returnFocus: returnFocus,
      skipUrl: true
    });
  }

  function openFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var videoId = params.get('video');
    if (!videoId) return false;
    var catalog = window.StatisticoWalkthroughs || {};
    var config = catalog[videoId];
    if (!config || !config.src) return false;
    var requested = findChapter({ chapters: config.chapters || [] }, params.get('chapter'));
    openFromCatalog(config, requested ? requested.id : null, !requested, null);
    return true;
  }

  function onWalkthroughLink(event) {
    var target = event.target;
    var link = target && target.closest ? target.closest('[data-walkthrough-video]') : null;
    if (!link) return;
    var videoId = link.getAttribute('data-walkthrough-video');
    var catalog = window.StatisticoWalkthroughs || {};
    var config = catalog[videoId];
    if (!config || !config.src) return;
    event.preventDefault();
    var requested = findChapter({ chapters: config.chapters || [] }, link.getAttribute('data-walkthrough-chapter'));
    writeUrl(config.id || videoId, requested ? requested.id : '');
    openFromCatalog(config, requested ? requested.id : null, !requested, link);
  }

  function onChapterChange() {
    if (!activeConfig || !activeConfig.chapters.length) return;
    var ui = els();
    var chapter = findChapter(activeConfig, ui.chapterSelect.value);
    if (!chapter) return;
    if (ui.chapterTitle) ui.chapterTitle.textContent = chapter.title;
    if (activeConfig.id) writeUrl(activeConfig.id, chapter.id);
    requestSeek(chapter, true, session);
  }

  function onPlayClick() {
    if (pendingSeek && pendingSeek.token === session) {
      pendingSeek.play = true;
      if (mediaReady && durationOk) applySeek(pendingSeek);
      return;
    }
    begin(session);
  }

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll('button, a[href], select, input, video')).filter(function (el) {
      return !el.hidden && el.offsetParent !== null;
    });
  }

  function onKey(event) {
    var backdrop = document.getElementById(ROOT_ID);
    if (!backdrop || backdrop.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    var items = focusables(backdrop);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function boot() {
    ensureStyles();
    ensureDialog();
    var ui = els();
    ui.close.addEventListener('click', close);
    ui.play.addEventListener('click', onPlayClick);
    ui.backdrop.addEventListener('click', function (event) {
      if (event.target === ui.backdrop) close();
    });
    ui.chapterSelect.addEventListener('keydown', function () { selectNavigating = true; });
    ui.chapterSelect.addEventListener('mousedown', function () { selectNavigating = true; });
    ui.chapterSelect.addEventListener('blur', function () { selectNavigating = false; });
    ui.chapterSelect.addEventListener('change', function () {
      selectNavigating = false;
      onChapterChange();
    });
    ui.copy.addEventListener('click', copySectionLink);
    ui.video.addEventListener('playing', revealVideo);
    ui.video.addEventListener('error', function () {
      if (!ui.backdrop || ui.backdrop.hidden || !ui.video.getAttribute('src')) return;
      if (ui.video.error && ui.video.error.code === 1) return;
      if (!ui.video.paused && ui.video.readyState >= 2) return;
      ui.error.hidden = false;
      showCover('play');
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onWalkthroughLink);
  }

  window.StatisticoDemoVideo = {
    open: open,
    close: close,
    openFromQuery: openFromQuery
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
