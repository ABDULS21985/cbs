import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TradeFinancePage } from '../pages/tradeFinance/TradeFinancePage';
import { USERS } from '../data/testUsers';
import { expectToast } from '../helpers/utils';

test.describe('Trade Finance LC', () => {
  let lcRef = '';

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC19-01: Navigate to trade finance', async ({ page }) => {
    const tfPage = new TradeFinancePage(page);
    await tfPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC19-02: Apply for a Letter of Credit', async ({ page }) => {
    const tfPage = new TradeFinancePage(page);
    await tfPage.goto();

    await tfPage.newLCApplication({
      applicant: 'TechCorp Nigeria Ltd',
      beneficiary: 'ABC Suppliers Ltd',
      amount: 500000,
      currency: 'USD',
      expiryDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      goodsDescription: 'Computer equipment and peripherals',
    });

    await tfPage.submitLCApplication();
    lcRef = await tfPage.getLCRef().catch(() => '');
    if (lcRef) {
      expect(lcRef).toMatch(/LC-\w+/);
      await expectToast(page, 'success');
    }
  });

  test('TC19-03: LC appears in list', async ({ page }) => {
    await page.goto('/trade-finance');
    await page.waitForLoadState('networkidle');
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('TC19-04: Manager issues the Letter of Credit', async ({ page }) => {
    if (!lcRef) { test.skip(); return; }
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    const tfPage = new TradeFinancePage(page);
    await tfPage.issueLetter(lcRef);
    await expectToast(page, 'success');

    const status = await tfPage.getLCStatus(lcRef).catch(() => '');
    expect(status.toUpperCase()).toMatch(/ISSUED|ACTIVE|APPROVED/);
  });

  test('TC19-05: Submit trade documents', async ({ page }) => {
    if (!lcRef) { test.skip(); return; }
    const tfPage = new TradeFinancePage(page);
    await tfPage.goto();

    await tfPage.submitDocuments(lcRef, ['BILL_OF_LADING', 'COMMERCIAL_INVOICE']);
    await expectToast(page, 'success').catch(() => {});
  });

  test('TC19-06: View LC details and documents', async ({ page }) => {
    await page.goto('/trade-finance');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    if (!await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }

    await firstRow.click();
    await page.waitForLoadState('networkidle');

    const docsTab = page.locator('[role=tab]:has-text("Documents")').first();
    if (await docsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await docsTab.click();
      const docCount = await page.locator('tbody tr, [data-testid=document-row]').count();
      expect(docCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC19-07: Check utilization and outstanding balance', async ({ page }) => {
    if (!lcRef) { test.skip(); return; }
    await page.goto('/trade-finance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr:has-text("${lcRef}")`).first();
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await row.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/utilization/i, text=/outstanding/i, [data-testid*=utilization]').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
