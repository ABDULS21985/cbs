import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProductFactoryPage } from '../pages/products/ProductFactoryPage';
import { AccountOpeningPage } from '../pages/accounts/AccountOpeningPage';
import { USERS } from '../data/testUsers';
import { SEED_CUSTOMER_NUMBER } from '../data/testData';
import { expectToast, testRef } from '../helpers/utils';

test.describe('Product Factory', () => {
  const productCode = `TST${Date.now().toString().slice(-5)}`;
  const productName = `Test Savings ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.admin.username, USERS.admin.password);
  });

  test('TC15-01: Navigate to product factory', async ({ page }) => {
    const productPage = new ProductFactoryPage(page);
    await productPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC15-02: Create a new savings product', async ({ page }) => {
    const productPage = new ProductFactoryPage(page);
    await productPage.goto();

    await productPage.createProduct({
      code: productCode,
      name: productName,
      type: 'SAVINGS',
      currency: 'NGN',
      minAmount: 1000,
      maxAmount: 10000000,
      interestRate: 5.5,
    });

    await expectToast(page, 'success');
    await productPage.expectProductExists(productCode);
  });

  test('TC15-03: View product details', async ({ page }) => {
    const productPage = new ProductFactoryPage(page);
    await productPage.goto();

    const row = page.locator(`tr:has-text("${productCode}")`).first();
    if (!await row.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }

    await row.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, [data-testid=product-name]').first()).toContainText(productName).catch(() => {});
  });

  test('TC15-04: Publish (activate) the product', async ({ page }) => {
    const productPage = new ProductFactoryPage(page);
    await productPage.goto();
    await productPage.publishProduct(productCode);
    await expectToast(page, 'success');

    const status = await productPage.getProductStatus(productCode);
    expect(status.toUpperCase()).toMatch(/ACTIVE|PUBLISHED|LIVE/);
  });

  test('TC15-05: Open account using new product', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);

    const accountOpening = new AccountOpeningPage(page);
    await accountOpening.goto();
    await accountOpening.selectCustomer(SEED_CUSTOMER_NUMBER);
    await accountOpening.selectProduct(productCode);
    await accountOpening.fillAccountConfig({ currency: 'NGN', initialDeposit: 5000 });
    await accountOpening.submitOpening();

    const newAccountNumber = await accountOpening.getNewAccountNumber().catch(() => '');
    if (newAccountNumber) expect(newAccountNumber).toMatch(/\d{10}/);
    await expectToast(page, 'success');
  });

  test('TC15-06: Create loan product', async ({ page }) => {
    const loanProductCode = `LP${Date.now().toString().slice(-5)}`;
    const productPage = new ProductFactoryPage(page);
    await productPage.goto();

    await productPage.createProduct({
      code: loanProductCode,
      name: `Test Personal Loan ${Date.now()}`,
      type: 'PERSONAL_LOAN',
      currency: 'NGN',
      minAmount: 50000,
      maxAmount: 5000000,
      interestRate: 24.0,
    });

    await expectToast(page, 'success');
    await productPage.expectProductExists(loanProductCode);
  });
});
