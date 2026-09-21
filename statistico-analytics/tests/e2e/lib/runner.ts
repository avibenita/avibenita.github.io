import fs from 'fs';
import path from 'path';
import type { Locator, Page } from '@playwright/test';
import type { AuditResult, CheckboxRow, ModuleSpec, YesNo } from './types';
import { findContract } from './contracts';
import { feedDemoData, installOfficeMock } from './office-bootstrap';

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
  /Excel only/i,
  /e2e mock/i
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
  await feedDemoData(page);

  for (const step of spec.prepare || []) {
    try {
      if (step.startsWith('wait:')) {
        await page.locator(step.slice(5)).first().waitFor({ state: 'attached', timeout: 8000 });
      } else if (step.startsWith('click:')) {
        const loc = page.locator(step.slice(6)).first();
        if (await loc.count()) await loc.click({ timeout: 4000 }).catch(() => {});
      }
    } catch {
      /* best-effort */
    }
  }

  for (const name of ['Options', 'Output', 'Preview', 'Advanced', 'Network']) {
    const btn = page.getByRole('button', { name, exact: true });
    if (await btn.count()) await btn.first().click({ timeout: 2000 }).catch(() => {});
  }

  const sample = page.getByRole('button', { name: /load sample|demo/i });
  if (await sample.count()) await sample.first().click({ timeout: 3000 }).catch(() => {});

  await feedDemoData(page);
}

export interface DiscoveredBox {
  id: string;
  name: string;
  selector: string;
  native: boolean;
  disabled: boolean;
  visible: boolean;
  painted: boolean;
  roleOnly: boolean;
}

export async function discoverCheckboxes(page: Page): Promise<DiscoveredBox[]> {
  return page.evaluate(() => {
    const skip = (el: Element) =>
      el.classList.contains('highcharts-legend-checkbox') ||
      !!el.closest('.highcharts-legend');

    const displayed = (el: Element | null) => {
      let node: Element | null = el;
      while (node && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        node = node.parentElement;
      }
      return !!el;
    };

    const painted = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return style.opacity === '0' || style.pointerEvents === 'none' || Number(style.opacity) < 0.05;
    };

    const labelText = (el: HTMLElement) => {
      if (el.id) {
        const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (byFor) return (byFor.textContent || '').replace(/\s+/g, ' ').trim();
      }
      const parent = el.closest('label');
      if (parent) return (parent.textContent || '').replace(/\s+/g, ' ').trim();
      return el.getAttribute('aria-label') || el.id || el.getAttribute('name') || 'unnamed checkbox';
    };

    const boxes: DiscoveredBox[] = [];
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
        painted: painted(el),
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
        painted: false,
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
  if (!native) return;
  await locator.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.checked = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const label = input.closest('label');
    if (label) label.classList.toggle('is-checked', v);
  }, value);
}

async function visibleTarget(page: Page, box: DiscoveredBox, checkbox: Locator): Promise<Locator> {
  if (box.roleOnly) return checkbox;
  const label = await findLabel(page, box.id, checkbox);
  if (box.painted && label) return label;
  if (label) {
    const inputHidden = await checkbox.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.opacity === '0' || style.pointerEvents === 'none' || Number(style.opacity) < 0.05;
    }).catch(() => false);
    if (inputHidden) return label;
  }
  return checkbox;
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

function classify(opts: {
  visible: boolean;
  disabled: boolean;
  intentional: boolean;
  click: YesNo;
  label: YesNo;
  keyboard: YesNo;
  effect: 'pass' | 'fail' | 'needs' | 'n/a';
}): AuditResult {
  if (!opts.visible) return opts.intentional ? 'INTENTIONALLY_DISABLED' : 'NOT_REACHED';
  if (opts.disabled) return 'INTENTIONALLY_DISABLED';
  if (opts.click === 'no') return 'FAIL_VISIBLE_CLICK';
  if (opts.keyboard === 'no') return 'FAIL_KEYBOARD';
  if (opts.effect === 'pass') return 'EFFECT_PASS';
  if (opts.effect === 'needs' || opts.effect === 'n/a') return 'NEEDS_EXPECTATION';
  return 'INTERACTION_PASS';
}

