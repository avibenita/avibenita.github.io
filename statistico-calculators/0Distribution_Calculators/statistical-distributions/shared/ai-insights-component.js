/**
 * Statistico AI Interpretation Component
 * Routes prompts through a Cloudflare Worker that validates a license key
 * and proxies to Groq / Llama. The Groq key never touches the browser.
 */
(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  // URL of your deployed Cloudflare Worker (update after deployment)
  const WORKER_URL  = 'https://statistico-ai.avibenita.workers.dev';
  const LICENSE_KEY_STORE = 'statistico-license-key';
  const BUY_URL     = 'https://statistico.live/premium'; // your sales page

  // ── Per-panel state ────────────────────────────────────────────────────────
  const panelRegistry = new Map(); // targetId → { state, activeTab, modalId, cache }
  let _activeModel = 'llama-3.1-8b-instant';

  // ── Tiny helpers ───────────────────────────────────────────────────────────
  function safeNum(v, fb) { return Number.isFinite(v) ? v : (fb !== undefined ? fb : 0); }
  function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function getLicenseKey() { try { return (localStorage.getItem(LICENSE_KEY_STORE) || '').trim(); } catch { return ''; } }
  function setLicenseKey(k) { try { localStorage.setItem(LICENSE_KEY_STORE, (k || '').trim().toUpperCase()); } catch {} }
  function clearLicenseKey() { try { localStorage.removeItem(LICENSE_KEY_STORE); } catch {} }

  // ── Prompt builder ─────────────────────────────────────────────────────────
  function buildPrompt(state, tab) {
    const dist     = state.distributionName || (document.body?.dataset?.distribution || 'distribution').replace(/distribution$/i, ' Distribution');
    const calcType = state.calcType || 'probability';
    const result   = safeNum(state.result);
    const params   = state.params || {};

    const lines = [
      `Distribution: ${dist}`,
      `Query type: ${calcType}`,
      `Expression: ${state.expression || ''}`,
      `Result: ${result}`,
      `Explanation: ${state.explanation || ''}`,
    ];
    if (Number.isFinite(state.xValue))    lines.push(`x value: ${state.xValue}`);
    if (Number.isFinite(state.lowerBound)) lines.push(`Lower bound: ${state.lowerBound}`);
    if (Number.isFinite(state.upperBound)) lines.push(`Upper bound: ${state.upperBound}`);
    if (Number.isFinite(state.mean))       lines.push(`Mean: ${state.mean}`);
    if (Number.isFinite(state.stddev))     lines.push(`Std dev: ${state.stddev}`);
    // Include all numeric params from the distribution config
    Object.entries(params).forEach(([k, v]) => { if (Number.isFinite(v)) lines.push(`${k}: ${v}`); });

    const context = lines.join('\n');
    const tasks = {
      interpret: 'Write a clear, precise 2–3 sentence statistical interpretation of these results that a practitioner would find useful. Be specific about what the number means.',
      teach:     'Explain the key statistical concept illustrated by these results in 2–3 sentences aimed at a student learning statistics. Use a helpful analogy if appropriate.',
      apply:     'Describe a concrete real-world scenario in 2–3 sentences where this exact calculation would be used and why it matters.'
    };

    return `You are a concise statistics expert embedded in an interactive calculator.\n\nCurrent calculator state:\n${context}\n\nTask: ${tasks[tab] || tasks.interpret}\n\nRespond with plain text only. No markdown, no bullet points, no headers.`;
  }

  // ── Worker API call ────────────────────────────────────────────────────────
  async function callWorker(prompt, licenseKey) {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, licenseKey }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const code = data?.code;
      if (code === 'NO_KEY' || code === 'INVALID_KEY') {
        const err = new Error(data.error || 'Invalid license key');
        err.code = code;
        throw err;
      }
      throw new Error(data?.error || `Server error ${resp.status}`);
    }
    if (data.model) _activeModel = data.model;
    return data.text;
  }

  // ── Self-contained CSS ─────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('st-ai-insights-css')) return;
    const el = document.createElement('style');
    el.id = 'st-ai-insights-css';
    el.textContent = `
      /* ── Inline trigger button ── */
      .st-ai-trigger {
        display: inline-flex; align-items: center; gap: 7px;
        background: linear-gradient(135deg, rgba(120,165,255,.18), rgba(242,162,119,.14));
        border: 1px solid rgba(120,200,255,.32);
        border-radius: 8px; padding: 7px 18px; cursor: pointer;
        color: #d8edff; font-size: 0.82rem; font-weight: 600;
        transition: background .2s, border-color .2s, transform .15s;
      }
      .st-ai-trigger:hover { background: linear-gradient(135deg,rgba(120,165,255,.28),rgba(242,162,119,.22)); border-color: rgba(120,200,255,.55); transform: translateY(-1px); }
      .st-ai-trigger i { color: #f2a277; font-size: 0.9rem; }
      .st-ai-trigger .st-ai-badge { background: rgba(242,162,119,.18); border: 1px solid rgba(242,162,119,.3); border-radius: 999px; padding: 2px 7px; font-size: 0.7rem; color: #f2c59a; }
      /* Wrapper to center the trigger */
      #aiInsightsMount { display: flex; justify-content: center; }

      /* ── Modal overlay ── */
      .st-ai-modal {
        display: none; position: fixed; inset: 0; z-index: 2147483500;
        align-items: center; justify-content: center; padding: 16px;
        background: rgba(4,12,26,.62); backdrop-filter: blur(3px);
      }
      .st-ai-modal.open { display: flex; }

      /* ── Dialog box ── */
      .st-ai-dialog {
        width: min(560px, 95vw); max-height: 80vh; overflow: hidden;
        background: linear-gradient(155deg,#0c1e38,#091525);
        border: 1px solid rgba(120,200,255,.28); border-radius: 14px;
        box-shadow: 0 24px 56px rgba(2,8,20,.65); display: flex; flex-direction: column;
      }

      /* Header */
      .st-ai-head {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 14px; border-bottom: 1px solid rgba(120,200,255,.18);
        background: linear-gradient(90deg,rgba(16,32,60,.9),rgba(10,24,48,.9));
        flex-shrink: 0;
      }
      .st-ai-head-title { font-size: 0.93rem; font-weight: 700; color: #d8edff; display: flex; align-items: center; gap: 7px; }
      .st-ai-head-title i { color: #f2a277; }
      .st-ai-model-chip { font-size: 0.68rem; background: rgba(120,200,255,.12); border: 1px solid rgba(120,200,255,.25); border-radius: 999px; padding: 2px 7px; color: #9ab1cc; }
      .st-ai-close { margin-left: auto; background: none; border: none; color: #9ab1cc; cursor: pointer; font-size: 1rem; padding: 2px 4px; border-radius: 5px; transition: color .2s; }
      .st-ai-close:hover { color: #f2a277; }

      /* Tabs */
      .st-ai-tabs { display: flex; gap: 4px; padding: 10px 14px 0; flex-shrink: 0; border-bottom: 1px solid rgba(120,200,255,.12); }
      .st-ai-tab {
        padding: 6px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
        background: none; border: none; border-bottom: 2px solid transparent;
        color: #7a9ab8; margin-bottom: -1px; transition: color .18s, border-color .18s;
      }
      .st-ai-tab:hover { color: #b8d8f0; }
      .st-ai-tab.active { color: #f2a277; border-bottom-color: #f2a277; }

      /* Content area */
      .st-ai-body { padding: 14px; overflow-y: auto; flex: 1; }

      /* State chip row */
      .st-ai-state-row {
        display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px;
      }
      .st-ai-chip {
        font-size: 0.7rem; padding: 2px 7px; border-radius: 999px;
        background: rgba(120,200,255,.1); border: 1px solid rgba(120,200,255,.22); color: #9ab1cc;
      }

      /* Response text */
      .st-ai-response {
        font-size: 0.88rem; line-height: 1.65; color: #c8dff5; min-height: 48px;
      }
      .st-ai-response.loading { color: #7a9ab8; font-style: italic; }
      .st-ai-response.error { color: #f97777; }

      /* Loading dots animation */
      .st-ai-dots::after {
        content: '';
        animation: stAiDots 1.4s steps(4, end) infinite;
      }
      @keyframes stAiDots { 0%{content:'.'} 33%{content:'..'} 66%{content:'...'} 100%{content:''} }

      /* Regenerate + settings row */
      .st-ai-actions {
        display: flex; align-items: center; gap: 8px; margin-top: 12px;
        padding-top: 10px; border-top: 1px solid rgba(120,200,255,.14);
      }
      .st-ai-regen-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
        background: rgba(120,165,255,.14); border: 1px solid rgba(120,165,255,.3); color: #a8c8f0;
        transition: background .2s;
      }
      .st-ai-regen-btn:hover { background: rgba(120,165,255,.25); }
      .st-ai-key-btn {
        margin-left: auto; padding: 5px 10px; border-radius: 7px; font-size: 0.73rem;
        background: none; border: 1px solid rgba(120,200,255,.2); color: #6a8aaa; cursor: pointer;
        transition: color .2s, border-color .2s;
      }
      .st-ai-key-btn:hover { color: #9ab1cc; border-color: rgba(120,200,255,.4); }

      /* ── License / unlock panel ── */
      .st-ai-unlock-panel {
        background: linear-gradient(135deg, rgba(10,22,42,.95), rgba(16,30,56,.95));
        border: 1px solid rgba(242,162,119,.35); border-radius: 12px;
        padding: 18px 16px; margin-bottom: 12px; text-align: center;
      }
      .st-ai-unlock-panel .st-ai-unlock-icon { font-size: 1.6rem; margin-bottom: 8px; }
      .st-ai-unlock-panel h4 { font-size: 0.92rem; color: #ffd2b2; margin: 0 0 5px; font-weight: 700; }
      .st-ai-unlock-panel p  { font-size: 0.78rem; color: #8aabcc; margin: 0 0 12px; line-height: 1.5; }
      .st-ai-buy-btn {
        display: inline-flex; align-items: center; gap: 7px;
        background: linear-gradient(135deg, #f97316, #ef4444); border: none; border-radius: 8px;
        padding: 9px 22px; font-size: 0.82rem; font-weight: 700; color: #fff; cursor: pointer;
        text-decoration: none; transition: opacity .2s, transform .15s;
      }
      .st-ai-buy-btn:hover { opacity: .88; transform: translateY(-1px); }
      .st-ai-key-toggle { background: none; border: none; color: #78c8ff; font-size: 0.74rem; cursor: pointer; margin-top: 10px; display: block; text-align: center; width: 100%; }
      .st-ai-key-toggle:hover { text-decoration: underline; }
      .st-ai-key-row { display: flex; gap: 7px; margin-top: 10px; }
      .st-ai-key-input {
        flex: 1; padding: 6px 10px; border-radius: 7px; font-size: 0.8rem;
        background: rgba(255,255,255,.06); border: 1px solid rgba(120,200,255,.25); color: #d8edff;
        outline: none;
      }
      .st-ai-key-input:focus { border-color: rgba(120,200,255,.55); }
      .st-ai-key-save {
        padding: 6px 14px; border-radius: 7px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
        background: #f97316; border: none; color: #fff; transition: opacity .2s;
      }
      /* Copy button */
      .st-ai-copy-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
        background: rgba(120,200,255,.1); border: 1px solid rgba(120,200,255,.25); color: #a8c8f0;
        transition: background .2s;
      }
      .st-ai-copy-btn:hover { background: rgba(120,200,255,.22); }
      .st-ai-copy-btn.copied { color: #6ee7b7; border-color: rgba(110,231,183,.4); background: rgba(110,231,183,.1); }

      /* Full-view toggle */
      .st-ai-fullview-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
        background: rgba(242,162,119,.12); border: 1px solid rgba(242,162,119,.28); color: #f2c59a;
        transition: background .2s;
      }
      .st-ai-fullview-btn:hover { background: rgba(242,162,119,.22); }

      /* Full-view expanded panel */
      .st-ai-fullview-panel { display: none; }
      .st-ai-fullview-panel.open { display: block; }
      .st-ai-section {
        margin-bottom: 14px; padding: 12px 14px;
        background: rgba(255,255,255,.04); border: 1px solid rgba(120,200,255,.14); border-radius: 9px;
      }
      .st-ai-section-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 8px;
      }
      .st-ai-section-label {
        font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
        color: #f2a277;
      }
      .st-ai-section-copy {
        background: none; border: none; color: #5a7a9a; cursor: pointer; font-size: 0.78rem; padding: 2px 6px; border-radius: 5px;
      }
      .st-ai-section-copy:hover { color: #9ab1cc; }
      .st-ai-section-text { font-size: 0.87rem; line-height: 1.65; color: #c8dff5; }
      .st-ai-section-text.loading { color: #7a9ab8; font-style: italic; }
      .st-ai-section-text.error { color: #f97777; }
    `;
    document.head.appendChild(el);
  }

  // ── Build state summary chips ──────────────────────────────────────────────
  function buildStateChips(state) {
    const chips = [];
    const dist = (state.distributionName || document.body?.dataset?.distribution || '').replace(/distribution$/i,'');
    if (dist) chips.push(dist.trim() || 'Distribution');
    if (state.calcType) chips.push(state.calcType);
    if (state.mean      != null) chips.push(`mean = ${safeNum(state.mean).toFixed(3)}`);
    if (state.stddev    != null) chips.push(`sd = ${safeNum(state.stddev,1).toFixed(3)}`);
    if (state.xValue    != null) chips.push(`x = ${safeNum(state.xValue).toFixed(3)}`);
    if (state.result    != null) chips.push(`result = ${safeNum(state.result).toFixed(4)}`);
    return chips.map(c => `<span class="st-ai-chip">${esc(c)}</span>`).join('');
  }

  // ── Modal creation ─────────────────────────────────────────────────────────
  function ensureModal(targetId) {
    const panel = panelRegistry.get(targetId);
    if (!panel) return null;
    const existing = document.getElementById(panel.modalId);
    if (existing) return existing;

    const modal = document.createElement('div');
    modal.id = panel.modalId;
    modal.className = 'st-ai-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="st-ai-dialog" role="dialog" aria-modal="true" aria-label="AI Interpretation">
        <div class="st-ai-head">
          <span class="st-ai-head-title"><i class="fas fa-sparkles"></i> AI Interpretation</span>
          <span class="st-ai-model-chip" id="${targetId}-model-chip">${_activeModel}</span>
          <button class="st-ai-close" type="button" aria-label="Close"><i class="fas fa-times"></i></button>
        </div>
        <div class="st-ai-tabs">
          <button class="st-ai-tab active" data-tab="interpret" type="button">Interpret</button>
          <button class="st-ai-tab" data-tab="teach" type="button">Teach</button>
          <button class="st-ai-tab" data-tab="apply" type="button">Apply</button>
        </div>
        <div class="st-ai-body">
          <div class="st-ai-state-row" id="${targetId}-chips"></div>
          <!-- Unlock panel — shown when no valid license key is stored -->
          <div class="st-ai-unlock-panel" id="${targetId}-unlock" style="display:none;">
            <div class="st-ai-unlock-icon">✨</div>
            <h4>AI Interpretation — Premium Feature</h4>
            <p>Unlock instant AI-powered interpretations, teaching explanations,<br>and real-world application examples for every calculation.</p>
            <a class="st-ai-buy-btn" href="${BUY_URL}" target="_blank" rel="noopener">
              <i class="fas fa-star"></i> Get Premium Access
            </a>
            <button class="st-ai-key-toggle" id="${targetId}-key-toggle" type="button">Already have a license key?</button>
            <div id="${targetId}-key-row" style="display:none;">
              <div class="st-ai-key-row">
                <input class="st-ai-key-input" type="text" placeholder="STAT-XXXX-XXXX-XXXX" id="${targetId}-key-input" autocomplete="off" spellcheck="false" />
                <button class="st-ai-key-save" id="${targetId}-key-save" type="button">Activate</button>
              </div>
            </div>
          </div>
          <div class="st-ai-response" id="${targetId}-response">Press a tab to generate an interpretation.</div>
          <!-- Full-view panel: all 3 sections at once -->
          <div class="st-ai-fullview-panel" id="${targetId}-fullview">
            ${['interpret','teach','apply'].map(tab => `
            <div class="st-ai-section" id="${targetId}-fv-${tab}">
              <div class="st-ai-section-head">
                <span class="st-ai-section-label">${tab}</span>
                <button class="st-ai-section-copy" data-fv-copy="${tab}" type="button" title="Copy"><i class="fas fa-copy"></i></button>
              </div>
              <div class="st-ai-section-text loading st-ai-dots" id="${targetId}-fv-text-${tab}">Generating</div>
            </div>`).join('')}
          </div>
          <div class="st-ai-actions">
            <button class="st-ai-regen-btn" id="${targetId}-regen" type="button"><i class="fas fa-rotate-right"></i> Regenerate</button>
            <button class="st-ai-copy-btn" id="${targetId}-copy" type="button"><i class="fas fa-copy"></i> Copy</button>
            <button class="st-ai-fullview-btn" id="${targetId}-fullview-btn" type="button"><i class="fas fa-expand"></i> Full View</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(targetId); });
    modal.querySelector('.st-ai-close').addEventListener('click', () => closeModal(targetId));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(targetId); });

    // Tabs
    modal.querySelectorAll('.st-ai-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.st-ai-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = panelRegistry.get(targetId);
        if (p) { p.activeTab = btn.dataset.tab; p.cache = {}; }
        runInterpretation(targetId);
      });
    });

    // Regenerate
    modal.querySelector(`#${targetId}-regen`).addEventListener('click', () => {
      const p = panelRegistry.get(targetId);
      if (p) p.cache = {};
      const fvOpen = modal.querySelector(`#${targetId}-fullview`).classList.contains('open');
      if (fvOpen) runFullView(targetId, true);
      else runInterpretation(targetId);
    });

    // Copy current tab text
    modal.querySelector(`#${targetId}-copy`).addEventListener('click', () => {
      const respEl = modal.querySelector(`#${targetId}-response`);
      const text = respEl ? respEl.textContent : '';
      if (!text || text === 'Press a tab to generate an interpretation.') return;
      navigator.clipboard.writeText(text).then(() => {
        const btn = modal.querySelector(`#${targetId}-copy`);
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> Copied';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
      }).catch(() => {});
    });

    // Per-section copy in full view
    modal.querySelectorAll('[data-fv-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-fv-copy');
        const textEl = modal.querySelector(`#${targetId}-fv-text-${tab}`);
        const text = textEl ? textEl.textContent : '';
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
        }).catch(() => {});
      });
    });

    // Full View toggle
    modal.querySelector(`#${targetId}-fullview-btn`).addEventListener('click', () => {
      const fvPanel = modal.querySelector(`#${targetId}-fullview`);
      const singleResp = modal.querySelector(`#${targetId}-response`);
      const tabsEl = modal.querySelector('.st-ai-tabs');
      const btn = modal.querySelector(`#${targetId}-fullview-btn`);
      const isOpen = fvPanel.classList.contains('open');
      if (isOpen) {
        fvPanel.classList.remove('open');
        singleResp.style.display = '';
        tabsEl.style.display = '';
        btn.innerHTML = '<i class="fas fa-expand"></i> Full View';
      } else {
        fvPanel.classList.add('open');
        singleResp.style.display = 'none';
        tabsEl.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-compress"></i> Collapse';
        runFullView(targetId, false);
      }
    });

    // License key toggle ("Already have a key?")
    const keyToggle = modal.querySelector(`#${targetId}-key-toggle`);
    const keyRow    = modal.querySelector(`#${targetId}-key-row`);
    if (keyToggle && keyRow) {
      keyToggle.addEventListener('click', () => {
        const visible = keyRow.style.display !== 'none';
        keyRow.style.display = visible ? 'none' : 'block';
        keyToggle.textContent = visible ? 'Already have a license key?' : 'Hide';
        if (!visible) modal.querySelector(`#${targetId}-key-input`)?.focus();
      });
    }

    // Activate license key
    const keySave = modal.querySelector(`#${targetId}-key-save`);
    if (keySave) {
      keySave.addEventListener('click', () => {
        const inp = modal.querySelector(`#${targetId}-key-input`);
        const key = (inp?.value || '').trim().toUpperCase();
        if (!key) return;
        setLicenseKey(key);
        const p = panelRegistry.get(targetId);
        if (p) p.cache = {};
        showUnlockPanel(targetId, false);
        runInterpretation(targetId);
      });
    }

    return modal;
  }

  // ── Open / close ───────────────────────────────────────────────────────────
  function showUnlockPanel(targetId, show) {
    const m = document.getElementById(panelRegistry.get(targetId)?.modalId);
    if (!m) return;
    const unlock  = m.querySelector(`#${targetId}-unlock`);
    const respEl  = m.querySelector(`#${targetId}-response`);
    const tabs    = m.querySelector('.st-ai-tabs');
    const actions = m.querySelector('.st-ai-actions');
    if (unlock)  unlock.style.display  = show ? 'block' : 'none';
    if (respEl)  respEl.style.display  = show ? 'none'  : '';
    if (tabs)    tabs.style.display    = show ? 'none'  : '';
    if (actions) actions.style.display = show ? 'none'  : '';
  }

  function closeModal(targetId) {
    const p = panelRegistry.get(targetId);
    if (!p) return;
    const m = document.getElementById(p.modalId);
    if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
  }

  function openModal(targetId) {
    const p = panelRegistry.get(targetId);
    if (!p) return;
    const m = ensureModal(targetId);
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden','false');

    // Refresh chips
    const chips = m.querySelector(`#${targetId}-chips`);
    if (chips) chips.innerHTML = buildStateChips(p.state);

    const key = getLicenseKey();
    if (!key) {
      showUnlockPanel(targetId, true);
    } else {
      showUnlockPanel(targetId, false);
      runInterpretation(targetId);
    }
  }

  // ── Run AI call ────────────────────────────────────────────────────────────
  async function runInterpretation(targetId) {
    const p = panelRegistry.get(targetId);
    if (!p) return;
    const m = document.getElementById(p.modalId);
    if (!m) return;

    const licenseKey = getLicenseKey();
    if (!licenseKey) { showUnlockPanel(targetId, true); return; }

    const respEl = m.querySelector(`#${targetId}-response`);
    if (!respEl) return;

    // Cache hit
    const cacheKey = p.activeTab + JSON.stringify(p.state);
    if (p.cache && p.cache[cacheKey]) {
      respEl.className = 'st-ai-response';
      respEl.textContent = p.cache[cacheKey];
      return;
    }

    // Loading state
    respEl.className = 'st-ai-response loading';
    respEl.innerHTML = '<span class="st-ai-dots">Generating interpretation</span>';

    // Refresh chips
    const chips = m.querySelector(`#${targetId}-chips`);
    if (chips) chips.innerHTML = buildStateChips(p.state);

    try {
      const prompt = buildPrompt(p.state, p.activeTab);
      const text = await callWorker(prompt, licenseKey);
      if (!p.cache) p.cache = {};
      p.cache[cacheKey] = text;
      respEl.className = 'st-ai-response';
      respEl.textContent = text;
      const chipEl = m.querySelector(`#${targetId}-model-chip`);
      if (chipEl) chipEl.textContent = _activeModel;
    } catch (err) {
      if (err.code === 'NO_KEY' || err.code === 'INVALID_KEY') {
        clearLicenseKey();
        showUnlockPanel(targetId, true);
        // Show error hint inside unlock panel
        const keyRow = m.querySelector(`#${targetId}-key-row`);
        const keyToggle = m.querySelector(`#${targetId}-key-toggle`);
        if (keyRow) keyRow.style.display = 'block';
        if (keyToggle) keyToggle.textContent = 'Hide';
        const inp = m.querySelector(`#${targetId}-key-input`);
        if (inp) { inp.style.borderColor = '#ef4444'; inp.placeholder = 'Key not recognised — try again'; inp.focus(); }
        return;
      }
      respEl.className = 'st-ai-response error';
      respEl.textContent = `Error: ${err.message}`;
    }
  }

  // ── Run all 3 tabs for full view ────────────────────────────────────────────
  async function runFullView(targetId, forceRefresh) {
    const p = panelRegistry.get(targetId);
    if (!p) return;
    const m = document.getElementById(p.modalId);
    if (!m) return;
    const licenseKey = getLicenseKey();
    if (!licenseKey) { showUnlockPanel(targetId, true); return; }

    const tabs = ['interpret', 'teach', 'apply'];
    if (forceRefresh) p.cache = {};

    await Promise.all(tabs.map(async tab => {
      const textEl = m.querySelector(`#${targetId}-fv-text-${tab}`);
      if (!textEl) return;

      const cacheKey = tab + JSON.stringify(p.state);
      if (!forceRefresh && p.cache && p.cache[cacheKey]) {
        textEl.className = 'st-ai-section-text';
        textEl.textContent = p.cache[cacheKey];
        return;
      }

      textEl.className = 'st-ai-section-text loading st-ai-dots';
      textEl.textContent = 'Generating';
      try {
        const text = await callWorker(buildPrompt(p.state, tab), licenseKey);
        if (!p.cache) p.cache = {};
        p.cache[cacheKey] = text;
        textEl.className = 'st-ai-section-text';
        textEl.textContent = text;
        const chip = m.querySelector(`#${targetId}-model-chip`);
        if (chip) chip.textContent = _activeModel;
      } catch (err) {
        if (err.code === 'NO_KEY' || err.code === 'INVALID_KEY') {
          clearLicenseKey(); showUnlockPanel(targetId, true); return;
        }
        textEl.className = 'st-ai-section-text error';
        textEl.textContent = `Error: ${err.message}`;
      }
    }));
  }


  function initPanel(targetId) {
    const mount = document.getElementById(targetId);
    if (!mount) return;

    if (!panelRegistry.has(targetId)) {
      panelRegistry.set(targetId, {
        state: {}, activeTab: 'interpret',
        modalId: `st-ai-modal-${targetId}`, cache: {}
      });
    }

    injectStyles();

    mount.innerHTML = `
      <button class="st-ai-trigger" type="button" id="${targetId}-open-btn">
        <i class="fas fa-sparkles"></i>
        Get AI Interpretation
        <span class="st-ai-badge">Llama</span>
      </button>
    `;

    ensureModal(targetId);

    mount.querySelector(`#${targetId}-open-btn`).addEventListener('click', () => openModal(targetId));
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function update(targetId, state) {
    if (!document.getElementById(targetId)) return;
    initPanel(targetId);
    const p = panelRegistry.get(targetId);
    if (!p) return;
    p.state = state || {};
    p.cache = {}; // invalidate cache when state changes
  }

  // Auto-init any aiInsightsMount element as soon as the DOM is ready
  // so the button appears even before the first calculation runs.
  // Also flush any state queued by the runtime (which loads before this script).
  function autoInit() {
    ['aiInsightsMount'].forEach(id => {
      if (document.getElementById(id)) initPanel(id);
    });
    // Flush state queued by distribution-template-runtime before this script loaded
    if (window.__statAIStateQueue) {
      const q = window.__statAIStateQueue;
      window.__statAIStateQueue = null;
      const p = panelRegistry.get('aiInsightsMount');
      if (p) {
        p.state = q;
        p.cache = {};
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  window.StatisticoAIInsights = { update };
})();
