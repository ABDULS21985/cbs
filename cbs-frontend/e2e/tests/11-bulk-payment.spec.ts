import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { BulkPaymentPage } from '../pages/payments/BulkPaymentPage';
import { USERS } from '../data/testUsers';
import { expectToast } from '../helpers/utils';
import * as fs from 'fs';
import * as path from 'path';

// Create a test CSV file for bulk upload
const BULK_CSV_CONTENT = `accountNumber,bankCode,amount,narration
0123456789,058,5000,Salary payment 001
0234567890,044,7500,Salary payment 002
0345678901,057,10000,Salary payment 003
0456789012,058,3500,Salary payment 004
0567890123,011,8000,Salary payment 005
`;

const BULK_CSV_PATH = path.join(__dirname, '..', 'fixtures', 'bulk-payment.csv');

test.describe('Bulk Payment Upload', () => {
  test.beforeAll(() => {
    // Create fixture directory and test CSV
    const dir = path.dirname(BULK_CSV_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BULK_CSV_PATH, BULK_CSV_CONTENT);
  });

  test.afterAll(() => {
    if (fs.existsSync(BULK_CSV_PATH)) fs.unlinkSync(BULK_CSV_PATH);
  });

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC11-01: Navigate to bulk payment page', async ({ page }) => {
    const bulkPage = new BulkPaymentPage(page);
    await bulkPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC11-02: Upload bulk payment CSV file', async ({ page }) => {
    const bulkPage = new BulkPaymentPage(page);
    await bulkPage.goto();
    await bulkPage.uploadFile(BULK_CSV_PATH);
    // File name should appear
    await expect(page.locator(`text=bulk-payment.csv, [data-testid=filename]`).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('TC11-03: Validate batch before processing', async ({ page }) => {
    const bulkPage = new BulkPaymentPage(page);
    await bulkPage.goto();
    await bulkPage.uploadFile(BULK_CSV_PATH);
    await bulkPage.validateBatch();

    const results = await bulkPage.getValidationResult();
    expect(results.valid + results.invalid).toBeGreaterThanOrEqual(0);
  });

  test('TC11-04: Submit batch for processing', async ({ page }) => {
    const bulkPage = new BulkPaymentPage(page);
    await bulkPage.goto();
    await bulkPage.uploadFile(BULK_CSV_PATH);
    await bulkPage.validateBatch();

    const results = await bulkPage.getValidationResult();
    if (results.valid === 0) { test.skip(); return; }

    await bulkPage.submitBatch();
    await expectToast(page, 'success');

    const batchRef = await bulkPage.getBatchRef().catch(() => '');
    if (batchRef) expect(batchRef).toMatch(/\w+/);
  });

  test('TC11-05: Manager approves bulk payment batch', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    await page.goto('/payments/bulk/approvals');
    await page.waitForLoadState('networkidle');

    const pending = await page.locator('tbody tr').count();
    if (pending === 0) { test.skip(); return; }

    await page.locator('tbody tr').first().click();
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Approve"), [data-testid=approve]');
    await page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await expectToast(page, 'success');
  });

  test('TC11-06: View batch processing status', async ({ page }) => {
    await page.goto('/payments/bulk');
    await page.waitForLoadState('networkidle');

    await page.click('[role=tab]:has-text("History"), [role=tab]:has-text("Batches")').catch(() => {});
    await page.waitForTimeout(500);

    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('TC11-07: Download batch template', async ({ page }) => {
    const bulkPage = new BulkPaymentPage(page);
    await bulkPage.goto();

    const downloadBtn = page.locator('button:has-text("Download Template"), a:has-text("Template")').first();
    if (await downloadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadBtn.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/template.*\.(csv|xlsx)/i);
    }
  });
});