async function screenshotFailure(page: Page, id: string): Promise<string | undefined> {
  try {
    const dir = path.join(process.cwd(), 'tests/e2e/reports/screenshots');
    fs.mkdirSync(dir, { recursive: true });
    const file = `${id.replace(/[^a-z0-9-_]+/gi, '_')}.png`;
    await page.screenshot({ path: path.join(dir, file), fullPage: false });
    return `tests/e2e/reports/screenshots/${file}`;
  } catch {
    return undefined;
  }
}

async function tabToControl(page: Page, box: DiscoveredBox): Promise<{ reached: boolean; focusTarget: string; focusVisible: boolean }> {
  const prevSel = await page.evaluate((targetId) => {
    const tabbable = Array.from(document.querySelectorAll<HTMLElement>(
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="checkbox"]'
    )).filter((el) => {
      if ((el as HTMLInputElement).disabled) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return true;
    });
    const isTarget = (el: HTMLElement) => {
      if (el.id === targetId) return true;
      const input = document.getElementById(targetId);
      const label = targetId ? document.querySelector(`label[for="${CSS.escape(targetId)}"]`) : null;
      return !!(input && (el === input || (input.closest('label') && input.closest('label')!.contains(el)))) ||
        !!(label && (el === label || label.contains(el)));
    };
    const idx = tabbable.findIndex(isTarget);
    if (idx < 0) return null;
    const prev = idx > 0 ? tabbable[idx - 1] : document.body;
    if (prev === document.body) {
      document.body.setAttribute('tabindex', '0');
      return 'body';
    }
    if (prev.id) return `#${CSS.escape(prev.id)}`;
    prev.setAttribute('data-e2e-tab-prev', '1');
    return '[data-e2e-tab-prev="1"]';
  }, box.id);

  if (!prevSel) {
    return { reached: false, focusTarget: '', focusVisible: false };
  }

  const prev = page.locator(prevSel).first();
  await prev.focus({ timeout: 2000 }).catch(async () => {
    await page.evaluate(() => document.body.focus());
  });
  await page.keyboard.press('Tab');

  return page.evaluate((targetId) => {
    const el = document.activeElement as HTMLElement | null;
    const focusTarget = el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` : '';
    const input = targetId ? document.getElementById(targetId) : null;
    const label = targetId ? document.querySelector(`label[for="${CSS.escape(targetId)}"]`) : null;
    const reached = !!(
      el && (
        el.id === targetId ||
        (input && (el === input || input.contains(el))) ||
        (label && (el === label || label.contains(el))) ||
        (input && input.closest('label') && input.closest('label')!.contains(el))
      )
    );
    let focusVisible = false;
    if (el) {
      try { focusVisible = el.matches(':focus-visible'); } catch (_e) {}
      const style = getComputedStyle(el);
      if (!focusVisible) {
        focusVisible = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
          (style.boxShadow !== 'none' && style.boxShadow !== '');
      }
    }
    document.querySelectorAll('[data-e2e-tab-prev]').forEach((n) => n.removeAttribute('data-e2e-tab-prev'));
    return { reached, focusTarget, focusVisible };
  }, box.id);
}

export async function auditModule(
  page: Page,
  spec: ModuleSpec,
  viewport: string
): Promise<CheckboxRow[]> {
  const consoleErrors = collectConsole(page);
  const beforeCount = consoleErrors.length;
  const rows: CheckboxRow[] = [];
  const defects: string[] = [];

  try {
    if (!(page as Page & { _officeMock?: boolean })._officeMock) {
      await installOfficeMock(page);
      (page as Page & { _officeMock?: boolean })._officeMock = true;
    }
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
      notes: 'Navigation or prepare failed'
    });
    return rows;
  }

  const pageErrors = consoleErrors.slice(beforeCount);
  if (pageErrors.some((e) => /coun is not defined/i.test(e))) {
    defects.push('SEPARATE_DEFECT: Univariate createHistogram throws ReferenceError: coun is not defined (not a checkbox bug)');
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
      consoleError: pageErrors.join(' | '),
      result: 'NOT_REACHED',
      notes: 'Page opened but no checkbox nodes were present',
      defects
    });
    return rows;
  }

  for (const box of boxes) {
    const contract = findContract(spec.id, box.id);
    const locator = page.locator(box.selector).first();
    const count = await locator.count();
    const visible = count > 0 && box.visible;
    const disabled = box.disabled || (count > 0 && (await locator.isDisabled().catch(() => false)));
    const intentional = !!(contract && contract.intentionallyDisabled);

    if (visible) {
      await locator.evaluate((el) => {
        const label = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`));
        ((label as HTMLElement) || (el as HTMLElement)).scrollIntoView({ block: 'center', inline: 'nearest' });
      }).catch(() => {});
    }

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
        notes: intentional ? 'display:none state checkbox, not a user control' : 'Present in DOM but not visible after prepare',
        defects
      });
      continue;
    }

    if (disabled) {
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
        stateChanged: 'no',
        intendedEffect: 'Must remain unchanged while disabled',
        consoleError: '',
        result: 'INTENTIONALLY_DISABLED',
        notes: 'Disabled checkbox',
        defects
      });
      continue;
    }

    const target = await visibleTarget(page, box, locator);
    const labelLoc = await findLabel(page, box.id, locator);
    let click: YesNo = 'n/a';
    let label: YesNo = 'n/a';
    let keyboard: YesNo = 'n/a';
    let stateChanged: YesNo = 'n/a';
    let effectStatus: 'pass' | 'fail' | 'needs' | 'n/a' = contract?.effect ? 'n/a' : 'needs';
    const notes: string[] = [];
    let focusTarget = '';
    let focusVisible: YesNo = 'n/a';

    const initial = await readChecked(locator, box.native);
    try {
      await target.click({ timeout: 2000 });
      const after = await readChecked(locator, box.native);
      click = initial !== after && after !== null ? 'yes' : 'no';
      stateChanged = click;
      if (click === 'no') notes.push('Visible control click did not toggle checked/aria-checked');
      else await setChecked(locator, box.native, !!initial);
    } catch (err) {
      click = 'no';
      notes.push(`Visible click failed: ${String(err).split('\n')[0]}`);
    }

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
    } else if (click === 'yes') {
      label = 'yes';
      notes.push('Visible target is the only labeled surface');
    }

    const beforeKey = await readChecked(locator, box.native);
    const tab = await tabToControl(page, box);
    focusTarget = tab.focusTarget;
    focusVisible = tab.focusVisible ? 'yes' : 'no';
    if (!tab.reached) {
      keyboard = 'no';
      notes.push(`Tab did not reach the control (focus landed on ${tab.focusTarget || 'none'})`);
    } else {
      await page.keyboard.press('Space');
      const afterKey = await readChecked(locator, box.native);
      keyboard = beforeKey !== afterKey ? 'yes' : 'no';
      if (keyboard === 'yes') await setChecked(locator, box.native, !!beforeKey);
      else notes.push('Space after Tab focus did not toggle');
      if (!tab.focusVisible) notes.push('No visible :focus-visible/outline indicator');
    }

    const afterForEffect = await readChecked(locator, box.native);
    if (contract?.effect && afterForEffect !== null && click === 'yes') {
      try {
        const toggled = !initial;
        if (afterForEffect !== toggled) await setChecked(locator, box.native, toggled);
        const ok = await contract.effect.assert(page, toggled);
        effectStatus = ok ? 'pass' : 'fail';
        await setChecked(locator, box.native, !!initial);
      } catch {
        effectStatus = 'fail';
      }
    }

    const result = classify({
      visible: true,
      disabled: false,
      intentional: false,
      click,
      label,
      keyboard,
      effect: effectStatus
    });

    const shot = result.startsWith('FAIL')
      ? await screenshotFailure(page, `${viewport}-${spec.id}-${box.id}`)
      : undefined;

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
      focusTarget,
      focusVisible,
      intendedEffect: contract?.effect?.description || (effectStatus === 'needs' ? 'NEEDS_EXPECTATION' : 'State toggle'),
      consoleError: pageErrors.join(' | '),
      result,
      notes: notes.join(' · '),
      screenshot: shot,
      defects
    });
  }

  return rows;
}
