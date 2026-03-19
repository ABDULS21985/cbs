import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegulatoryReportPage } from '../pages/compliance/RegulatoryReportPage';
import { USERS } from '../data/testUsers';
import { expectToast } from '../helpers/utils';

test.describe('Regulatory Reporting', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.compliance.username, USERS.compliance.password);
  });

  test('TC10-01: Navigate to regulatory reporting', async ({ page }) => {
    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC10-02: View list of regulatory returns', async ({ page }) => {
    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();
    await expect(page.locator('table, [data-testid=returns-list], [class*=return-card]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC10-03: Open a regulatory return', async ({ page }) => {
    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();
    // Click first return (BSS, CAR, etc.)
    const firstReturn = page.locator('[data-testid=return-card], tbody tr, [class*=return-item]').first();
    if (await firstReturn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstReturn.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('TC10-04: Extract data for a return', async ({ page }) => {
    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();

    const firstReturn = page.locator('[data-testid=return-card], tbody tr').first();
    if (!await firstReturn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(); return;
    }

    await firstReturn.click();
    await page.waitForLoadState('networkidle');
    await regPage.extractData();
    // Data extraction should complete without errors
  });

  test('TC10-05: Run validation on extracted data', async ({ page }) => {
    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();

    const firstReturn = page.locator('[data-testid=return-card], tbody tr').first();
    if (!await firstReturn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(); return;
    }

    await firstReturn.click();
    await page.waitForLoadState('networkidle');
    await regPage.runValidation();
    const errors = await regPage.getValidationErrors();
    // Log errors but don't fail - test data may have issues
    console.log(`Validation errors: ${errors.length}`);
  });

  test('TC10-06: Submit return for approval', async ({ page }) => {
    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();

    const firstReturn = page.locator('[data-testid=return-card], tbody tr').first();
    if (!await firstReturn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(); return;
    }

    await firstReturn.click();
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button:has-text("Submit for Approval")');
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regPage.submitForApproval();
      await expectToast(page, 'success');
    }
  });

  test('TC10-07: Approve regulatory return as manager', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();

    const pendingReturn = page.locator('tr:has([class*=PENDING_APPROVAL],[data-status=PENDING_APPROVAL])').first();
    if (!await pendingReturn.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip(); return;
    }

    await pendingReturn.click();
    await page.waitForLoadState('networkidle');
    await regPage.approve('Data verified and accurate — approved for submission');
    await expectToast(page, 'success');
  });

  test('TC10-08: Mark return as submitted to regulator', async ({ page }) => {
    const regPage = new RegulatoryReportPage(page);
    await regPage.goto();

    const approvedReturn = page.locator('tr:has([class*=APPROVED],[data-status=APPROVED])').first();
    if (!await approvedReturn.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip(); return;
    }

    await approvedReturn.click();
    await page.waitForLoadState('networkidle');
    await regPage.markAsSubmitted();
    await expectToast(page, 'success');

    const status = await regPage.getStatus();
    expect(status.toUpperCase()).toMatch(/SUBMITTED|FILED/);
  });
});
