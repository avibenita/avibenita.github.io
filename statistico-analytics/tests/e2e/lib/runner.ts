import fs from 'fs';
import path from 'path';
import type { Locator, Page } from '@playwright/test';
import type { AuditResult, CheckboxRow, ModuleSpec, YesNo } from './types';
import { findContract } from './contracts';

const IGNORE_CONSOLE = [
  /office\.js/i,
  /office\.com/i,
  /appsforoffice/i,
  /favicon/i,
  /failed to load resource/i,
  /net::ERR/i,
  /cdnjs/i,
  /font-awesome/i,
  /highcharts/i,
  /StatisticoHeader/i,
  /Excel only/i
];

export function collectConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORE_CONSOLE.some((re) => re.test(text))) return;
    errors.push(text.slice(0, 240));
  });
  page.on('pageerror', (err) => {
    const text = String(err.message || err);
    if (IGNORE_CONSOLE.some((re) => re.test(text))) return;
    errors.push(text.slice(0, 240));
  });
  return errors;
}

async function runPrepare(page: Page, spec: ModuleSpec): Promise<void> {
  for (const step of spec.prepare || []) {
    try {
      if (step.startsWith('wait:')) {
        await page.locator(step.slice(5)).first().waitFor({ state: 'attached', timeout: 8000 });
      } else if (step.startsWith('click:')) {
        const loc = page.locator(step.slice(6)).first();
        if (await loc.count()) {
          await loc.click({ timeout: 4000 }).catch(() => {});
        }
      }
    } catch {
      // Preparation is best-effort; missing demo data is recorded as NOT_REACHED.
    }
  }

  for (const name of ['Options', 'Output', 'Preview', 'Advanced', 'Network']) {
    const btn = page.getByRole('button', { name, exact: true });
    if (await btn.count()) {
      await btn.first().click({ timeout: 2000 }).catch(() => {});
    }
  }

  const sample = page.getByRole('button', { name: /load sample|demo/i });
  if (await sample.count()) {
    await sample.first().click({ timeout: 3000 }).catch(() => {});
  }

  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const fns = ['loadSampleData', 'loadDemoResults', 'loadDemoResidualData', 'createDemoCorrelationData'];
    for (const name of fns) {
      const fn = w[name];
      if (typeof fn === 'function') {
        try {
          const result = (fn as Function)();
          const handle = w.handleDataReceived;
          if (result && typeof handle === 'function') (handle as Function)(result);
        } catch {
          /* ignore */
        }
      }
    }
    ['mainContent', 'results-container', 'resultsContainer', 'pane-options', 'previewBody', 'overlayControls'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (getComputedStyle(el).display === 'none') {
        el.style.display = id === 'mainContent' ? 'flex' : 'block';
      }
      el.classList.add('show', 'active');
    });
  }).catch(() => {});
}

export interface DiscoveredBox {
  id: string;
  name: string;
  selector: string;
  native: boolean;
  disabled: boolean;
  visible: boolean;
  roleOnly: boolean;
}

