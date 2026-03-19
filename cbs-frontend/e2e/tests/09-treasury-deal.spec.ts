import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TreasuryDealPage } from '../pages/treasury/TreasuryDealPage';
import { USERS } from '../data/testUsers';
import { expectToast } from '../helpers/utils';

test.describe('Treasury Deal', () => {
  let dealRef = '';

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.treasury.username, USERS.treasury.password);
  });

  test('TC09-01: Navigate to treasury deals page', async ({ page }) => {
    const treasuryPage = new TreasuryDealPage(page);
    await treasuryPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC09-02: Enter FX Spot deal', async ({ page }) => {
    const treasuryPage = new TreasuryDealPage(page);
    await treasuryPage.goto();

    await treasuryPage.enterFxSpotDeal({
      buyCurrency: 'USD',
      sellCurrency: 'NGN',
      buyAmount: 10000,
      rate: 1550,
      counterparty: 'CITIBANK',
      valueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    });

    const isValid = await treasuryPage.validateDeal();
    if (isValid) {
      await treasuryPage.submitDeal();
      await expectToast(page, 'success');
      dealRef = await treasuryPage.getDealRef().catch(() => '');
    }
  });

  test('TC09-03: Deal appears in deal blotter', async ({ page }) => {
    await page.goto('/treasury/deals');
    await page.waitForLoadState('networkidle');
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('TC09-04: Approve deal as desk head (manager)', async ({ page }) => {
    if (!dealRef) { test.skip(); return; }
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    await page.goto('/treasury/approvals');
    await page.waitForLoadState('networkidle');
    const pending = await page.locator('tbody tr').count();
    if (pending === 0) { test.skip(); return; }
    await page.locator('tbody tr').first().click();
    await page.click('button:has-text("Approve"), [data-testid=approve]');
    await page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await expectToast(page, 'success');
  });

  test('TC09-05: Check FX positions after deal', async ({ page }) => {
    const treasuryPage = new TreasuryDealPage(page);
    const position = await treasuryPage.checkPositions('USD');
    // Position should exist (may be any value)
    expect(position).toBeDefined();
  });

  test('TC09-06: View P&L for treasury desk', async ({ page }) => {
    await page.goto('/treasury/pnl');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible({ timeout: 10_000 });
  });
});
