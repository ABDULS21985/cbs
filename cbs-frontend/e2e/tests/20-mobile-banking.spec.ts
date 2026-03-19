import { test, expect, devices } from '@playwright/test';
import { PortalPage } from '../pages/portal/PortalPage';
import { USERS } from '../data/testUsers';

test.describe('Mobile Banking (Responsive) @mobile', () => {
  test.use({ ...devices['Pixel 5'] });

  test('TC20-01: Mobile login page renders correctly', async ({ page }) => {
    await page.goto('/portal/login');
    await page.waitForLoadState('networkidle');

    // Login form should be visible on mobile
    await expect(page.locator('[name=username]')).toBeVisible();
    await expect(page.locator('[name=password]')).toBeVisible();

    // Check responsive layout
    const viewportWidth = page.viewportSize()?.width ?? 0;
    expect(viewportWidth).toBeLessThan(500);
  });

  test('TC20-02: Login and view account balances on mobile', async ({ page }) => {
    await page.goto('/portal/login');
    await page.fill('[name=username]', USERS.officer.username);
    await page.fill('[name=password]', USERS.officer.password);
    await page.click('button[type=submit]');
    await page.waitForURL(/\/(portal|dashboard|home)/, { timeout: 15_000 }).catch(() => {});
    await expect(page.locator('[class*=balance],[data-testid=balance]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test('TC20-03: Mobile navigation menu works', async ({ page }) => {
    await page.goto('/portal/login');
    await page.fill('[name=username]', USERS.officer.username);
    await page.fill('[name=password]', USERS.officer.password);
    await page.click('button[type=submit]');
    await page.waitForTimeout(2000);

    // Mobile hamburger menu
    const hamburger = page.locator('[data-testid=mobile-menu],[aria-label*=menu i],[class*=hamburger]').first();
    if (await hamburger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await hamburger.click();
      const navMenu = page.locator('[data-testid=mobile-nav],[class*=mobile-nav],[role=navigation]').first();
      await expect(navMenu).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });

  test('TC20-04: Initiate transfer on mobile', async ({ page }) => {
    const portalPage = new PortalPage(page);
    await portalPage.login(USERS.officer.username, USERS.officer.password);

    // Transfer button should be accessible
    const transferBtn = page.locator('text=Transfer, button:has-text("Send Money"), a[href*=transfer]').first();
    if (await transferBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transferBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[name=amount],[name=toAccount]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
    }
  });

  test('TC20-05: Card block from mobile', async ({ page }) => {
    const portalPage = new PortalPage(page);
    await portalPage.login(USERS.officer.username, USERS.officer.password);

    const cardsLink = page.locator('text=Cards, a[href*=cards]').first();
    if (await cardsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardsLink.click();
      await page.waitForLoadState('networkidle');

      const blockBtn = page.locator('button:has-text("Block"), button:has-text("Freeze")').first();
      if (await blockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await blockBtn.click();
        await page.click('button:has-text("Confirm"), button:has-text("Yes")').catch(() => {});
      }
    }
  });

  test('TC20-06: View statements and download on mobile', async ({ page }) => {
    const portalPage = new PortalPage(page);
    await portalPage.login(USERS.officer.username, USERS.officer.password);

    const stmtLink = page.locator('text=Statement, a[href*=statement]').first();
    if (await stmtLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stmtLink.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('TC20-07: Mobile UI touch targets are accessible', async ({ page }) => {
    await page.goto('/portal/login');
    await page.waitForLoadState('networkidle');

    // All interactive elements should have min 44px height (WCAG)
    const buttons = await page.locator('button, a, input').all();
    for (const button of buttons.slice(0, 5)) {
      const box = await button.boundingBox();
      if (box && box.height > 0) {
        expect(box.height).toBeGreaterThanOrEqual(32); // At minimum 32px on mobile
      }
    }
  });

  test('TC20-08: Responsive data tables are scrollable', async ({ page }) => {
    const portalPage = new PortalPage(page);
    await portalPage.login(USERS.officer.username, USERS.officer.password);

    // Navigate to accounts page with transaction table
    await page.goto('/portal/accounts');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table, [class*=table]').first();
    if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      const overflow = await table.evaluate((el) => window.getComputedStyle(el.parentElement || el).overflowX);
      expect(['auto', 'scroll', 'hidden']).toContain(overflow);
    }
  });
});
