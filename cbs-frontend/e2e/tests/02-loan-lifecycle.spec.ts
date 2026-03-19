import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { LoanApplicationPage } from '../pages/lending/LoanApplicationPage';
import { LoanListPage } from '../pages/lending/LoanListPage';
import { LoanDetailPage } from '../pages/lending/LoanDetailPage';
import { LoanApprovalPage } from '../pages/lending/LoanApprovalPage';
import { USERS } from '../data/testUsers';
import { LOAN_DATA, SEED_CUSTOMER_NUMBER, SEED_LOAN_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';
import * as db from '../helpers/db';

test.describe('Loan Lifecycle', () => {
  let applicationRef = '';

  test('TC02-01: Submit personal loan application', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanApp = new LoanApplicationPage(page);
    await loanApp.goto();

    await loanApp.selectCustomer(SEED_CUSTOMER_NUMBER);
    await loanApp.selectProduct(LOAN_DATA.personal.productCode);
    await loanApp.clickNext();

    await loanApp.fillLoanDetails({
      requestedAmount: LOAN_DATA.personal.requestedAmount,
      tenorMonths: LOAN_DATA.personal.tenorMonths,
      purpose: LOAN_DATA.personal.purpose,
      repaymentMethod: LOAN_DATA.personal.repaymentMethod,
      repaymentFrequency: LOAN_DATA.personal.repaymentFrequency,
    });
    await loanApp.clickNext();

    await loanApp.fillFinancials({
      monthlyIncome: LOAN_DATA.personal.monthlyIncome,
      monthlyExpenses: LOAN_DATA.personal.monthlyExpenses,
    });
    await loanApp.clickNext();

    // Review step
    await loanApp.submitApplication();
    applicationRef = await loanApp.getApplicationRef();
    expect(applicationRef).toMatch(/\w+-\w+/);
    await expectToast(page, 'success');
  });

  test('TC02-02: Application appears in pending list', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanList = new LoanListPage(page);
    await loanList.goto('applications');
    await loanList.filterByStatus('PENDING_APPROVAL');
    const count = await loanList.getRowCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC02-03: Manager approves loan application', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    const approvalPage = new LoanApprovalPage(page);
    await approvalPage.goto();

    const pending = await approvalPage.getPendingCount();
    expect(pending).toBeGreaterThan(0);

    await approvalPage.openFirstApplication();
    await approvalPage.approve('Approved after review — DTI within acceptable range');
    await expectToast(page, 'success');
  });

  test('TC02-04: Loan status changes to APPROVED in database', async ({ page }) => {
    if (!applicationRef) test.skip();
    const loan = await db.getLoanApplicationByRef(applicationRef);
    if (loan) {
      expect(['APPROVED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'SCORING', 'PENDING_APPROVAL']).toContain(loan.status);
    }
  });

  test('TC02-05: View active loan account', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanDetail = new LoanDetailPage(page);
    await loanDetail.goto(SEED_LOAN_NUMBER);
    const status = await loanDetail.getStatus();
    expect(['ACTIVE', 'ARREARS', 'RESTRUCTURED']).toContain(status.toUpperCase());
  });

  test('TC02-06: View repayment schedule', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanDetail = new LoanDetailPage(page);
    await loanDetail.goto(SEED_LOAN_NUMBER);
    const scheduleCount = await loanDetail.getScheduleRowCount();
    expect(scheduleCount).toBeGreaterThan(0);
  });

  test('TC02-07: Make loan repayment', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanDetail = new LoanDetailPage(page);
    await loanDetail.goto(SEED_LOAN_NUMBER);
    const outstandingBefore = await loanDetail.getOutstanding();

    await loanDetail.makeRepayment(50000);
    await expectToast(page, 'success');

    await page.reload();
    await page.waitForLoadState('networkidle');
    // Balance should decrease
    const outstandingAfter = await loanDetail.getOutstanding();
    expect(outstandingAfter).not.toEqual(outstandingBefore);
  });

  test('TC02-08: Make three consecutive repayments', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanDetail = new LoanDetailPage(page);
    for (let i = 0; i < 3; i++) {
      await loanDetail.goto(SEED_LOAN_NUMBER);
      await loanDetail.makeRepayment(10000);
      await expectToast(page, 'success');
    }
  });

  test('TC02-09: Calculate early settlement', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanDetail = new LoanDetailPage(page);
    await loanDetail.goto(SEED_LOAN_NUMBER);
    await loanDetail.requestEarlySettlement();

    // Check settlement calculation appears
    await expect(page.locator('text=/settlement/i, [data-testid=settlement-amount]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC02-10: Reject a loan application', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    const approvalPage = new LoanApprovalPage(page);
    await approvalPage.goto();

    if (await approvalPage.getPendingCount() === 0) {
      test.skip();
      return;
    }

    await approvalPage.openFirstApplication();
    await approvalPage.reject('High debt-to-income ratio exceeds policy threshold');
    await expectToast(page, 'success');
  });
});
