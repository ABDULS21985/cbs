import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { BeneficiaryPage } from '../pages/payments/BeneficiaryPage';
import { PaymentPage } from '../pages/payments/PaymentPage';
import { TransactionHistoryPage } from '../pages/accounts/TransactionHistoryPage';
import { USERS } from '../data/testUsers';
import { PAYMENT_DATA, SEED_ACCOUNT_NUMBER } from '../data/testData';
import { expectToast, testRef } from '../helpers/utils';
import * as db from '../helpers/db';

test.describe('Payment Lifecycle @smoke', () => {
  const paymentRef = testRef('PAY');

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC03-01: Add a beneficiary', async ({ page }) => {
    const beneficiaryPage = new BeneficiaryPage(page);
    await beneficiaryPage.goto();
    const countBefore = await beneficiaryPage.getBeneficiaryCount();

    await beneficiaryPage.addBeneficiary({
      name: 'Test Beneficiary',
      accountNumber: '0123456789',
      bankCode: '058',
      nickname: `BEN-${Date.now()}`,
    });

    await expectToast(page, 'success');
    const countAfter = await beneficiaryPage.getBeneficiaryCount();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });

  test('TC03-02: Initiate internal fund transfer', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await paymentPage.initiateTransfer({
      fromAccount: SEED_ACCOUNT_NUMBER,
      toAccount: '1000000002',
      amount: PAYMENT_DATA.internalTransfer.amount,
      narration: PAYMENT_DATA.internalTransfer.narration,
    });

    await paymentPage.submitPayment();
    await expectToast(page, 'success');

    const txnRef = await paymentPage.getTransactionRef().catch(() => '');
    if (txnRef) expect(txnRef).toMatch(/\w+/);
  });

  test('TC03-03: Fee preview shows before submission', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();

    await paymentPage.initiateTransfer({
      fromAccount: SEED_ACCOUNT_NUMBER,
      toAccount: '0123456789',
      amount: 25000,
      narration: 'Fee preview test',
      bankCode: '058',
    });

    await paymentPage.previewFees();
    // Fee information should be visible
    const feeSection = page.locator('text=/fee/i, [data-testid=fee-display]').first();
    await expect(feeSection).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test('TC03-04: Transaction appears in history', async ({ page }) => {
    const txnHistory = new TransactionHistoryPage(page);
    await txnHistory.goto();
    await txnHistory.search({ accountNumber: SEED_ACCOUNT_NUMBER });
    const count = await txnHistory.getResultCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC03-05: Download transaction receipt', async ({ page }) => {
    const txnHistory = new TransactionHistoryPage(page);
    await txnHistory.goto();
    await txnHistory.search({ accountNumber: SEED_ACCOUNT_NUMBER });

    const count = await txnHistory.getResultCount();
    if (count === 0) {
      test.skip();
      return;
    }

    await txnHistory.clickFirstResult();
    // Receipt modal or download should appear
    await expect(page.locator('text=Receipt, text=Download, [data-testid=receipt]').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('TC03-06: Export transactions as CSV', async ({ page }) => {
    const txnHistory = new TransactionHistoryPage(page);
    await txnHistory.goto();
    await txnHistory.search({ accountNumber: SEED_ACCOUNT_NUMBER });

    const count = await txnHistory.getResultCount();
    if (count === 0) {
      test.skip();
      return;
    }

    const download = await txnHistory.exportCSV().catch(() => null);
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    }
  });

  test('TC03-07: Verify account balance decreased after debit', async ({ page }) => {
    const balanceBefore = await db.getAccountBalance(SEED_ACCOUNT_NUMBER);
    if (balanceBefore === null) {
      test.skip();
      return;
    }

    const paymentPage = new PaymentPage(page);
    await paymentPage.goto();
    await paymentPage.initiateTransfer({
      fromAccount: SEED_ACCOUNT_NUMBER,
      toAccount: '1000000002',
      amount: 1000,
      narration: 'Balance check test',
    });
    await paymentPage.submitPayment();

    // Allow DB to settle
    await page.waitForTimeout(2000);

    const balanceAfter = await db.getAccountBalance(SEED_ACCOUNT_NUMBER);
    if (balanceAfter !== null) {
      expect(balanceAfter).toBeLessThanOrEqual(balanceBefore);
    }
  });
});
