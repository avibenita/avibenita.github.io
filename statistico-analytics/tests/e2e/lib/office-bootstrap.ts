import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

const MOCK_JS = fs.readFileSync(path.join(process.cwd(), 'tests/e2e/lib/office-mock.js'), 'utf8');

export async function installOfficeMock(page: Page): Promise<void> {
  await page.addInitScript({ content: MOCK_JS });
  await page.route(/appsforoffice\.microsoft\.com\/.*office\.js/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: MOCK_JS
    });
  });
}

const MESSAGE_TYPES = [
  'loadData',
  'REGRESSION_DATA',
  'RELIABILITY_DATA',
  'FACTOR_DATA',
  'CLUSTER_DATA',
  'MIXED_DATA',
  'CORRELATION_DATA',
  'ANOVA_DATA',
  'INDEPENDENT_DATA',
  'DEPENDENT_DATA',
  'LOGISTIC_DATA',
  'META_DATA',
  'PARETO_DATA',
  'PREPARE_DATA',
  'CONTINGENCY_DATA',
  'SEGMENTATION_DATA'
];

export async function feedDemoData(page: Page): Promise<void> {
  await page.evaluate((types) => {
    const w = window as unknown as Record<string, any>;
    const payload = w.__STATISTICO_E2E_DEMO__;
    if (!payload) return;

    try {
      sessionStorage.setItem('univariateResults', JSON.stringify({
        values: payload.rows.map((r: number[]) => r[0]),
        column: payload.headers[0],
        n: payload.rows.length,
        sourceHeaders: payload.headers,
        sourceRows: payload.rows,
        dataSource: 'e2e-office-mock'
      }));
      sessionStorage.setItem('correlationData', JSON.stringify({
        headers: payload.headers.filter((_: string, i: number) => i !== 3),
        data: payload.rows.map((row: Array<string | number>) => {
          const obj: Record<string, number> = {};
          payload.headers.forEach((h: string, i: number) => {
            if (i === 3) return;
            obj[h] = Number(row[i]);
          });
          return obj;
        }),
        source: 'e2e-office-mock'
      }));
    } catch (_e) {}

    if (typeof w.__officeDeliver === 'function') {
      w.__officeDeliver({ action: 'loadData', data: payload });
      types.forEach((type: string) => {
        w.__officeDeliver({ type, payload });
        w.__officeDeliver({ type, data: payload });
      });
    }

    if (typeof w.loadMixedModelData === 'function') w.loadMixedModelData(payload);
    if (typeof w.loadRegressionData === 'function') w.loadRegressionData(payload);
    if (typeof w.populateVariableSelectionTable === 'function') {
      const stats: Record<string, unknown> = {};
      payload.headers.forEach((h: string, idx: number) => {
        const numeric = idx !== 3;
        stats[h] = {
          count: payload.rows.length,
          numeric: numeric ? payload.rows.length : 0,
          string: numeric ? 0 : payload.rows.length,
          missing: 0,
          categories: numeric ? [] : ['A', 'B', 'C']
        };
      });
      w.populateVariableSelectionTable(stats);
    }
    if (typeof w.createDemoCorrelationData === 'function' && typeof w.handleDataReceived === 'function') {
      try { w.handleDataReceived(w.createDemoCorrelationData()); } catch (_e) {}
    }
    if (typeof w.loadSampleData === 'function') {
      try { w.loadSampleData(); } catch (_e) {}
    }
    if (typeof w.loadDemoResults === 'function') {
      try { w.loadDemoResults(); } catch (_e) {}
    }

    ['mainContent', 'results-container', 'resultsContainer', 'pane-options', 'previewBody', 'overlayControls'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (getComputedStyle(el).display === 'none') {
        el.style.display = id === 'mainContent' ? 'flex' : 'block';
      }
      el.classList.add('show', 'active');
    });
  }, MESSAGE_TYPES);
}
