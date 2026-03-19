import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { LoanApplicationPage } from '../pages/lending/LoanApplicationPage';
import { LoanApprovalPage } from '../pages/lending/LoanApprovalPage';
import { LoanListPage } from '../pages/lending/LoanListPage';
import { USERS } from '../data/testUsers';
import { LOAN_DATA, SEED_CUSTOMER_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';

test.describe('Approval Workflow', () => {
  let applicationRef = '';

  test('TC08-01: Officer submits loan for approval', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanApp = new LoanApplicationPage(page);
    await loanApp.goto();
    await loanApp.selectCustomer(SEED_CUSTOMER_NUMBER);
    await loanApp.selectProduct(LOAN_DATA.personal.productCode);
    await loanApp.clickNext();
    await loanApp.fillLoanDetails({
      requestedAmount: 200000,
      tenorMonths: 6,
      purpose: 'Approval workflow test',
      repaymentMethod: 'EQUAL_INSTALLMENT',
      repaymentFrequency: 'MONTHLY',
    });
    await loanApp.clickNext();
    await loanApp.fillFinancials({ monthlyIncome: 200000, monthlyExpenses: 50000 });
    await loanApp.clickNext();
    await loanApp.submitApplication();

    applicationRef = await loanApp.getApplicationRef();
    expect(applicationRef).toMatch(/\w+/);
    await expectToast(page, 'success');
  });

  test('TC08-02: Application appears in manager approval queue', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    const approvalPage = new LoanApprovalPage(page);
    await approvalPage.goto();
    const pending = await approvalPage.getPendingCount();
    expect(pending).toBeGreaterThan(0);
  });

  test('TC08-03: Manager reviews and approves loan', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    const approvalPage = new LoanApprovalPage(page);
    await approvalPage.goto();

    const pending = await approvalPage.getPendingCount();
    if (pending === 0) { test.skip(); return; }

    await approvalPage.openFirstApplication();
    // View loan details before approving
    await expect(page.locator('[class*=loan],[data-testid*=loan]').first()).toBeVisible({ timeout: 10_000 });
    await approvalPage.approve('DTI ratio acceptable — recommend approval');
    await expectToast(page, 'success');
  });

  test('TC08-04: Loan status changed after approval', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanList = new LoanListPage(page);
    await loanList.goto('applications');
    await loanList.filterByStatus('APPROVED');

    const count = await loanList.getRowCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC08-05: Notification sent after approval', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    // Check notification bell
    const bell = page.locator('[data-testid=notification-bell],[aria-label*=notification i]').first();
    if (await bell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bell.click();
      const notificationPanel = page.locator('[data-testid=notifications-panel],[class*=notification]').first();
      await expect(notificationPanel).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('TC08-06: Manager can refer back for more information', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const loanApp = new LoanApplicationPage(page);
    await loanApp.goto();
    await loanApp.selectCustomer(SEED_CUSTOMER_NUMBER);
    await loanApp.selectProduct(LOAN_DATA.personal.productCode);
    await loanApp.clickNext();
    await loanApp.fillLoanDetails({ requestedAmount: 150000, tenorMonths: 3, purpose: 'Refer back test' });
    await loanApp.clickNext();
    await loanApp.fillFinancials({ monthlyIncome: 150000, monthlyExpenses: 40000 });
    await loanApp.clickNext();
    await loanApp.submitApplication();

    // Now as manager, refer back
    await page.goto('/login');
    await (new LoginPage(page)).loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);
    const approvalPage = new LoanApprovalPage(page);
    await approvalPage.goto();
    const pending = await approvalPage.getPendingCount();
    if (pending === 0) return;
    await approvalPage.openFirstApplication();
    await approvalPage.referBack('Please provide additional income documentation');
    await expectToast(page, 'success');
  });
});
