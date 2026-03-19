import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AMLAlertsPage } from '../pages/compliance/AMLAlertsPage';
import { AMLAlertDetailPage } from '../pages/compliance/AMLAlertDetailPage';
import { USERS } from '../data/testUsers';
import { expectToast } from '../helpers/utils';

test.describe('AML Alert Investigation', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.compliance.username, USERS.compliance.password);
  });

  test('TC07-01: Navigate to AML alerts page', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC07-02: View list of AML alerts', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();
    // Alerts table or empty state
    await expect(page.locator('table, [data-testid=empty-state], text=/no alerts/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC07-03: Filter alerts by status OPEN', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();
    await amlPage.filterByStatus('OPEN');
    await page.waitForLoadState('networkidle');
    // Should not error
    await expect(page.locator('table, [data-testid=empty-state]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC07-04: Filter by HIGH risk level', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();
    await amlPage.filterByRisk('HIGH');
    await page.waitForLoadState('networkidle');
  });

  test('TC07-05: Open an alert and view details', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();

    const count = await amlPage.getAlertCount();
    if (count === 0) { test.skip(); return; }

    await amlPage.clickFirstAlert();
    const alertDetail = new AMLAlertDetailPage(page);

    const type = await alertDetail.getAlertType();
    expect(type.length).toBeGreaterThan(0);
  });

  test('TC07-06: View transaction timeline in alert', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();

    const count = await amlPage.getAlertCount();
    if (count === 0) { test.skip(); return; }

    await amlPage.clickFirstAlert();
    const alertDetail = new AMLAlertDetailPage(page);
    await alertDetail.viewTransactionTimeline();
    await expect(page.locator('[role=tabpanel]').first()).toBeVisible();
  });

  test('TC07-07: Add investigation note', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();

    const count = await amlPage.getAlertCount();
    if (count === 0) { test.skip(); return; }

    await amlPage.clickFirstAlert();
    const alertDetail = new AMLAlertDetailPage(page);
    await alertDetail.addInvestigationNote('Initial review: Transaction pattern is consistent with legitimate business activity.');
    await expectToast(page, 'success');
  });

  test('TC07-08: Dismiss alert as false positive', async ({ page }) => {
    const amlPage = new AMLAlertsPage(page);
    await amlPage.goto();
    await amlPage.filterByStatus('OPEN');

    const count = await amlPage.getAlertCount();
    if (count === 0) { test.skip(); return; }

    await amlPage.clickFirstAlert();
    const alertDetail = new AMLAlertDetailPage(page);
    await alertDetail.dismissAsFalsePositive('Customer profile and transaction history reviewed — no suspicious activity identified');
    await expectToast(page, 'success');

    const status = await alertDetail.getStatus();
    expect(status.toUpperCase()).toMatch(/CLOSED|DISMISSED|RESOLVED/);
  });
});
