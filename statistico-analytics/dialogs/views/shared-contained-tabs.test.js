/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'shared-contained-tabs.css'), 'utf8');
const headerCss = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');
const header = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const tabsJs = fs.readFileSync(path.join(__dirname, 'shared-workspace-tabs.js'), 'utf8');

describe('shared contained tabs', () => {
  test('gates the Carbon strip behind data-tabs=contained and keeps classic restore', () => {
    expect(css).toMatch(/html\[data-tabs="contained"\]/);
    expect(css).toMatch(/html\[data-tabs="classic"\]/);
    expect(headerCss).toMatch(/--st-header-band:\s*#18384B/);
    expect(headerCss).toMatch(/--st-header-band:\s*#DFECF4/);
    expect(headerCss).toMatch(/--st-header-tab-selected:\s*#28536B/);
    expect(headerCss).toMatch(/--st-header-tab-selected:\s*#C2DBEA/);
    expect(headerCss).toMatch(/--st-header-text:\s*#F5FAFF/);
    expect(headerCss).toMatch(/--st-header-tab-indicator:\s*#35CFFF/);
    expect(headerCss).toMatch(/--sb-bg:\s*var\(--st-header-band/);
    expect(headerCss).toMatch(/--sb-active-bg:\s*var\(--surface-0/);
    expect(css).toMatch(/--st-contained-selected:\s*var\(--st-header-tab-selected/);
    expect(css).toMatch(/border-top:\s*1px solid var\(--st-contained-divider\)/);
    expect(css).toMatch(/border-bottom:\s*0 !important;/);
    expect(css).toMatch(/#header-container[\s\S]*background:\s*transparent !important;/);
    expect(headerCss).toMatch(/#header-container[\s\S]*background:\s*transparent !important;/);
    expect(css).toMatch(/display:\s*none !important;/);
    expect(css).toMatch(/--st-header-pre-tabs:\s*80px/);
    expect(css).toMatch(/\.sb-logo[\s\S]*border-bottom:\s*1px solid var\(--st-contained-divider\)/);
    expect(headerCss).toMatch(/\.header-module-frame \{[\s\S]*border:\s*0;/);
    expect(css).toMatch(/border-top:\s*3px solid transparent/);
    expect(header).toMatch(/setAttribute\('data-tabs', next\)/);
    expect(header).toMatch(/shared-contained-tabs\.css/);
    expect(tabsJs).toMatch(/ws-tab-scroll-wrap/);
    expect(tabsJs).toMatch(/ArrowRight/);
  });
});
