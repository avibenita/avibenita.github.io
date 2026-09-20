/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const headerCss = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');
const headerJs = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const configCss = fs.readFileSync(path.join(__dirname, 'shared-config.css'), 'utf8');

describe('soft navy/slate dark palette', () => {
  test('lifts large surfaces off near-black and keeps sidebar chrome', () => {
    expect(headerCss).toMatch(/--surface-0:\s*#0E141B/);
    expect(headerCss).toMatch(/--surface-1:\s*#151C24/);
    expect(headerCss).toMatch(/--surface-2:\s*#242C37/);
    expect(headerCss).toMatch(/--surface-modal:\s*#1A212B/);
    expect(headerCss).toMatch(/--surface-plot:\s*#121820/);
    expect(headerCss).toMatch(/--modal-overlay:\s*rgba\(0,\s*0,\s*0,\s*0\.48\)/);
    expect(headerCss).toMatch(/--border:\s*rgba\(255,\s*255,\s*255,\s*0\.14\)/);
    expect(headerCss).toMatch(/--st-header-band:\s*#18384B/);
    expect(headerCss).not.toMatch(/--surface-0:\s*#0f1115/);
    expect(headerJs).toMatch(/setProperty\('--surface-0',\s*'#0E141B'\)/);
    expect(headerJs).toMatch(/setProperty\('--modal-overlay',\s*'rgba\(0,0,0,\.48\)'\)/);
    expect(headerJs).toMatch(/wrapBg: '#121820'/);
    expect(configCss).toMatch(/--cfg-bg:\s*#0E141B/);
    expect(configCss).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.48\)/);
  });
});
