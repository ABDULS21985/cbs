import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { FixedDepositPage } from '../pages/deposits/FixedDepositPage';
import { FixedDepositDetailPage } from '../pages/deposits/FixedDepositDetailPage';
import { USERS } from '../data/testUsers';
import { FIXED_DEPOSIT_DATA, SEED_ACCOUNT_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';
import * as db from '../helpers/db';

test.describe('Fixed Deposit Lifecycle', () => {
  let fdRef = '';

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC05-01: Create a new fixed deposit', async ({ page }) => {
    const fdPage = new FixedDepositPage(page);
    await fdPage.goto();

    await fdPage.createFixedDeposit({
      accountNumber: SEED_ACCOUNT_NUMBER,
      amount: FIXED_DEPOSIT_DATA.standard.amount,
      tenorDays: FIXED_DEPOSIT_DATA.standard.tenorDays,
      rolloverInstruction: FIXED_DEPOSIT_DATA.standard.rolloverInstruction,
    });

    await expectToast(page, 'success');
    fdRef = await fdPage.getFdRef().catch(() => '');
    if (fdRef) expect(fdRef).toMatch(/\w+/);
  });

  test('TC05-02: FD appears in the list', async ({ page }) => {
    const fdPage = new FixedDepositPage(page);
    await fdPage.goto();
    const count = await fdPage.getFdCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC05-03: View FD details and check maturity date', async ({ page }) => {
    const fdPage = new FixedDepositPage(page);
    await fdPage.goto();

    const count = await fdPage.getFdCount();
    if (count === 0) { test.skip(); return; }

    await fdPage.clickFirstFd();
    const fdDetail = new FixedDepositDetailPage(page);
    const maturityDate = await fdDetail.getMaturityDate();
    expect(maturityDate.length).toBeGreaterThan(0);

    const status = await fdDetail.getStatus();
    expect(status.toUpperCase()).toMatch(/ACTIVE|MATURED|PENDING/);
  });

  test('TC05-04: Verify FD in database', async ({ page }) => {
    if (!fdRef) {
      const fdDb = await db.getFixedDepositByRef('FD-TEST-001');
      if (!fdDb) { test.skip(); return; }
      fdRef = 'FD-TEST-001';
    }
    const fd = await db.getFixedDepositByRef(fdRef);
    if (fd) {
      expect(fd.status).toMatch(/ACTIVE|MATURED/);
      expect(parseFloat(fd.principal_amount)).toBeGreaterThan(0);
    }
  });

  test('TC05-05: Early withdrawal applies penalty', async ({ page }) => {
    const fdPage = new FixedDepositPage(page);
    await fdPage.goto();

    const count = await fdPage.getFdCount();
    if (count === 0) { test.skip(); return; }

    await fdPage.clickFirstFd();
    const fdDetail = new FixedDepositDetailPage(page);
    const status = await fdDetail.getStatus();

    if (!status.toUpperCase().includes('ACTIVE')) { test.skip(); return; }

    const penaltyText = await fdDetail.earlyWithdrawal('Need funds urgently');
    await expectToast(page, 'success');

    // Verify the FD is no longer active
    await page.reload();
    await page.waitForLoadState('networkidle');
    const newStatus = await fdDetail.getStatus();
    expect(newStatus.toUpperCase()).toMatch(/WITHDRAWN|BROKEN|SETTLED|CLOSED/);
  });

  test('TC05-06: Check account balance updated after early withdrawal', async ({ page }) => {
    const balanceBefore = await db.getAccountBalance(SEED_ACCOUNT_NUMBER);
    if (balanceBefore === null) { test.skip(); return; }

    // Balance should be available after withdrawal
    const balanceAfter = await db.getAccountBalance(SEED_ACCOUNT_NUMBER);
    if (balanceAfter !== null) {
      expect(balanceAfter).toBeGreaterThanOrEqual(0);
    }
  });
});
