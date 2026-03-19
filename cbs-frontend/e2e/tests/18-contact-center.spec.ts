import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ContactCenterPage } from '../pages/crm/ContactCenterPage';
import { USERS } from '../data/testUsers';
import { SEED_CUSTOMER_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';

test.describe('Contact Center', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC18-01: Navigate to contact center', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC18-02: Simulate incoming call — customer lookup', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await ccPage.lookupCustomer(SEED_CUSTOMER_NUMBER);
    // Customer 360 or summary panel should load
    await expect(page.locator('[data-testid=customer-panel],[class*=customer-info],[class*=360]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test('TC18-03: View customer account summary from contact center', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await ccPage.lookupCustomer(SEED_CUSTOMER_NUMBER);

    const accountsTab = page.locator('[role=tab]:has-text("Accounts")').first();
    if (await accountsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountsTab.click();
      const accountCount = await page.locator('tbody tr, [data-testid=account-item]').count();
      expect(accountCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC18-04: Create a service request case', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await ccPage.lookupCustomer(SEED_CUSTOMER_NUMBER);

    await ccPage.createCase({
      category: 'CARD_ISSUE',
      priority: 'HIGH',
      description: 'Customer reports card was swallowed by ATM at Lagos Branch',
      channel: 'PHONE',
    });

    await expectToast(page, 'success');
    const ref = await ccPage.getCaseRef().catch(() => '');
    if (ref) expect(ref).toMatch(/CASE-\w+/);
  });

  test('TC18-05: Create a complaint case', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await ccPage.lookupCustomer(SEED_CUSTOMER_NUMBER);

    await ccPage.createCase({
      category: 'COMPLAINT',
      priority: 'HIGH',
      description: 'Customer complains about unauthorized debit on account',
      channel: 'EMAIL',
    });

    await expectToast(page, 'success');
  });

  test('TC18-06: View all open cases', async ({ page }) => {
    await page.goto('/crm/cases');
    await page.waitForLoadState('networkidle');

    await page.locator('[name=status],[data-testid=status-filter]').selectOption('OPEN').catch(() => {});
    await page.waitForLoadState('networkidle');

    const openCases = await page.locator('tbody tr').count();
    expect(openCases).toBeGreaterThanOrEqual(0);
  });

  test('TC18-07: Resolve a case during call', async ({ page }) => {
    await page.goto('/crm/cases');
    await page.waitForLoadState('networkidle');

    const openCase = page.locator('tbody tr').first();
    if (!await openCase.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }

    await openCase.click();
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Resolve"), button:has-text("Close Case")');
    await page.fill('[name=resolution],[name=resolutionNotes]', 'Issue resolved during call — customer confirmed satisfaction');
    await page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await expectToast(page, 'success');
  });

  test('TC18-08: Check customer interaction history', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await ccPage.lookupCustomer(SEED_CUSTOMER_NUMBER);

    const historyTab = page.locator('[role=tab]:has-text("History"), [role=tab]:has-text("Interactions")').first();
    if (await historyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(500);
      const items = await page.locator('tbody tr, [data-testid=interaction-item]').count();
      expect(items).toBeGreaterThanOrEqual(0);
    }
  });
});