export async function discoverCheckboxes(page: Page): Promise<DiscoveredBox[]> {
  return page.evaluate(() => {
    const skip = (el: Element) =>
      el.classList.contains('highcharts-legend-checkbox') ||
      !!el.closest('.highcharts-legend');

    const boxes: Array<{
      id: string;
      name: string;
      selector: string;
      native: boolean;
      disabled: boolean;
      visible: boolean;
      roleOnly: boolean;
    }> = [];

    const displayed = (el: Element | null) => {
      let node: Element | null = el;
      while (node && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        node = node.parentElement;
      }
      return !!el;
    };

    const labelText = (el: HTMLElement) => {
      const id = el.id;
      if (id) {
        const byFor = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (byFor) return (byFor.textContent || '').replace(/\s+/g, ' ').trim();
      }
      const parent = el.closest('label');
      if (parent) return (parent.textContent || '').replace(/\s+/g, ' ').trim();
      return el.getAttribute('aria-label') || el.id || el.getAttribute('name') || 'unnamed checkbox';
    };

    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((el, i) => {
      if (skip(el)) return;
      const id = el.id || el.getAttribute('data-var') || el.getAttribute('data-study') || `anon-${i}`;
      const label = (el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`))) as HTMLElement | null;
      boxes.push({
        id,
        name: labelText(el) || id,
        selector: el.id ? `#${CSS.escape(el.id)}` : `input[type="checkbox"]:nth-of-type(${i + 1})`,
        native: true,
        disabled: !!el.disabled,
        visible: displayed(label || el),
        roleOnly: false
      });
    });

    document.querySelectorAll<HTMLElement>('[role="checkbox"]').forEach((el, i) => {
      if (el.matches('input[type="checkbox"]') || skip(el)) return;
      const id = el.id || el.getAttribute('data-level-pos') || `role-${i}`;
      boxes.push({
        id,
        name: (el.getAttribute('aria-label') || el.textContent || id).replace(/\s+/g, ' ').trim(),
        selector: el.id ? `#${el.id}` : `[role="checkbox"]:nth-of-type(${i + 1})`,
        native: false,
        disabled: el.getAttribute('aria-disabled') === 'true',
        visible: displayed(el),
        roleOnly: true
      });
    });

    return boxes;
  });
}

