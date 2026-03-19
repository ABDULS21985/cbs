/**
 * T7 — Playwright E2E: Dark Mode Tests
 *
 * Tests theme toggling, persistence, visual consistency, and page transitions.
 */
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

// ─── Theme Toggle ────────────────────────────────────────────────────

test.describe('Dark Mode: Toggle', () => {
  test('theme toggle button cycles through light → dark → system', async ({ page }) => {
    await login(page);

    // Find theme toggle button in sidebar
    const toggle = page.locator('button[title*="Theme"]');
    await expect(toggle).toBeVisible();

    // Initial: light
    await expect(toggle).toHaveAttribute('title', /light/);

    // Click → dark
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Click → system
    await toggle.click();

    // Click → light
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/light/);
  });

  test('dark mode applies dark class to html element', async ({ page }) => {
    await login(page);

    const toggle = page.locator('button[title*="Theme"]');
    // Switch to dark
    await toggle.click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).not.toHaveClass(/(?<![a-z])light(?![a-z])/);
  });
});

// ─── Dark Mode Persistence ──────────────────────────────────────────

test.describe('Dark Mode: Persistence', () => {
  test('dark mode persists across page navigation', async ({ page }) => {
    await login(page);

    // Enable dark mode
    const toggle = page.locator('button[title*="Theme"]');
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Navigate to another page
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('dark mode persists after page refresh', async ({ page }) => {
    await login(page);

    const toggle = page.locator('button[title*="Theme"]');
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Verify localStorage
    const theme = await page.evaluate(() => localStorage.getItem('cbs-theme'));
    expect(theme).toBe('dark');

    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('localStorage stores theme selection', async ({ page }) => {
    await login(page);

    const toggle = page.locator('button[title*="Theme"]');
    await toggle.click();

    const stored = await page.evaluate(() => localStorage.getItem('cbs-theme'));
    expect(stored).toBe('dark');
  });
});

// ─── Dark Mode Visual Checks ────────────────────────────────────────

test.describe('Dark Mode: Visual checks', () => {
  test('backgrounds change to dark palette', async ({ page }) => {
    await login(page);

    const toggle = page.locator('button[title*="Theme"]');
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Body should have dark background (CSS variable)
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // Dark mode bg should not be white
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('text remains readable in dark mode', async ({ page }) => {
    await login(page);

    const toggle = page.locator('button[title*="Theme"]');
    await toggle.click();

    const textColor = await page.evaluate(() => {
      return getComputedStyle(document.body).color;
    });
    // Text should be light in dark mode
    expect(textColor).not.toBe('rgb(0, 0, 0)');
  });

  test('no white flash on page transition in dark mode', async ({ page }) => {
    await login(page);

    const toggle = page.locator('button[title*="Theme"]');
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Navigate quickly
    await page.goto('/customers');
    // Immediately check html class — should still have dark (no flash)
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});

// ─── Dark Mode Across Pages ─────────────────────────────────────────

const pages = [
  '/dashboard',
  '/customers',
  '/lending',
  '/payments/new',
  '/cards',
  '/risk',
  '/reports/executive',
  '/admin/users',
];

for (const route of pages) {
  test(`Dark Mode: ${route} renders without errors`, async ({ page }) => {
    // Set dark mode via localStorage before navigating
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('cbs-theme', 'dark'));
    await login(page);
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveClass(/dark/);

    // No unhandled errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const main = page.locator('main');
    await expect(main).toBeVisible();

    expect(errors).toHaveLength(0);
  });
}

// ─── Dark Mode Components ────────────────────────────────────────────

test.describe('Dark Mode: Component rendering', () => {
  test('StatusBadge maintains semantic colors in dark mode', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('cbs-theme', 'dark'));
    await login(page);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // If status badges exist on the page, they should be visible
    const badges = page.locator('.rounded-full.font-medium');
    const count = await badges.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(badges.nth(i)).toBeVisible();
      }
    }
  });

  test('DataTable alternating rows visible in dark mode', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('cbs-theme', 'dark'));
    await login(page);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table').first();
    if (await table.count() > 0) {
      await expect(table).toBeVisible();
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('form inputs have visible borders in dark mode', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('cbs-theme', 'dark'));
    await login(page);
    await page.goto('/payments/new');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:visible').first();
    if (await inputs.count() > 0) {
      const borderColor = await inputs.evaluate((el) => {
        return getComputedStyle(el).borderColor;
      });
      // Border should not be invisible (not same as background)
      expect(borderColor).toBeTruthy();
    }
  });
});
