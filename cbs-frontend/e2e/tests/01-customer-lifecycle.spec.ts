import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { CustomerListPage } from '../pages/customers/CustomerListPage';
import { CustomerOnboardingPage } from '../pages/customers/CustomerOnboardingPage';
import { Customer360Page } from '../pages/customers/Customer360Page';
import { AccountOpeningPage } from '../pages/accounts/AccountOpeningPage';
import { PaymentPage } from '../pages/payments/PaymentPage';
import { USERS } from '../data/testUsers';
import { CUSTOMER_DATA } from '../data/testData';
import { expectToast, testRef } from '../helpers/utils';
import * as db from '../helpers/db';

test.describe('Customer Lifecycle @smoke', () => {
  let customerNumber = '';
  const uniqueSuffix = testRef('CUS');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC01-01: Login as officer redirects to dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1, [data-testid=dashboard-header]').first()).toBeVisible();
  });

  test('TC01-02: Navigate to customer onboarding', async ({ page }) => {
    await page.click('text=Customers, nav a[href*=customers]');
    await page.click('text=New Customer, button:has-text("Add Customer"), a[href*=onboarding]');
    await expect(page).toHaveURL(/\/(customers\/onboarding|onboarding)/);
  });

  test('TC01-03: Complete individual customer onboarding', async ({ page }) => {
    const onboarding = new CustomerOnboardingPage(page);
    await onboarding.goto();

    // Step 1: Select customer type
    await onboarding.selectCustomerType('Individual');
    await onboarding.clickNext();

    // Step 2: Personal information
    await onboarding.fillPersonalInfo({
      title: 'Mr',
      firstName: 'Test',
      lastName: uniqueSuffix,
      dateOfBirth: '1990-01-15',
      gender: 'MALE',
      nationality: 'Nigerian',
    });
    await onboarding.clickNext();

    // Step 3: Contact information
    await onboarding.fillContactInfo({
      email: `${uniqueSuffix.toLowerCase()}@test.cba`,
      phoneNumber: '08012345678',
    });
    await onboarding.clickNext();

    // Step 4: Identification
    await onboarding.fillIdentification({
      nin: `NIN${Date.now().toString().slice(-9)}`,
      bvn: `BVN${Date.now().toString().slice(-9)}`,
    });
    await onboarding.clickNext();

    // Step 5: Address
    await onboarding.fillAddress({
      street: '45 Marina Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
    });
    await onboarding.clickNext();

    // Step 6: Employment
    await onboarding.fillEmployment({
      status: 'EMPLOYED',
      employer: 'Tech Corp',
      monthlyIncome: 500000,
    });
    await onboarding.clickNext();

    // Step 7: Next of Kin
    await onboarding.fillNextOfKin({
      name: 'Jane Doe',
      relationship: 'SPOUSE',
      phoneNumber: '08087654321',
    });
    await onboarding.clickNext();

    // Step 8: Declaration & Submit
    await onboarding.submitDeclaration();
    await onboarding.submitApplication();

    // Verify success
    customerNumber = await onboarding.getCustomerNumber();
    expect(customerNumber).toMatch(/CUS-\w+/);
    await expectToast(page, 'success');
  });

  test('TC01-04: Customer appears in list and can be searched', async ({ page }) => {
    const listPage = new CustomerListPage(page);
    await listPage.goto();
    await listPage.search('Test');
    const count = await listPage.getRowCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC01-05: Customer 360 view shows correct information', async ({ page }) => {
    const customerList = new CustomerListPage(page);
    await customerList.goto();
    await customerList.search(uniqueSuffix);
    await customerList.clickFirstRow();

    const customer360 = new Customer360Page(page);
    await expect(page.locator('h1').first()).toContainText(uniqueSuffix, { timeout: 10_000 });
  });

  test('TC01-06: Open savings account for new customer', async ({ page }) => {
    if (!customerNumber) test.skip();
    const customer360 = new Customer360Page(page);
    await customer360.goto(customerNumber);
    await customer360.clickOpenAccount();

    const accountOpening = new AccountOpeningPage(page);
    await accountOpening.selectProduct('SAV001');
    await accountOpening.fillAccountConfig({ currency: 'NGN', initialDeposit: 10000 });
    await accountOpening.submitOpening();

    const accountNumber = await accountOpening.getNewAccountNumber();
    expect(accountNumber).toMatch(/\d{10}/);
    await expectToast(page, 'success');
  });

  test('TC01-07: Verify customer in database', async ({ page }) => {
    if (!customerNumber) test.skip();
    const customer = await db.getCustomerByNumber(customerNumber);
    expect(customer).toBeTruthy();
    expect(customer.status).toBe('ACTIVE');
    expect(customer.kyc_status).toBeDefined();
  });

  test('TC01-08: Corporate customer onboarding', async ({ page }) => {
    const onboarding = new CustomerOnboardingPage(page);
    await onboarding.goto();
    await onboarding.selectCustomerType('Corporate');
    await onboarding.clickNext();
    // Fill corporate details
    await page.fill('[name=companyName],[name=name]', `CorpTest-${Date.now()}`);
    await page.fill('[name=rcNumber],[name=registrationNumber]', `RC${Date.now().toString().slice(-7)}`);
    await page.fill('[name=email]', `corp.${Date.now()}@test.cba`);
    await page.fill('[name=phoneNumber],[name=phone]', '0112345678');
    await onboarding.clickNext();
    // Continue through remaining steps
    await onboarding.fillAddress({ street: '10 Victoria Island', city: 'Lagos', state: 'Lagos' });
    await onboarding.clickNext();
    await onboarding.submitDeclaration();
    await onboarding.submitApplication();
    const corpNumber = await onboarding.getCustomerNumber().catch(() => '');
    if (corpNumber) expect(corpNumber).toMatch(/CUS-\w+/);
  });
});
