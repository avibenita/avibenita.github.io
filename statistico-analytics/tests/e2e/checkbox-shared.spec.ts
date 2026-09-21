import { test, expect } from '@playwright/test';

test.describe('shared checkbox component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/shared-checkbox.html');
    await page.evaluate(() => {
      (window as unknown as { __changes: unknown[] }).__changes = [];
    });
  });

  test('label click calls onChange once with the next checked value', async ({ page }) => {
    await page.locator('#uncontrolledLabel').click();
    const changes = await page.evaluate(() => (window as unknown as { __changes: Array<{ id: string; checked: boolean }> }).__changes);
    const mine = changes.filter((c) => c.id === 'uncontrolledBox');
    expect(mine).toHaveLength(1);
    expect(mine[0].checked).toBe(true);
    await expect(page.locator('#uncontrolledBox')).toBeChecked();
  });

  test('controlled mode stays in sync with the handler value', async ({ page }) => {
    await page.locator('#controlledLabel').click();
    await expect(page.locator('#controlledBox')).toBeChecked();
    await page.locator('#controlledLabel').click();
    await expect(page.locator('#controlledBox')).not.toBeChecked();
    const changes = await page.evaluate(() => (window as unknown as { __changes: Array<{ id: string; checked: boolean }> }).__changes);
    expect(changes.filter((c) => c.id === 'controlledBox').map((c) => c.checked)).toEqual([true, false]);
  });

  test('uncontrolled mode toggles without an external setter', async ({ page }) => {
    const box = page.locator('#uncontrolledBox');
    await page.locator('#uncontrolledLabel').click();
    await expect(box).toBeChecked();
    await page.locator('#uncontrolledLabel').click();
    await expect(box).not.toBeChecked();
  });

  test('disabled checkbox cannot be changed by label or keyboard', async ({ page }) => {
    await page.locator('#disabledLabel').dispatchEvent('click');
    await expect(page.locator('#disabledBox')).not.toBeChecked();
    await page.evaluate(() => {
      const el = document.getElementById('disabledBox') as HTMLInputElement | null;
      el?.focus();
    });
    await page.keyboard.press('Space');
    await expect(page.locator('#disabledBox')).not.toBeChecked();
    const changes = await page.evaluate(() => (window as unknown as { __changes: Array<{ id: string }> }).__changes);
    expect(changes.filter((c) => c.id === 'disabledBox')).toHaveLength(0);
  });

  test('associated label (for=) toggles the checkbox', async ({ page }) => {
    await page.locator('#forLabel').click();
    await expect(page.locator('#forBox')).toBeChecked();
  });

  test('keyboard Space toggles a focused native checkbox', async ({ page }) => {
    await page.locator('#forBox').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#forBox')).toBeChecked();
  });

  test('custom role=checkbox updates aria-checked and supports Space', async ({ page }) => {
    const custom = page.locator('#customBox');
    await expect(custom).toHaveAttribute('aria-checked', 'false');
    await custom.click();
    await expect(custom).toHaveAttribute('aria-checked', 'true');
    await custom.focus();
    await page.keyboard.press('Space');
    await expect(custom).toHaveAttribute('aria-checked', 'false');
  });
});
