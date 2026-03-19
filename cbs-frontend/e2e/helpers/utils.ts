import { Page, Locator, expect } from '@playwright/test';

/** Wait for and dismiss a toast notification, returning its text */
export async function expectToast(page: Page, type: 'success' | 'error' | 'warning' = 'success', timeout = 10_000): Promise<string> {
  const selectors = {
    success: '[data-sonner-toast][data-type="success"], .toast-success, [role="status"]',
    error: '[data-sonner-toast][data-type="error"], .toast-error, [role="alert"]',
    warning: '[data-sonner-toast][data-type="warning"], .toast-warning',
  };
  const locator = page.locator(selectors[type]).first();
  await locator.waitFor({ state: 'visible', timeout });
  const text = await locator.textContent() || '';
  return text.trim();
}

/** Wait for loading spinner to disappear */
export async function waitForLoading(page: Page, timeout = 30_000): Promise<void> {
  const spinner = page.locator('[data-testid=loading], .animate-spin, [aria-busy=true]');
  try {
    await spinner.first().waitFor({ state: 'detached', timeout });
  } catch {
    // Spinner may not be present at all — that's fine
  }
}

/** Select a value from a custom Select (Radix UI) */
export async function selectOption(page: Page, triggerSelector: string, optionText: string): Promise<void> {
  await page.click(triggerSelector);
  await page.click(`[role=option]:has-text("${optionText}")`);
}

/** Fill a date input handling both native and custom pickers */
export async function fillDate(page: Page, selector: string, dateStr: string): Promise<void> {
  const input = page.locator(selector).first();
  await input.fill(dateStr);
  await input.press('Tab');
}

/** Extract text content from a table cell by row and column index */
export async function getCellText(page: Page, rowIndex: number, colIndex: number): Promise<string> {
  const cell = page.locator(`tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`);
  return (await cell.textContent()) || '';
}

/** Get count of table rows (excluding header) */
export async function getTableRowCount(page: Page, tableSelector = 'table'): Promise<number> {
  return page.locator(`${tableSelector} tbody tr`).count();
}

/** Generate a unique test reference */
export function testRef(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Retry an async action up to N times */
export async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('retry exhausted');
}

/** Assert that a URL segment matches */
export async function expectUrlContains(page: Page, segment: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(segment));
}

/** Type into a searchable input and wait for results */
export async function searchAndWait(page: Page, inputSelector: string, term: string): Promise<void> {
  await page.fill(inputSelector, term);
  await waitForLoading(page);
}
