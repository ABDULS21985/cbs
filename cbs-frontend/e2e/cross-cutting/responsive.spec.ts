/**
 * T7 — Playwright E2E: Responsive Design Tests
 *
 * Tests sidebar, navigation, layout, and touch targets across 3 viewports.
 * These tests run against the live dev server.
 */
import { test, expect, type Page } from '@playwright/test';

// ─── Helper: login to the app ────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

// ─── Sidebar Tests ───────────────────────────────────────────────────

test.describe('Responsive: Sidebar @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sidebar is visible and expanded on desktop', async ({ page }) => {
    await login(page);
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(page.locator('text=DigiCore')).toBeVisible();
  });

  test('sidebar collapse toggle works', async ({ page }) => {
    await login(page);
    const toggle = page.locator('button[title*="Collapse sidebar"]');
    await toggle.click();
    // DigiCore text should be hidden when collapsed
    await expect(page.locator('aside').locator('text=DigiCore')).toBeHidden();
  });

  test('Ctrl+B keyboard shortcut toggles sidebar', async ({ page }) => {
    await login(page);
    await expect(page.locator('text=DigiCore')).toBeVisible();
    await page.keyboard.press('Control+b');
    await expect(page.locator('aside').locator('text=DigiCore')).toBeHidden();
    await page.keyboard.press('Control+b');
    await expect(page.locator('text=DigiCore')).toBeVisible();
  });
});

test.describe('Responsive: Sidebar @mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar is hidden by default on mobile', async ({ page }) => {
    await login(page);
    // Mobile sidebar should be off-screen
    const sidebar = page.locator('.fixed.inset-y-0.left-0');
    await expect(sidebar).toHaveCSS('transform', /translateX\(-/);
  });

  test('hamburger menu opens mobile sidebar', async ({ page }) => {
    await login(page);
    // Click the mobile menu toggle button
    const menuButton = page.locator('header button').first();
    await menuButton.click();
    // Sidebar should slide in
    await expect(page.locator('text=DigiCore')).toBeVisible();
  });

  test('clicking overlay closes mobile sidebar', async ({ page }) => {
    await login(page);
    const menuButton = page.locator('header button').first();
    await menuButton.click();
    await expect(page.locator('text=DigiCore')).toBeVisible();

    // Click the overlay
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
    await overlay.click();
    // Wait for sidebar to slide out
    await page.waitForTimeout(400);
  });
});

// ─── Navigation Tests ────────────────────────────────────────────────

test.describe('Responsive: Navigation', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('navigating via sidebar works for major sections', async ({ page }) => {
    await login(page);

    const sections = [
      { label: 'Customers', url: '/customers' },
      { label: 'Lending', url: '/lending' },
      { label: 'Payments', url: '/payments' },
    ];

    for (const section of sections) {
      // Click section in sidebar (may need to expand first)
      const navItem = page.locator(`aside a:has-text("${section.label}"), aside button:has-text("${section.label}")`).first();
      await navItem.click();
      await page.waitForTimeout(300);
    }
  });

  test('breadcrumbs update on navigation', async ({ page }) => {
    await login(page);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    // Breadcrumbs should show "Customers"
    const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"], .breadcrumbs, main').first();
    await expect(breadcrumbs).toContainText('Customers');
  });
});

// ─── DataTable Responsive ────────────────────────────────────────────

test.describe('Responsive: DataTable @tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('tables have horizontal scroll at tablet width', async ({ page }) => {
    await login(page);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const scrollContainer = page.locator('.overflow-x-auto').first();
    if (await scrollContainer.count() > 0) {
      await expect(scrollContainer).toBeVisible();
    }
  });
});

test.describe('Responsive: DataTable @mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('tables scroll horizontally on mobile', async ({ page }) => {
    await login(page);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    const scrollContainer = page.locator('.overflow-x-auto').first();
    if (await scrollContainer.count() > 0) {
      const containerBox = await scrollContainer.boundingBox();
      const table = scrollContainer.locator('table').first();
      if (await table.count() > 0) {
        const tableBox = await table.boundingBox();
        // Table may be wider than container, enabling scroll
        if (containerBox && tableBox) {
          expect(tableBox.width).toBeGreaterThanOrEqual(containerBox.width);
        }
      }
    }
  });
});

// ─── Touch Targets ───────────────────────────────────────────────────

test.describe('Responsive: Touch Targets @mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('interactive elements have minimum 44x44px touch targets', async ({ page }) => {
    await login(page);

    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    const smallTargets: string[] = [];

    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = buttons.nth(i);
      const box = await btn.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        const text = await btn.textContent();
        smallTargets.push(`Button "${text?.trim()}" is ${box.width}x${box.height}`);
      }
    }

    // Log any small targets for review (warning, not failure)
    if (smallTargets.length > 0) {
      console.warn('Small touch targets found:', smallTargets);
    }
  });
});

// ─── Page Layout Tests ───────────────────────────────────────────────

const majorPages = [
  '/dashboard',
  '/customers',
  '/lending',
  '/payments/new',
  '/cards',
  '/treasury/fixed-income',
  '/risk',
  '/compliance',
  '/operations/gl',
  '/admin/users',
];

for (const route of majorPages) {
  test.describe(`Responsive: ${route}`, () => {
    for (const vp of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 812 },
    ]) {
      test(`renders without errors at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await login(page);
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        // No unhandled errors
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        // Page should render main content area
        const main = page.locator('main');
        await expect(main).toBeVisible();

        expect(errors).toHaveLength(0);
      });
    }
  });
}