async function readChecked(locator: Locator, native: boolean): Promise<boolean | null> {
  try {
    if (native) return locator.evaluate((el) => (el as HTMLInputElement).checked);
    const aria = await locator.getAttribute('aria-checked');
    if (aria === 'true') return true;
    if (aria === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

async function setChecked(locator: Locator, native: boolean, value: boolean): Promise<void> {
  if (native) {
    await locator.evaluate((el, v) => {
      const input = el as HTMLInputElement;
      input.checked = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
}

async function attachEventSpy(locator: Locator): Promise<void> {
  await locator.evaluate((el) => {
    const w = window as unknown as { __cbEvents?: string[] };
    w.__cbEvents = [];
    ['click', 'input', 'change'].forEach((type) => {
      el.addEventListener(type, () => {
        w.__cbEvents = w.__cbEvents || [];
        w.__cbEvents.push(type);
      });
    });
  });
}

async function readEvents(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __cbEvents?: string[] }).__cbEvents || []);
}

function classify(opts: {
  disabled: boolean;
  intentional: boolean;
  visible: boolean;
  click: YesNo;
  label: YesNo;
  keyboard: YesNo;
  stateChanged: YesNo;
  effect: 'pass' | 'fail' | 'needs' | 'n/a';
}): AuditResult {
  if (!opts.visible) return 'NOT_REACHED';
  if (opts.disabled && opts.intentional) return 'INTENTIONALLY_DISABLED';
  if (opts.click === 'no') return 'FAIL_CLICK';
  if (opts.stateChanged === 'no') return 'FAIL_STATE';
  if (opts.keyboard === 'no') return 'FAIL_KEYBOARD';
  if (opts.effect === 'fail') return 'FAIL_EFFECT';
  if (opts.effect === 'needs') return 'NEEDS_EXPECTATION';
  return 'PASS';
}

async function screenshotFailure(page: Page, id: string): Promise<string | undefined> {
  try {
    const dir = path.join(process.cwd(), 'tests/e2e/reports/screenshots');
    fs.mkdirSync(dir, { recursive: true });
    const file = `${id.replace(/[^a-z0-9-_]+/gi, '_')}.png`;
    const full = path.join(dir, file);
    await page.screenshot({ path: full, fullPage: false });
    return `tests/e2e/reports/screenshots/${file}`;
  } catch {
    return undefined;
  }
}

export async function auditModule(
  page: Page,
  spec: ModuleSpec,
  viewport: string
): Promise<CheckboxRow[]> {
  const consoleErrors = collectConsole(page);
  const beforeCount = consoleErrors.length;
  const rows: CheckboxRow[] = [];

  try {
    await page.goto(spec.route, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await runPrepare(page, spec);
    await page.locator('body').waitFor({ state: 'visible' });
  } catch (err) {
    rows.push({
      module: spec.name,
      route: spec.route,
      viewport,
      checkbox: '(page)',
      selector: spec.route,
      source: spec.source,
      native: false,
      click: 'n/a',
      label: 'n/a',
      keyboard: 'n/a',
      stateChanged: 'n/a',
      intendedEffect: 'Page did not load',
      consoleError: String(err).slice(0, 240),
      result: 'NOT_REACHED',
      notes: 'Navigation or prepare failed',
      proposedFix: 'Confirm the page can open outside Excel with ?demo=1 sample data.'
    });
    return rows;
  }

  const boxes = await discoverCheckboxes(page);
  if (!boxes.length) {
    rows.push({
      module: spec.name,
      route: spec.route,
      viewport,
      checkbox: '(none discovered)',
      selector: 'input[type=checkbox], [role=checkbox]',
      source: spec.source,
      native: false,
      click: 'n/a',
      label: 'n/a',
      keyboard: 'n/a',
      stateChanged: 'n/a',
      intendedEffect: 'No checkboxes on this page after prepare',
      consoleError: consoleErrors.slice(beforeCount).join(' | '),
      result: spec.id === 'hub' || spec.id.endsWith('-input') && spec.id !== 'mixed-input' && spec.id !== 'reliability-input' && spec.id !== 'regression-input' && spec.id !== 'logistic-input' && spec.id !== 'cluster-input' && spec.id !== 'meta-input' && spec.id !== 'publication-tables'
        ? 'NOT_REACHED'
        : 'NOT_REACHED',
      notes: 'Page opened but no checkbox nodes were present or visible'
    });
    return rows;
  }

  for (const box of boxes) {
    const contract = findContract(spec.id, box.id);
    const locator = page.locator(box.selector).first();
    const count = await locator.count();
    const visible = count > 0 && box.visible;
    if (visible) {
      await locator.evaluate((el) => {
        const label = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`));
        (label as HTMLElement || el as HTMLElement).scrollIntoView({ block: 'center', inline: 'nearest' });
      }).catch(() => {});
    }
    const disabled = box.disabled || (count > 0 && (await locator.isDisabled().catch(() => false)));
    const intentional = !!(contract && contract.intentionallyDisabled);

    let click: YesNo = 'n/a';
    let label: YesNo = 'n/a';
    let keyboard: YesNo = 'n/a';
    let stateChanged: YesNo = 'n/a';
    let effectStatus: 'pass' | 'fail' | 'needs' | 'n/a' = contract?.effect ? 'n/a' : 'needs';
    let notes: string[] = [];
    let shot: string | undefined;
    let proposedFix: string | undefined;

    if (!visible) {
      rows.push({
        module: spec.name,
        route: spec.route,
        viewport,
        checkbox: box.name,
        selector: box.selector,
        source: spec.source,
        native: box.native,
        click: 'n/a',
        label: 'n/a',
        keyboard: 'n/a',
        stateChanged: 'n/a',
        intendedEffect: contract?.effect?.description || (intentional ? 'Hidden state holder' : 'NEEDS_EXPECTATION'),
        consoleError: '',
        result: intentional ? 'INTENTIONALLY_DISABLED' : 'NOT_REACHED',
        notes: intentional
          ? 'display:none state checkbox, not a user control'
          : 'Present in DOM but not visible after prepare'
      });
      continue;
    }

    if (disabled) {
      const still = await readChecked(locator, box.native);
      try {
        await locator.click({ timeout: 2000 });
      } catch {
        /* expected */
      }
      const after = await readChecked(locator, box.native);
      rows.push({
        module: spec.name,
        route: spec.route,
        viewport,
        checkbox: box.name,
        selector: box.selector,
        source: spec.source,
        native: box.native,
        click: 'no',
        label: 'n/a',
        keyboard: 'n/a',
        stateChanged: still === after ? 'no' : 'yes',
        intendedEffect: 'Must remain unchanged while disabled',
        consoleError: consoleErrors.slice(beforeCount).join(' | '),
        result: still === after ? 'INTENTIONALLY_DISABLED' : 'FAIL_STATE',
        notes: 'Disabled checkbox'
      });
      continue;
    }

    const initial = await readChecked(locator, box.native);
    await attachEventSpy(locator);

    const pointerEvents = await locator.evaluate((el) => getComputedStyle(el).pointerEvents).catch(() => 'auto');
    if (pointerEvents === 'none') {
      click = 'no';
      notes.push('Direct click blocked: computed pointer-events:none');
      proposedFix = 'shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.';
    } else {
      try {
        await locator.click({ timeout: 1500 });
        click = 'yes';
      } catch (err) {
        click = 'no';
        notes.push(`Direct click failed: ${String(err).split('\n')[0]}`);
        proposedFix = 'Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.';
      }
    }

    const afterClick = await readChecked(locator, box.native);
    if (click === 'yes') {
      stateChanged = initial !== afterClick && afterClick !== null ? 'yes' : 'no';
      if (stateChanged === 'no') notes.push('Click succeeded but checked/aria-checked did not change');
    }

    const events = await readEvents(page);
    if (click === 'yes' && box.native && !events.includes('change') && !events.includes('input')) {
      notes.push('No input/change event after click');
    }

    if (contract?.effect && afterClick !== null) {
      try {
        const ok = await contract.effect.assert(page, afterClick);
        effectStatus = ok ? 'pass' : 'fail';
      } catch {
        effectStatus = 'fail';
      }
    } else if (!contract) {
      effectStatus = 'needs';
    } else {
      effectStatus = 'needs';
    }

    if (afterClick !== null && afterClick !== initial) {
      await setChecked(locator, box.native, !!initial);
    }

    const labelLoc = await findLabel(page, box.id, locator);
    if (labelLoc) {
      const beforeLabel = await readChecked(locator, box.native);
      try {
        await labelLoc.click({ timeout: 2000 });
        const afterLabel = await readChecked(locator, box.native);
        label = beforeLabel !== afterLabel ? 'yes' : 'no';
        if (label === 'yes') await setChecked(locator, box.native, !!beforeLabel);
        else notes.push('Label click did not toggle state');
      } catch (err) {
        label = 'no';
        notes.push(`Label click failed: ${String(err).split('\n')[0]}`);
      }
    } else {
      label = 'n/a';
      notes.push('No associated label');
    }

    const beforeKey = await readChecked(locator, box.native);
    try {
      await locator.evaluate((el) => { (el as HTMLElement).focus(); });
      await page.keyboard.press('Space');
      const afterKey = await readChecked(locator, box.native);
      keyboard = beforeKey !== afterKey ? 'yes' : 'no';
      if (keyboard === 'yes') await setChecked(locator, box.native, !!beforeKey);
      else notes.push('Space on focused control did not toggle');
    } catch (err) {
      keyboard = 'no';
      notes.push(`Keyboard failed: ${String(err).split('\n')[0]}`);
    }

    const result = classify({
      disabled: false,
      intentional: false,
      visible: true,
      click,
      label,
      keyboard,
      stateChanged: stateChanged === 'yes' || label === 'yes' || keyboard === 'yes' ? 'yes' : stateChanged,
      effect: effectStatus
    });

    if (result.startsWith('FAIL')) {
      shot = await screenshotFailure(page, `${viewport}-${spec.id}-${box.id}`);
    }

    const newErrors = consoleErrors.slice(beforeCount);
    rows.push({
      module: spec.name,
      route: spec.route,
      viewport,
      checkbox: box.name,
      selector: box.selector,
      source: spec.source,
      native: box.native,
      click,
      label,
      keyboard,
      stateChanged: stateChanged === 'yes' || label === 'yes' || keyboard === 'yes' ? 'yes' : stateChanged,
      intendedEffect: contract?.effect?.description || (effectStatus === 'needs' ? 'NEEDS_EXPECTATION' : 'State toggle'),
      consoleError: newErrors.join(' | '),
      result,
      notes: notes.join(' · '),
      screenshot: shot,
      proposedFix
    });
  }

  return rows;
}

async function findLabel(page: Page, id: string, checkbox: Locator): Promise<Locator | null> {
  if (id) {
    const byFor = page.locator(`label[for="${id}"]`);
    if (await byFor.count()) return byFor.first();
  }
  const parent = checkbox.locator('xpath=ancestor::label[1]');
  if (await parent.count()) return parent.first();
  return null;
}
