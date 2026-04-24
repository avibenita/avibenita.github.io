/**
 * Statistico AI Interpretation Component
 * Calls Google Gemini API to generate context-aware statistical interpretation.
 * API key stored in localStorage; users enter it once.
 */
(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  // Groq hosts Llama models with CORS + free tier (14 400 req/day)
  // Get a free key at https://console.groq.com
  const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
  const MODELS     = [
    'llama-3.1-8b-instant',   // fast, free
    'llama3-8b-8192',         // fallback
    'llama-3.3-70b-versatile', // more capable fallback
  ];
  const KEY_STORE  = 'statistico-groq-key';
  const KEY_URL    = 'https://console.groq.com/keys';

  // ── Per-panel state ────────────────────────────────────────────────────────
  const panelRegistry = new Map(); // targetId → { state, activeTab, modalId, cache }
  let _activeModel = MODELS[0]; // updated after first successful call

  // ── Tiny helpers ───────────────────────────────────────────────────────────
  function safeNum(v, fb) { return Number.isFinite(v) ? v : (fb !== undefined ? fb : 0); }
  function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function getApiKey() { try { return (localStorage.getItem(KEY_STORE) || '').trim(); } catch { return ''; } }
  function setApiKey(k) { try { localStorage.setItem(KEY_STORE, (k || '').trim()); } catch {} }

  // ── Prompt builder ─────────────────────────────────────────────────────────
  function buildPrompt(state, tab) {
    const dist     = state.distributionName || (document.body?.dataset?.distribution || 'distribution').replace(/distribution$/i, ' Distribution');
    const calcType = state.calcType || 'probability';
    const result   = safeNum(state.result);
    const params   = state.params || {};

    const lines = [`Distribution: ${dist}`, `Query type: ${calcType}`, `Result: ${result.toFixed(6)}`];
    if (state.xValue   != null) lines.push(`x value: ${safeNum(state.xValue).toFixed(4)}`);
    if (state.lowerBound != null) lines.push(`Lower bound: ${safeNum(state.lowerBound).toFixed(4)}`);
    if (state.upperBound != null) lines.push(`Upper bound: ${safeNum(state.upperBound).toFixed(4)}`);
    if (state.mean      != null) lines.push(`Mean: ${safeNum(state.mean).toFixed(4)}`);
    if (state.stddev    != null) lines.push(`Std dev: ${safeNum(state.stddev, 1).toFixed(4)}`);
    Object.entries(params).forEach(([k, v]) => { if (Number.isFinite(v)) lines.push(`${k}: ${v}`); });

    const context = lines.join('\n');
    const tasks = {
      interpret: 'Write a clear, precise 2–3 sentence statistical interpretation of these results that a practitioner would find useful. Be specific about what the number means.',
      teach:     'Explain the key statistical concept illustrated by these results in 2–3 sentences aimed at a student learning statistics. Use a helpful analogy if appropriate.',
      apply:     'Describe a concrete real-world scenario in 2–3 sentences where this exact calculation would be used and why it matters.'
    };

    return `You are a concise statistics expert embedded in an interactive calculator.\n\nCurrent calculator state:\n${context}\n\nTask: ${tasks[tab] || tasks.interpret}\n\nRespond with plain text only. No markdown, no bullet points, no headers.`;
  }

  // ── Groq / Llama API call ──────────────────────────────────────────────────
  async function callGemini(prompt, apiKey) {
    let lastErr = null;
    for (const model of MODELS) {
      try {
        const resp = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are a concise statistics expert embedded in an interactive calculator. Respond with plain text only — no markdown, no bullet points, no headers.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.6
          })
        });
        if (!resp.ok) {
          let msg = `HTTP ${resp.status}`;
          try { const e = await resp.json(); msg = e?.error?.message || msg; } catch {}
          if (resp.status === 404 || (msg && msg.toLowerCase().includes('not found'))) {
            lastErr = new Error(msg); continue;
          }
          throw new Error(msg);
        }
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from API.');
        _activeModel = model;
        return text.trim();
      } catch (err) {
        if (err.message && (err.message.toLowerCase().includes('not found') || err.message.toLowerCase().includes('does not exist'))) {
          lastErr = err; continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error('No available Llama model found for this API key.');
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
        border-radius: 8px; padding: 7px 12px; cursor: pointer;
        color: #d8edff; font-size: 0.82rem; font-weight: 600;
        transition: background .2s, border-color .2s, transform .15s;
        width: 100%;
      }
      .st-ai-trigger:hover { background: linear-gradient(135deg,rgba(120,165,255,.28),rgba(242,162,119,.22)); border-color: rgba(120,200,255,.55); transform: translateY(-1px); }
      .st-ai-trigger i { color: #f2a277; font-size: 0.9rem; }
      .st-ai-trigger .st-ai-badge { margin-left: auto; background: rgba(242,162,119,.18); border: 1px solid rgba(242,162,119,.3); border-radius: 999px; padding: 2px 7px; font-size: 0.7rem; color: #f2c59a; }

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

      /* API key setup panel */
      .st-ai-key-panel {
        background: rgba(10,22,42,.85); border: 1px solid rgba(120,200,255,.22); border-radius: 10px;
        padding: 14px; margin-bottom: 12px;
      }
      .st-ai-key-panel h4 { font-size: 0.84rem; color: #ffd2b2; margin: 0 0 6px; }
      .st-ai-key-panel p { font-size: 0.78rem; color: #8aabcc; margin: 0 0 10px; line-height: 1.5; }
      .st-ai-key-panel a { color: #78c8ff; }
      .st-ai-key-row { display: flex; gap: 7px; }
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
    document.head.appendChild(el);
  }

  // ── Build state summary chips ──────────────────────────────────────────────
  function buildStateChips(state) {
    const chips = [];
    const dist = (state.distributionName || document.body?.dataset?.distribution || '').replace(/distribution$/i,'');
    if (dist) chips.push(dist.trim() || 'Distribution');
    if (state.calcType) chips.push(state.calcType);
    if (state.mean      != null) chips.push(`μ = ${safeNum(state.mean).toFixed(3)}`);
    if (state.stddev    != null) chips.push(`σ = ${safeNum(state.stddev,1).toFixed(3)}`);
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
          <div class="st-ai-key-panel" id="${targetId}-key-panel" style="display:none;">
            <h4><i class="fas fa-key"></i> Groq API Key (free)</h4>
            <p>Enter your free Groq API key to enable Llama AI interpretations.<br>
               Get one at <a href="${KEY_URL}" target="_blank" rel="noopener">console.groq.com</a> — free tier, no credit card required.</p>
            <div class="st-ai-key-row">
              <input class="st-ai-key-input" type="password" placeholder="AIza..." id="${targetId}-key-input" autocomplete="off" />
              <button class="st-ai-key-save" id="${targetId}-key-save" type="button">Save</button>
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
            <button class="st-ai-key-btn" id="${targetId}-key-btn" type="button"><i class="fas fa-key"></i> API Key</button>
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

    // API key toggle
    modal.querySelector(`#${targetId}-key-btn`).addEventListener('click', () => {
      const kp = modal.querySelector(`#${targetId}-key-panel`);
      const showing = kp.style.display !== 'none';
      kp.style.display = showing ? 'none' : 'block';
      if (!showing) {
        const inp = modal.querySelector(`#${targetId}-key-input`);
        inp.value = getApiKey();
        inp.focus();
      }
    });

    // Save key
    modal.querySelector(`#${targetId}-key-save`).addEventListener('click', () => {
      const key = modal.querySelector(`#${targetId}-key-input`).value.trim();
      if (!key) return;
      setApiKey(key);
      modal.querySelector(`#${targetId}-key-panel`).style.display = 'none';
      const p = panelRegistry.get(targetId);
      if (p) p.cache = {};
      runInterpretation(targetId);
    });

    return modal;
  }

  // ── Open / close ───────────────────────────────────────────────────────────
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

    // Show key panel if no key stored yet
    const kp = m.querySelector(`#${targetId}-key-panel`);
    const keyExists = !!getApiKey();
    if (!keyExists && kp) {
      kp.style.display = 'block';
      const inp = m.querySelector(`#${targetId}-key-input`);
      if (inp) inp.focus();
    }

    // Refresh chips
    const chips = m.querySelector(`#${targetId}-chips`);
    if (chips) chips.innerHTML = buildStateChips(p.state);

    if (keyExists) runInterpretation(targetId);
  }

  // ── Run AI call ────────────────────────────────────────────────────────────
  async function runInterpretation(targetId) {
    const p = panelRegistry.get(targetId);
    if (!p) return;
    const m = document.getElementById(p.modalId);
    if (!m) return;

    const apiKey = getApiKey();
    const respEl = m.querySelector(`#${targetId}-response`);
    if (!respEl) return;

    if (!apiKey) {
      respEl.className = 'st-ai-response error';
      respEl.textContent = 'No API key configured. Click "API Key" below to add one.';
      return;
    }

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
      const text = await callGemini(prompt, apiKey);
      if (!p.cache) p.cache = {};
      p.cache[cacheKey] = text;
      respEl.className = 'st-ai-response';
      respEl.textContent = text;
      // Update model chip to show whichever model actually responded
      const chipEl = m.querySelector(`#${targetId}-model-chip`);
      if (chipEl) chipEl.textContent = _activeModel;
    } catch (err) {
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
    const apiKey = getApiKey();
    if (!apiKey) return;

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
        const text = await callGemini(buildPrompt(p.state, tab), apiKey);
        if (!p.cache) p.cache = {};
        p.cache[cacheKey] = text;
        textEl.className = 'st-ai-section-text';
        textEl.textContent = text;
        const chip = m.querySelector(`#${targetId}-model-chip`);
        if (chip) chip.textContent = _activeModel;
      } catch (err) {
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
        <span class="st-ai-badge">Gemini</span>
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
  function autoInit() {
    ['aiInsightsMount'].forEach(id => {
      if (document.getElementById(id)) initPanel(id);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  window.StatisticoAIInsights = { update };
})();
