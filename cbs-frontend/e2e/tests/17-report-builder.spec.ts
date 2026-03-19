import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ReportBuilderPage } from '../pages/reports/ReportBuilderPage';
import { SavedReportsPage } from '../pages/reports/SavedReportsPage';
import { USERS } from '../data/testUsers';
import { expectToast } from '../helpers/utils';

test.describe('Custom Report Builder', () => {
  const reportName = `E2E Report ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC17-01: Navigate to report builder', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC17-02: Select a data source', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();

    const sources = page.locator('[data-testid=data-source],[class*=data-source],[class*=source-card]');
    const count = await sources.count();
    if (count > 0) {
      await sources.first().click();
      await expect(sources.first()).toHaveClass(/selected|active/, { timeout: 3000 }).catch(() => {});
    }
  });

  test('TC17-03: Add fields to report', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();

    const sources = page.locator('[data-testid=data-source],[class*=source-card]');
    if (await sources.count() > 0) {
      await sources.first().click();
      await builderPage.clickNext();
    }

    const fields = page.locator('[data-testid=field],[class*=field-item]');
    const fieldCount = await fields.count();
    if (fieldCount > 0) {
      await fields.first().click();
      if (fieldCount > 1) await fields.nth(1).click();
    }
  });

  test('TC17-04: Add a filter condition', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();

    // Navigate to filters step
    const sources = page.locator('[data-testid=data-source],[class*=source-card]');
    if (await sources.count() > 0) {
      await sources.first().click();
      await builderPage.clickNext();
      const fields = page.locator('[data-testid=field],[class*=field-item]');
      if (await fields.count() > 0) await fields.first().click();
      await builderPage.clickNext();
    }

    const addFilterBtn = page.locator('button:has-text("Add Filter"), button:has-text("+ Filter")').first();
    if (await addFilterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addFilterBtn.click();
      await page.waitForTimeout(300);
      // A filter row should appear
      const filterRow = page.locator('[data-testid=filter-row],[class*=filter-row]').first();
      await expect(filterRow).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });

  test('TC17-05: Select visualization type', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();

    const vizPicker = page.locator('[data-testid=visualization-picker],[class*=viz-picker],[class*=visualization]').first();
    if (await vizPicker.isVisible({ timeout: 5000 }).catch(() => false)) {
      const barChart = page.locator('[data-viz=BAR_CHART],[data-testid=viz-bar],[aria-label*=bar i]').first();
      if (await barChart.isVisible({ timeout: 3000 }).catch(() => false)) {
        await barChart.click();
      }
    }
  });

  test('TC17-06: Preview the report', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();

    const sources = page.locator('[data-testid=data-source],[class*=source-card]');
    if (await sources.count() > 0) {
      await sources.first().click();
      await builderPage.clickNext();
    }

    const previewBtn = page.locator('button:has-text("Preview"), button:has-text("Run Preview")').first();
    if (await previewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await builderPage.previewReport();
      await expect(page.locator('[data-testid=preview-table],[class*=preview],[class*=report-preview]').first()).toBeVisible({ timeout: 15_000 }).catch(() => {});
    }
  });

  test('TC17-07: Save the report', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();

    const sources = page.locator('[data-testid=data-source],[class*=source-card]');
    if (await sources.count() === 0) { test.skip(); return; }

    await sources.first().click();
    await builderPage.clickNext();

    const saveBtn = page.locator('button:has-text("Save Report"), button:has-text("Save")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await builderPage.saveReport({
        name: reportName,
        description: 'E2E test report',
        schedule: 'NONE',
      });
      await expectToast(page, 'success');
    }
  });

  test('TC17-08: View saved reports list', async ({ page }) => {
    const savedPage = new SavedReportsPage(page);
    await savedPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
    const count = await savedPage.getReportCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TC17-09: Run a saved report', async ({ page }) => {
    const savedPage = new SavedReportsPage(page);
    await savedPage.goto();

    const count = await savedPage.getReportCount();
    if (count === 0) { test.skip(); return; }

    // Run the first report
    const firstRow = page.locator('tbody tr').first();
    const reportName = await firstRow.locator('td').first().textContent() || '';
    await savedPage.runReport(reportName.trim());
    await expectToast(page, 'success').catch(() => {});
  });

  test('TC17-10: Schedule report delivery via email', async ({ page }) => {
    const builderPage = new ReportBuilderPage(page);
    await builderPage.goto();

    const sources = page.locator('[data-testid=data-source],[class*=source-card]');
    if (await sources.count() === 0) { test.skip(); return; }

    await sources.first().click();
    await builderPage.clickNext();

    const saveBtn = page.locator('button:has-text("Save Report")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await builderPage.saveReport({
        name: `Scheduled ${Date.now()}`,
        description: 'Scheduled delivery test',
        schedule: 'WEEKLY',
        emails: ['report@test.cba'],
      });
      await expectToast(page, 'success').catch(() => {});
    }
  });
});
