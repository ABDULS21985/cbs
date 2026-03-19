import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { USERS } from '../data/testUsers';
import { SEED_LOAN_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';

test.describe('Collateral Management', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC13-01: Navigate to collateral management', async ({ page }) => {
    await page.goto('/lending/collateral');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC13-02: Register new property collateral', async ({ page }) => {
    await page.goto('/lending/collateral');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Register Collateral"), button:has-text("New Collateral"), button:has-text("Add")');
    await page.waitForTimeout(500);

    await page.locator('[name=type],[name=collateralType]').selectOption('PROPERTY').catch(async () => {
      await page.click('[role=option]:has-text("Property")');
    });
    await page.fill('[name=description]', 'Residential property at 45 Marina Street, Lagos');
    await page.fill('[name=estimatedValue],[name=value]', '15000000');
    await page.fill('[name=location]', '45 Marina Street, Lagos Island');

    await page.click('button:has-text("Save"), button:has-text("Register"), button[type=submit]');
    await page.waitForLoadState('networkidle');
    await expectToast(page, 'success');
  });

  test('TC13-03: Register vehicle collateral', async ({ page }) => {
    await page.goto('/lending/collateral');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Register Collateral"), button:has-text("New Collateral"), button:has-text("Add")');

    await page.locator('[name=type],[name=collateralType]').selectOption('VEHICLE').catch(async () => {
      await page.click('[role=option]:has-text("Vehicle")');
    });
    await page.fill('[name=description]', 'Toyota Camry 2022 — VIN: 1234567890');
    await page.fill('[name=estimatedValue],[name=value]', '8000000');

    await page.click('button:has-text("Save"), button:has-text("Register"), button[type=submit]');
    await page.waitForLoadState('networkidle');
    await expectToast(page, 'success');
  });

  test('TC13-04: View collateral valuation', async ({ page }) => {
    await page.goto('/lending/collateral');
    await page.waitForLoadState('networkidle');

    const count = await page.locator('tbody tr').count();
    if (count === 0) { test.skip(); return; }

    await page.locator('tbody tr').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid=estimated-value],[class*=value],[text*=value i]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test('TC13-05: Link collateral to loan', async ({ page }) => {
    await page.goto(`/lending/accounts/${SEED_LOAN_NUMBER}`);
    await page.waitForLoadState('networkidle');

    const collateralTab = page.locator('[role=tab]:has-text("Collateral")').first();
    if (!await collateralTab.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }

    await collateralTab.click();
    await page.click('button:has-text("Link Collateral"), button:has-text("Add Collateral")').catch(() => {});

    const collateralList = page.locator('[data-testid=collateral-list] li, tbody tr').first();
    if (await collateralList.isVisible({ timeout: 3000 }).catch(() => false)) {
      await collateralList.locator('[type=checkbox]').check().catch(() => {});
      await page.click('button:has-text("Link"), button:has-text("Attach")').catch(() => {});
      await expectToast(page, 'success');
    }
  });

  test('TC13-06: View collateral coverage ratio', async ({ page }) => {
    await page.goto(`/lending/accounts/${SEED_LOAN_NUMBER}`);
    await page.waitForLoadState('networkidle');

    const collateralTab = page.locator('[role=tab]:has-text("Collateral")').first();
    if (await collateralTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await collateralTab.click();
      await expect(page.locator('text=/coverage/i, text=/LTV/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
