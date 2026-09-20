/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const headerCss = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');
const headerJs = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const configCss = fs.readFileSync(path.join(__dirname, 'shared-config.css'), 'utf8');

describe('soft navy/slate dark palette', () => {
  test('lifts large surfaces off near-black and keeps sidebar chrome', () => {
    expect(headerCss).toMatch(/--surface-0:\s*#0E141B/);
    expect(headerCss).toMatch(/--surface-1:\s*#242C37/);
    expect(headerCss).toMatch(/--surface-2:\s*#242C37/);
    expect(headerCss).toMatch(/--surface-modal:\s*#1A212B/);
    expect(headerCss).toMatch(/--surface-plot:\s*#242C37/);
    expect(headerCss).toMatch(/--modal-overlay:\s*rgba\(0,\s*0,\s*0,\s*0\.48\)/);
    expect(headerCss).toMatch(/--border:\s*rgba\(255,\s*255,\s*255,\s*0\.14\)/);
    expect(headerCss).toMatch(/--st-header-band:\s*#18384B/);
    expect(headerCss).toMatch(/html\[data-theme="dark"\] \.sb-nav[\s\S]*background:\s*#18384B !important/);
    const uniWs = fs.readFileSync(path.join(__dirname, 'univariate/univariate-workspace.css'), 'utf8');
    expect(uniWs).toMatch(/--uni-ws-page:\s*#0E141B/);
    expect(uniWs).toMatch(/--uni-ws-plot:\s*#242C37/);
    expect(uniWs).not.toMatch(/--uni-ws-page:\s*#09111d/);
    expect(uniWs).toMatch(/--st-header-band,\s*#18384B/);
    expect(headerCss).not.toMatch(/--surface-0:\s*#0f1115/);
    expect(headerJs).toMatch(/setProperty\('--surface-0',\s*'#0E141B'\)/);
    expect(headerJs).toMatch(/setProperty\('--modal-overlay',\s*'rgba\(0,0,0,\.48\)'\)/);
    expect(headerJs).toMatch(/wrapBg: '#242C37'/);
    expect(headerCss).toMatch(/--highcharts-background-color:\s*#242C37/);
    expect(headerCss).toMatch(/\.highcharts-plot-background/);
    expect(headerCss).toMatch(/\.table-wrap/);
    expect(headerCss).toMatch(/\.view-card[\s\S]*--surface-0,\s*#0E141B/);
    expect(headerCss).toMatch(/--sb-active-bg:\s*var\(--surface-0/);
    expect(headerJs).toMatch(/setProperty\('--surface-plot',\s*'#242C37'\)/);
    expect(configCss).toMatch(/--cfg-bg:\s*#0E141B/);
    expect(configCss).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.48\)/);
    expect(headerCss).toMatch(/input\[type="checkbox"\][\s\S]*appearance:\s*none/);
    expect(headerCss).toMatch(/input\[type="checkbox"\][\s\S]*:checked[\s\S]*var\(--accent-1\)/);
  });

  test('module views no longer define the old near-black canvas token', () => {
    const viewsRoot = __dirname;
    const leftovers = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'Ressources' || entry.name === 'node_modules') continue;
          walk(full);
        } else if (/\.(html|css)$/i.test(entry.name)) {
          const text = fs.readFileSync(full, 'utf8');
          if (/--surface-0\s*:\s*#(?:0c1624|070b14|0b1120|0f172a|1b2439|07090e|0f1115)\b/i.test(text)) {
            leftovers.push(path.relative(viewsRoot, full).replace(/\\/g, '/'));
          }
        }
      }
    };
    walk(viewsRoot);
    expect(leftovers).toEqual([]);
  });
});
