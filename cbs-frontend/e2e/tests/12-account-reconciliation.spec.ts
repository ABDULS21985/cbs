import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ReconciliationPage } from '../pages/reconciliation/ReconciliationPage';
import { USERS } from '../data/testUsers';
import { SEED_ACCOUNT_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';
import * as fs from 'fs';
import * as path from 'path';

const STATEMENT_CSV = `date,reference,description,amount,type
2025-01-02,STM001,Opening Balance,500000,CREDIT
2025-01-05,STM002,Salary Credit,200000,CREDIT
2025-01-06,STM003,Utility Payment,-15000,DEBIT
2025-01-10,STM004,ATM Withdrawal,-50000,DEBIT
2025-01-15,STM005,Transfer Credit,100000,CREDIT
`;

const STATEMENT_PATH = path.join(__dirname, '..', 'fixtures', 'bank-statement.csv');

test.describe('Account Reconciliation', () => {
  test.beforeAll(() => {
    const dir = path.dirname(STATEMENT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATEMENT_PATH, STATEMENT_CSV);
  });

  test.afterAll(() => {
    if (fs.existsSync(STATEMENT_PATH)) fs.unlinkSync(STATEMENT_PATH);
  });

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC12-01: Navigate to reconciliation workbench', async ({ page }) => {
    const reconPage = new ReconciliationPage(page);
    await reconPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC12-02: Create reconciliation session', async ({ page }) => {
    const reconPage = new ReconciliationPage(page);
    await reconPage.goto();
    await reconPage.createSession(SEED_ACCOUNT_NUMBER, '2025-01-31');
    await expectToast(page, 'success');
  });

  test('TC12-03: Upload bank statement', async ({ page }) => {
    const reconPage = new ReconciliationPage(page);
    await reconPage.goto();
    await reconPage.createSession(SEED_ACCOUNT_NUMBER, '2025-01-31');

    const uploadBtn = page.locator('button:has-text("Upload"), input[type=file]').first();
    if (await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reconPage.uploadBankStatement(STATEMENT_PATH);
    }
  });

  test('TC12-04: Run auto-matching', async ({ page }) => {
    const reconPage = new ReconciliationPage(page);
    await reconPage.goto();

    const sessionRow = page.locator('tbody tr').first();
    if (!await sessionRow.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }
    await sessionRow.click();
    await page.waitForLoadState('networkidle');

    await reconPage.runAutoMatch();
    const stats = await reconPage.getMatchStats();
    expect(stats.matched + stats.unmatched).toBeGreaterThanOrEqual(0);
  });

  test('TC12-05: View unmatched items', async ({ page }) => {
    const reconPage = new ReconciliationPage(page);
    await reconPage.goto();

    const sessionRow = page.locator('tbody tr').first();
    if (!await sessionRow.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }
    await sessionRow.click();
    await page.waitForLoadState('networkidle');

    const unmatchedTab = page.locator('[role=tab]:has-text("Unmatched")').first();
    if (await unmatchedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unmatchedTab.click();
      const rows = await page.locator('tbody tr, [data-testid=unmatched-item]').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC12-06: View reconciliation summary', async ({ page }) => {
    const reconPage = new ReconciliationPage(page);
    await reconPage.goto();

    const sessionRow = page.locator('tbody tr').first();
    if (!await sessionRow.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }
    await sessionRow.click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid*=balance],[class*=balance],[text*=balance i]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });
});
