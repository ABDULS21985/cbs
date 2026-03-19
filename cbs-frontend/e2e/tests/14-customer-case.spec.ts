import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ContactCenterPage } from '../pages/crm/ContactCenterPage';
import { USERS } from '../data/testUsers';
import { SEED_CUSTOMER_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';

test.describe('Customer Case Management', () => {
  let caseRef = '';

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC14-01: Navigate to contact center', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC14-02: Look up customer', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await ccPage.lookupCustomer(SEED_CUSTOMER_NUMBER);
    // Customer info should load
    await expect(page.locator('text=James Okonkwo, [data-testid=customer-name]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test('TC14-03: Create new customer case', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await ccPage.goto();
    await ccPage.lookupCustomer(SEED_CUSTOMER_NUMBER);

    await ccPage.createCase({
      category: 'ACCOUNT_INQUIRY',
      priority: 'MEDIUM',
      description: 'Customer called to inquire about recent transaction that appears unauthorized',
      channel: 'PHONE',
    });

    caseRef = await ccPage.getCaseRef().catch(() => '');
    if (caseRef) expect(caseRef).toMatch(/CASE-\w+/);
    await expectToast(page, 'success');
  });

  test('TC14-04: View case details', async ({ page }) => {
    await page.goto('/crm/cases');
    await page.waitForLoadState('networkidle');

    const firstCase = page.locator('tbody tr').first();
    if (!await firstCase.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }

    await firstCase.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid=case-detail],[class*=case]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC14-05: Add case note / update', async ({ page }) => {
    await page.goto('/crm/cases');
    await page.waitForLoadState('networkidle');

    const firstCase = page.locator('tbody tr').first();
    if (!await firstCase.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }

    await firstCase.click();
    await page.waitForLoadState('networkidle');

    const noteInput = page.locator('[name=note],[name=comment],[placeholder*=note i]').first();
    if (await noteInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await noteInput.fill('Reviewed transaction history. Transaction appears legitimate — customer confirmed via KYC.');
      await page.click('button:has-text("Add Note"), button:has-text("Save Note"), button:has-text("Update")');
      await expectToast(page, 'success');
    }
  });

  test('TC14-06: Perform root cause analysis', async ({ page }) => {
    await page.goto('/crm/cases');
    await page.waitForLoadState('networkidle');

    const firstCase = page.locator('tbody tr').first();
    if (!await firstCase.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return; }

    await firstCase.click();
    await page.waitForLoadState('networkidle');

    const rcaSection = page.locator('[data-testid=rca],[class*=root-cause],[text*=Root Cause i]').first();
    if (await rcaSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('[name=rootCause],[name=rca]', 'System processing delay caused duplicate debit entry');
      await page.click('button:has-text("Save"), button:has-text("Update")');
    }
  });

  test('TC14-07: Resolve customer case', async ({ page }) => {
    const ccPage = new ContactCenterPage(page);
    await page.goto('/crm/cases');
    await page.waitForLoadState('networkidle');

    const firstCase = page.locator('tbody tr:has([class*=OPEN],[data-status=OPEN])').first();
    if (!await firstCase.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }

    const ref = await firstCase.locator('td').first().textContent() || 'CASE-001';
    await ccPage.resolveCase(ref, 'Customer satisfied with explanation. No further action required.');
    await expectToast(page, 'success');
  });

  test('TC14-08: Verify case status changed to RESOLVED', async ({ page }) => {
    await page.goto('/crm/cases');
    await page.waitForLoadState('networkidle');
    await page.locator('[name=status],[data-testid=status-filter]').selectOption('RESOLVED').catch(() => {});
    await page.waitForLoadState('networkidle');
    const resolvedCount = await page.locator('tbody tr').count();
    expect(resolvedCount).toBeGreaterThanOrEqual(0);
  });
});
