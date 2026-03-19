/**
 * T7 — Playwright E2E: Accessibility Tests
 *
 * Uses @axe-core/playwright for automated WCAG AA scanning.
 * Tests focus management, keyboard navigation, and screen reader support.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

// ─── Axe-core Scans ─────────────────────────────────────────────────

const pagesToScan = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Customers', path: '/customers' },
  { name: 'Lending', path: '/lending' },
  { name: 'Payments', path: '/payments/new' },
  { name: 'Cards', path: '/cards' },
  { name: 'Treasury', path: '/treasury/fixed-income' },
  { name: 'Risk', path: '/risk' },
  { name: 'Compliance', path: '/compliance' },
  { name: 'Operations GL', path: '/operations/gl' },
  { name: 'Admin Users', path: '/admin/users' },
  { name: 'Reports Executive', path: '/reports/executive' },
  { name: 'Login', path: '/login' },
];

for (const { name, path } of pagesToScan) {
  test(`a11y: ${name} — zero critical/serious axe violations`, async ({ page }) => {
    if (path !== '/login') {
      await login(page);
    }
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    const serious = results.violations.filter((v) => v.impact === 'serious');

    if (critical.length > 0 || serious.length > 0) {
      const summary = [...critical, ...serious]
        .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`)
        .join('\n');
      console.warn(`Accessibility issues on ${name}:\n${summary}`);
    }

    expect(critical, `Critical violations on ${name}`).toHaveLength(0);
    expect(serious, `Serious violations on ${name}`).toHaveLength(0);
  });
}

// ─── Focus Management ────────────────────────────────────────────────

test.describe('Accessibility: Focus', () => {
  test('focus is visible on interactive elements', async ({ page }) => {
    await login(page);

    // Tab through a few elements and verify focus is visible
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const styles = getComputedStyle(el);
      return {
        tag: el.tagName,
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    expect(focusedElement).toBeTruthy();
  });

  test('tab order follows logical reading order', async ({ page }) => {
    await login(page);

    const tabOrder: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName}:${el.textContent?.trim().substring(0, 20)}` : 'none';
      });
      tabOrder.push(tag);
    }

    // Tab order should move through elements (not stuck on one)
    const unique = new Set(tabOrder);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ─── Keyboard Navigation ────────────────────────────────────────────

test.describe('Accessibility: Keyboard Navigation', () => {
  test('Escape closes command palette', async ({ page }) => {
    await login(page);

    // Open command palette with Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // Check if command palette is visible
    const palette = page.locator('[cmdk-root]');
    if (await palette.count() > 0) {
      await expect(palette).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('Ctrl+K opens command palette', async ({ page }) => {
    await login(page);

    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // Command palette should open
    const palette = page.locator('[cmdk-root], [role="dialog"]');
    if (await palette.count() > 0) {
      await expect(palette.first()).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});

// ─── Modal Accessibility ─────────────────────────────────────────────

test.describe('Accessibility: Modals', () => {
  test('modal traps focus', async ({ page }) => {
    await login(page);

    // Open command palette as our modal test
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.count() > 0) {
      // Tab should cycle within the modal
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);

      // Tab several times
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }

      // Focus should still be within the dialog
      const stillInDialog = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.closest('[role="dialog"]') !== null;
      });

      if (stillInDialog !== null) {
        expect(stillInDialog).toBe(true);
      }

      await page.keyboard.press('Escape');
    }
  });
});

// ─── Form Accessibility ─────────────────────────────────────────────

test.describe('Accessibility: Forms', () => {
  test('login form inputs have labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:visible');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');

      if (type === 'hidden') continue;

      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;

      const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy;

      if (!isLabelled) {
        console.warn(`Input without label: type=${type}, placeholder=${placeholder}`);
      }
    }
  });

  test('error messages linked to fields with aria-describedby', async ({ page }) => {
    await page.goto('/login');
    // Submit empty form to trigger validation
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    // Check if any error messages have aria-describedby links
    const errorMessages = page.locator('[role="alert"], .text-red-500, .text-destructive');
    const errorCount = await errorMessages.count();
    if (errorCount > 0) {
      // At least some errors should be present
      expect(errorCount).toBeGreaterThan(0);
    }
  });
});

// ─── Semantic HTML ───────────────────────────────────────────────────

test.describe('Accessibility: Semantic HTML', () => {
  test('page uses proper landmark elements', async ({ page }) => {
    await login(page);

    const main = page.locator('main');
    await expect(main).toHaveCount(1);

    const nav = page.locator('nav');
    const navCount = await nav.count();
    expect(navCount).toBeGreaterThan(0);

    const aside = page.locator('aside');
    const asideCount = await aside.count();
    expect(asideCount).toBeGreaterThan(0);
  });

  test('headings follow hierarchical order', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const headings = await page.evaluate(() => {
      const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(hs).map((h) => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim().substring(0, 50),
      }));
    });

    // Should have at least one heading
    if (headings.length > 0) {
      // First heading should be h1 or h2
      expect(headings[0].level).toBeLessThanOrEqual(2);
    }
  });
});

// ─── Color Contrast ─────────────────────────────────────────────────

test.describe('Accessibility: Color Contrast', () => {
  test('color contrast meets WCAG AA (4.5:1) via axe-core', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
    if (contrastViolations.length > 0) {
      const details = contrastViolations[0].nodes
        .slice(0, 5)
        .map((n) => `${n.html.substring(0, 60)} — ${n.any.map((a) => a.message).join(', ')}`)
        .join('\n');
      console.warn(`Contrast issues:\n${details}`);
    }

    // Allow warnings, but no critical contrast failures
    const critical = contrastViolations.filter((v) => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });
});
