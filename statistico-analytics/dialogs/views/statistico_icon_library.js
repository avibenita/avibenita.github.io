// Statistico Icon Library
// Version 1.0
// Monoline SVG icon system for analytics / statistics UI
// Usage:
//   1. Include this file in your page.
//   2. Add placeholders like: <span data-statistico-icon="regression"></span>
//   3. Call: StatisticoIcons.render();
//   4. Optional: StatisticoIcons.render(document.querySelector('.sidebar'))
//
// Design goals:
// - Clean, modern, mathematical look
// - Consistent 24x24 viewBox
// - currentColor-driven styling
// - Suitable for taskpane, hub, module cards, tabs, and section headers

(function (global) {
  'use strict';

  const DEFAULT_ATTRS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.7',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true'
  };

  function attrsToString(attrs) {
    return Object.entries(attrs)
      .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
      .join(' ');
  }

  function makeIcon(paths, extraAttrs) {
    const attrs = Object.assign({}, DEFAULT_ATTRS, extraAttrs || {});
    return `<svg ${attrsToString(attrs)}>${paths.join('')}</svg>`;
  }

  const icons = {
    distributions: () => makeIcon([
      '<path d="M2 15 C5.5 7.5, 9 5, 12 5 C15 5, 18.5 7.5, 22 15"/>',
      '<path d="M5.5 15 H18.5" opacity="0.28"/>',
      '<path d="M12 5 V19" opacity="0.18"/>'
    ]),

    normal: () => makeIcon([
      '<path d="M2 15 C5.5 7, 9 4, 12 4 C15 4, 18.5 7, 22 15"/>',
      '<path d="M6 15 C7.6 12.4, 9.4 10.7, 12 10.7 C14.6 10.7, 16.4 12.4, 18 15" opacity="0.25"/>',
      '<path d="M4 15 H20" opacity="0.25"/>'
    ]),

    ttest: () => makeIcon([
      '<path d="M3 16 H21" opacity="0.22"/>',
      '<path d="M5 14 C7 8.5, 10 6, 12 6 C14 6, 17 8.5, 19 14"/>',
      '<path d="M12 4 V18"/>',
      '<path d="M10 6 H14"/>'
    ]),

    chisquare: () => makeIcon([
      '<path d="M4 18 H20" opacity="0.25"/>',
      '<path d="M5 18 C8.5 17.5, 9 14.5, 10.2 11.5 C11.5 8.3, 13.1 6.5, 19 6"/>',
      '<path d="M6 6 V18" opacity="0.25"/>'
    ]),

    scatter: () => makeIcon([
      '<circle cx="6" cy="16" r="1.4"/>',
      '<circle cx="10" cy="13" r="1.4"/>',
      '<circle cx="14" cy="10" r="1.4"/>',
      '<circle cx="18" cy="7" r="1.4"/>',
      '<path d="M5 17 L19 6" opacity="0.28"/>'
    ]),

    correlation: () => makeIcon([
      '<circle cx="6" cy="16" r="1.4"/>',
      '<circle cx="9.5" cy="13.2" r="1.4"/>',
      '<circle cx="13.2" cy="10.8" r="1.4"/>',
      '<circle cx="17.5" cy="7.2" r="1.4"/>',
      '<path d="M4.8 17.2 C8.1 14.8, 11.8 12, 19 6" opacity="0.32"/>',
      '<path d="M4 19 V5" opacity="0.18"/>',
      '<path d="M4 19 H20" opacity="0.18"/>'
    ]),

    partialCorrelation: () => makeIcon([
      '<circle cx="6" cy="16" r="1.2"/>',
      '<circle cx="18" cy="8" r="1.2"/>',
      '<circle cx="12" cy="12" r="1.2"/>',
      '<path d="M7.2 15.2 L10.8 12.8"/>',
      '<path d="M13.2 11.2 L16.8 8.8"/>',
      '<path d="M6 20 V4" opacity="0.18"/>',
      '<path d="M4 18 H20" opacity="0.18"/>'
    ]),

    regression: () => makeIcon([
      '<path d="M4 18 H20" opacity="0.18"/>',
      '<path d="M6 20 V4" opacity="0.18"/>',
      '<path d="M5 16.5 L19 7.5"/>',
      '<circle cx="7" cy="15" r="1.1"/>',
      '<circle cx="10" cy="13.1" r="1.1"/>',
      '<circle cx="13.6" cy="11.2" r="1.1"/>',
      '<circle cx="17.2" cy="9.2" r="1.1"/>'
    ]),

    logisticRegression: () => makeIcon([
      '<path d="M4 18 H20" opacity="0.18"/>',
      '<path d="M6 20 V4" opacity="0.18"/>',
      '<path d="M6 17 C7.5 17, 8.4 16.8, 9.3 16 C10.2 15.1, 10.7 13.6, 11.4 12 C12 10.6, 12.7 9.3, 13.8 8.3 C15 7.1, 16.7 6.5, 19 6.5"/>',
      '<circle cx="8" cy="16.3" r="1"/>',
      '<circle cx="12" cy="12" r="1"/>',
      '<circle cx="17" cy="7.4" r="1"/>'
    ]),

    residuals: () => makeIcon([
      '<path d="M5 16 L19 8" opacity="0.4"/>',
      '<circle cx="7" cy="13" r="1.1"/>',
      '<circle cx="12" cy="11.5" r="1.1"/>',
      '<circle cx="17" cy="10" r="1.1"/>',
      '<path d="M7 13 V14.7"/>',
      '<path d="M12 11.5 V10.2"/>',
      '<path d="M17 10 V8.9"/>'
    ]),

    anova: () => makeIcon([
      '<rect x="4" y="11" width="3" height="7" rx="0.8"/>',
      '<rect x="10.5" y="7" width="3" height="11" rx="0.8"/>',
      '<rect x="17" y="13" width="3" height="5" rx="0.8"/>',
      '<path d="M3 19 H21" opacity="0.22"/>'
    ]),

    repeatedMeasures: () => makeIcon([
      '<circle cx="6" cy="12" r="1.2"/>',
      '<circle cx="12" cy="8" r="1.2"/>',
      '<circle cx="18" cy="12" r="1.2"/>',
      '<circle cx="12" cy="16" r="1.2"/>',
      '<path d="M7.2 11.2 L10.8 8.8 L16.8 11.2 L13.2 15.2 L7.2 11.2"/>',
      '<path d="M12 8 V16" opacity="0.25"/>'
    ]),

    nonparametric: () => makeIcon([
      '<path d="M4 18 H20" opacity="0.2"/>',
      '<path d="M6 16.5 C8.2 12, 10.4 13.5, 12 10.8 C13.4 8.5, 15.4 9.2, 18 6.5"/>',
      '<path d="M6 7 L8 9 L6 11" opacity="0.35"/>',
      '<path d="M18 13 L16 15 L18 17" opacity="0.35"/>'
    ]),

    factorAnalysis: () => makeIcon([
      '<rect x="4" y="5" width="4" height="4" rx="0.7"/>',
      '<rect x="10" y="5" width="4" height="4" rx="0.7"/>',
      '<rect x="16" y="5" width="4" height="4" rx="0.7"/>',
      '<rect x="7" y="13" width="10" height="6" rx="0.9" opacity="0.18"/>',
      '<path d="M6 10.5 C8.2 12.2, 9.8 13.1, 12 13.8"/>',
      '<path d="M12 10.5 C12 11.8, 12 12.5, 12 13.8"/>',
      '<path d="M18 10.5 C15.8 12.2, 14.2 13.1, 12 13.8"/>'
    ]),

    pca: () => makeIcon([
      '<path d="M5 19 V5" opacity="0.18"/>',
      '<path d="M5 19 H19" opacity="0.18"/>',
      '<circle cx="8" cy="15" r="1.1"/>',
      '<circle cx="11" cy="12.5" r="1.1"/>',
      '<circle cx="14.5" cy="10" r="1.1"/>',
      '<circle cx="17" cy="8" r="1.1"/>',
      '<path d="M6.7 16.3 L18.3 6.7" opacity="0.42"/>'
    ]),

    reliability: () => makeIcon([
      '<path d="M6 9.5 C6 7, 8.1 5, 10.6 5 H13.4 C15.9 5, 18 7, 18 9.5"/>',
      '<rect x="5" y="9.5" width="14" height="9.5" rx="2"/>',
      '<path d="M12 12 V16"/>',
      '<path d="M10.5 13.5 H13.5"/>'
    ]),

    cronbachAlpha: () => makeIcon([
      '<circle cx="12" cy="12" r="7"/>',
      '<path d="M12 5 V19" opacity="0.22"/>',
      '<path d="M5 12 H19" opacity="0.22"/>',
      '<path d="M7.8 16.2 L16.2 7.8"/>',
      '<path d="M11.2 14.8 L16.2 14.8 L16.2 9.8"/>'
    ]),

    matrix: () => makeIcon([
      '<rect x="4" y="5" width="4" height="4" rx="0.6"/>',
      '<rect x="10" y="5" width="4" height="4" rx="0.6"/>',
      '<rect x="16" y="5" width="4" height="4" rx="0.6"/>',
      '<rect x="4" y="11" width="4" height="4" rx="0.6"/>',
      '<rect x="10" y="11" width="4" height="4" rx="0.6"/>',
      '<rect x="16" y="11" width="4" height="4" rx="0.6"/>',
      '<rect x="4" y="17" width="4" height="2" rx="0.6" opacity="0.25"/>',
      '<rect x="10" y="17" width="4" height="2" rx="0.6" opacity="0.25"/>',
      '<rect x="16" y="17" width="4" height="2" rx="0.6" opacity="0.25"/>'
    ]),

    dashboard: () => makeIcon([
      '<path d="M4 13 A8 8 0 1 1 20 13"/>',
      '<path d="M12 13 L17 9"/>',
      '<circle cx="12" cy="13" r="1.2"/>',
      '<path d="M7 17 H17" opacity="0.22"/>'
    ]),

    histogram: () => makeIcon([
      '<path d="M3 19 H21" opacity="0.22"/>',
      '<rect x="5" y="12" width="3" height="7" rx="0.6"/>',
      '<rect x="9" y="8" width="3" height="11" rx="0.6"/>',
      '<rect x="13" y="6" width="3" height="13" rx="0.6"/>',
      '<rect x="17" y="10" width="3" height="9" rx="0.6"/>'
    ]),

    boxplot: () => makeIcon([
      '<path d="M4 12 H8"/>',
      '<path d="M16 12 H20"/>',
      '<rect x="8" y="8" width="8" height="8" rx="0.8"/>',
      '<path d="M12 6 V18"/>',
      '<path d="M10 12 H14" opacity="0.35"/>'
    ]),

    qqplot: () => makeIcon([
      '<path d="M5 19 V5" opacity="0.18"/>',
      '<path d="M5 19 H19" opacity="0.18"/>',
      '<path d="M7 17 L17 7" opacity="0.32"/>',
      '<circle cx="8" cy="16" r="1.05"/>',
      '<circle cx="11" cy="13" r="1.05"/>',
      '<circle cx="13.5" cy="10.8" r="1.05"/>',
      '<circle cx="16.2" cy="8.9" r="1.05"/>'
    ]),

    controlChart: () => makeIcon([
      '<path d="M4 7 H20" opacity="0.22"/>',
      '<path d="M4 12 H20"/>',
      '<path d="M4 17 H20" opacity="0.22"/>',
      '<path d="M5 13.5 L8 10.8 L11 14 L14 8.5 L17 12 L19 10.5"/>'
    ]),

    capability: () => makeIcon([
      '<path d="M4 18 H20" opacity="0.22"/>',
      '<path d="M5 18 C8 9, 16 9, 19 18"/>',
      '<path d="M8 7 V18" opacity="0.3"/>',
      '<path d="M16 7 V18" opacity="0.3"/>'
    ]),

    power: () => makeIcon([
      '<circle cx="12" cy="12" r="6.8"/>',
      '<circle cx="12" cy="12" r="2.2"/>',
      '<path d="M4 16 C7.5 11.2, 12.2 10.4, 20 6" opacity="0.35"/>'
    ]),

    effectSize: () => makeIcon([
      '<path d="M4 12 H20" opacity="0.22"/>',
      '<circle cx="8" cy="12" r="2.2"/>',
      '<circle cx="16" cy="12" r="4" opacity="0.2"/>',
      '<path d="M10.5 12 H12.8"/>',
      '<path d="M11.7 10.9 L12.8 12 L11.7 13.1"/>'
    ]),

    hypothesis: () => makeIcon([
      '<path d="M4 18 H20" opacity="0.22"/>',
      '<path d="M6 15 C8.4 9, 10.2 6.8, 12 6.8 C13.8 6.8, 15.6 9, 18 15"/>',
      '<path d="M15.5 15 H20" opacity="0.32"/>',
      '<path d="M15.5 13.2 V16.8" opacity="0.32"/>'
    ]),

    samples: () => makeIcon([
      '<circle cx="8" cy="9" r="2.2"/>',
      '<circle cx="16" cy="9" r="2.2"/>',
      '<path d="M5.3 17.5 C5.8 15.3, 7 14.2, 8 14.2 C9 14.2, 10.2 15.3, 10.7 17.5"/>',
      '<path d="M13.3 17.5 C13.8 15.3, 15 14.2, 16 14.2 C17 14.2, 18.2 15.3, 18.7 17.5"/>'
    ]),

    table: () => makeIcon([
      '<rect x="4" y="5" width="16" height="14" rx="1.2"/>',
      '<path d="M4 10 H20"/>',
      '<path d="M4 14.5 H20" opacity="0.35"/>',
      '<path d="M10 5 V19"/>',
      '<path d="M15 5 V19" opacity="0.35"/>'
    ]),

    settings: () => makeIcon([
      '<circle cx="12" cy="12" r="2.5"/>',
      '<path d="M12 4.5 V6.4"/>',
      '<path d="M12 17.6 V19.5"/>',
      '<path d="M4.5 12 H6.4"/>',
      '<path d="M17.6 12 H19.5"/>',
      '<path d="M6.8 6.8 L8.1 8.1"/>',
      '<path d="M15.9 15.9 L17.2 17.2"/>',
      '<path d="M15.9 8.1 L17.2 6.8"/>',
      '<path d="M6.8 17.2 L8.1 15.9"/>'
    ]),

    aiInsights: () => makeIcon([
      '<path d="M12 4.5 L13.8 8.2 L18 9 L15 11.8 L15.7 16 L12 14 L8.3 16 L9 11.8 L6 9 L10.2 8.2 Z"/>',
      '<path d="M19.5 5.5 L20.2 6.9 L21.6 7.6 L20.2 8.3 L19.5 9.7 L18.8 8.3 L17.4 7.6 L18.8 6.9 Z" opacity="0.45"/>'
    ])
  };

  const aliases = {
    distribution: 'distributions',
    corr: 'correlation',
    partialcorr: 'partialCorrelation',
    reg: 'regression',
    logistic: 'logisticRegression',
    anovaOneWay: 'anova',
    repeated: 'repeatedMeasures',
    nonparam: 'nonparametric',
    factor: 'factorAnalysis',
    alpha: 'cronbachAlpha',
    hist: 'histogram',
    box: 'boxplot',
    qq: 'qqplot',
    control: 'controlChart',
    qc: 'capability',
    insight: 'aiInsights'
  };

  function resolveName(name) {
    if (!name) return null;
    return icons[name] ? name : aliases[name] || null;
  }

  function get(name) {
    const resolved = resolveName(name);
    if (!resolved) {
      throw new Error(`StatisticoIcons: unknown icon \"${name}\"`);
    }
    return icons[resolved]();
  }

  function list() {
    return Object.keys(icons);
  }

  function render(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll('[data-statistico-icon]');
    nodes.forEach(node => {
      const name = node.getAttribute('data-statistico-icon');
      const resolved = resolveName(name);
      if (!resolved) return;
      node.innerHTML = icons[resolved]();
      node.classList.add('statistico-icon-slot');
      const svg = node.querySelector('svg');
      if (svg) svg.classList.add('statistico-icon');
    });
  }

  function spriteSheet(names) {
    const selected = Array.isArray(names) && names.length ? names : list();
    return selected.map(name => {
      const resolved = resolveName(name);
      if (!resolved) return '';
      return `
        <div class="statistico-icon-card">
          <div class="statistico-icon-preview">${icons[resolved]()}</div>
          <div class="statistico-icon-name">${resolved}</div>
        </div>`;
    }).join('');
  }

  function installStyles() {
    if (document.getElementById('statistico-icon-styles')) return;
    const style = document.createElement('style');
    style.id = 'statistico-icon-styles';
    style.textContent = `
      .statistico-icon-slot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .statistico-icon {
        width: 22px;
        height: 22px;
        color: currentColor;
        flex: 0 0 auto;
      }
      .statistico-icon--sm svg, .statistico-icon--sm {
        width: 18px;
        height: 18px;
      }
      .statistico-icon--lg svg, .statistico-icon--lg {
        width: 28px;
        height: 28px;
      }
      .statistico-icon-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 14px;
      }
      .statistico-icon-card {
        border: 1px solid rgba(100,116,139,0.18);
        border-radius: 14px;
        padding: 14px;
        background: rgba(255,255,255,0.72);
        text-align: center;
      }
      .statistico-icon-preview {
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        color: #4f46e5;
      }
      .statistico-icon-preview svg {
        width: 28px;
        height: 28px;
      }
      .statistico-icon-name {
        font: 600 12px/1.3 Inter, Segoe UI, Arial, sans-serif;
        color: #334155;
        word-break: break-word;
      }
      .module-btn .statistico-icon,
      .nav-item .statistico-icon,
      .panel-title .statistico-icon {
        transition: transform .18s ease, opacity .18s ease, color .18s ease;
      }
      .module-btn:hover .statistico-icon,
      .nav-item:hover .statistico-icon {
        transform: scale(1.06);
      }
      .is-active .statistico-icon,
      .module-btn.active .statistico-icon {
        color: #22c55e;
      }
      .is-muted .statistico-icon,
      .module-btn.inactive .statistico-icon {
        color: #94a3b8;
        opacity: .72;
      }
    `;
    document.head.appendChild(style);
  }

  global.StatisticoIcons = {
    get,
    list,
    render,
    spriteSheet,
    installStyles
  };

})(window);
