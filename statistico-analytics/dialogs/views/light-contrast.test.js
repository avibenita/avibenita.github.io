/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const theme = fs.readFileSync(path.join(__dirname, 'highcharts-theme.css'), 'utf8');
const headerCss = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');
const headerJs = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const histogram = fs.readFileSync(path.join(__dirname, 'univariate/histogram-standalone-v2.html'), 'utf8');

describe('light-mode contrast', () => {
  test('panel headings use dark ink on the light band', () => {
    expect(theme).toMatch(/html\[data-theme="light"\] \.panel-heading[\s\S]*?color: #0D2137 !important;/);
    expect(theme).toMatch(/html\[data-theme="light"\] #histogram-title/);
    expect(theme).toMatch(/#histogram-title[\s\S]{0,80}color: #0D2137 !important;/);
    expect(headerCss).toMatch(/html\[data-theme="light"\] \.panel-heading[\s\S]*?color: #0D2137 !important;/);
    expect(headerCss).not.toMatch(/Light theme — navy header bars \(banking dashboard\)/);
  });

  test('checkbox and overlay labels beat pale dark-mode ink', () => {
    expect(theme).toMatch(/\.control-group\.overlay-toggles \.overlay-toggle:has\(input:checked\)/);
    expect(theme).toMatch(/html\[data-theme="light"\] \.checkbox-label/);
    expect(theme).toMatch(/html\[data-theme="light"\] \.overlay-toggle/);
    expect(headerCss).toMatch(/html\[data-theme="light"\] \.checkbox-label,/);
    expect(histogram).toMatch(/html\[data-theme="light"\][\s\S]*\.overlay-toggle:has\(input:checked\)/);
    expect(histogram).toMatch(/html\[data-theme="light"\][\s\S]*#histogram-title/);
  });

  test('cache-busts theme CSS after contrast changes', () => {
    expect(headerJs).toMatch(/_TAB_ASSET_VER:\s*'20260922closeread'/);
  });

  test('light close buttons and range sliders stay readable', () => {
    expect(theme).toMatch(/html\[data-theme="light"\] \.modal-close-btn[\s\S]*color: #ffffff !important/);
    expect(theme).toMatch(/html\[data-theme="light"\] \.modal-close-btn[\s\S]*background: #E11D48 !important/);
    expect(theme).toMatch(/html\[data-theme="light"\][\s\S]*\.chart-slider-row \.slider[\s\S]*accent-color: #007DAA/);
    expect(theme).toMatch(/::-webkit-slider-runnable-track[\s\S]*background: #64748B !important/);
  });

  test('light sidebar matches the header band and selected items are white', () => {
    expect(theme).toMatch(/html\[data-theme="light"\] \.sb-nav[\s\S]*--sb-bg:\s*var\(--st-header-band/);
    expect(theme).toMatch(/html\[data-theme="light"\] \.sb-nav[\s\S]*--sb-active-bg:\s*#ffffff/);
    expect(theme).toMatch(/html\[data-theme="light"\] \.sb-item\.active[\s\S]*background:\s*#ffffff !important/);
    expect(headerCss).toMatch(/html\[data-theme="light"\] \.sb-nav[\s\S]*--sb-active-bg:\s*#ffffff/);
  });
});
