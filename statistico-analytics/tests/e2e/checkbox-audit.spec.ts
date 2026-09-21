import { test, expect } from '@playwright/test';
import { MODULES } from './lib/modules';
import { auditModule } from './lib/runner';
import { appendRows, loadRows, saveRows, writeMarkdown } from './lib/report';

const APP_MODULES = MODULES.filter((m) => m.id !== 'shared-checkbox-fixture');

test.beforeAll(() => {
  saveRows([]);
});

const VIEWPORTS = [
  { name: 'full-1366x768', width: 1366, height: 768 },
  { name: 'taskpane-400x768', width: 400, height: 768 }
];

for (const spec of APP_MODULES) {
  test(`checkbox audit: ${spec.name}`, async ({ page }) => {
    const allRows = [];
    for (const vp of VIEWPORTS) {
      if (vp.name.startsWith('taskpane') && !allRows.some((r) => r.checkbox !== '(page)' && r.checkbox !== '(none discovered)')) {
        continue;
      }
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const rows = await auditModule(page, spec, vp.name);
      allRows.push(...rows);
    }
    appendRows(allRows);
    expect(allRows.length, `${spec.name} produced no audit rows`).toBeGreaterThan(0);
  });
}

test.afterAll(() => {
  writeMarkdown(loadRows());
});
