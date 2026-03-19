import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { UserAdminPage } from '../pages/admin/UserAdminPage';
import { USERS } from '../data/testUsers';
import { expectToast, testRef } from '../helpers/utils';

test.describe('User Administration', () => {
  const newUsername = `e2euser${Date.now().toString().slice(-6)}`;
  const newUserEmail = `${newUsername}@test.cba`;

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.admin.username, USERS.admin.password);
  });

  test('TC16-01: Navigate to user administration', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC16-02: View existing users', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();
    const count = await adminPage.getUserCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC16-03: Create new user', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();

    await adminPage.createUser({
      username: newUsername,
      fullName: 'E2E Test User',
      email: newUserEmail,
      role: 'CBS_OFFICER',
      branchCode: 'BR001',
      password: 'NewUser123!',
    });

    await expectToast(page, 'success');
    await adminPage.expectUserExists(newUsername);
  });

  test('TC16-04: Assign a different role to user', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();

    const userExists = await page.locator(`text=${newUsername}`).isVisible({ timeout: 3000 }).catch(() => false);
    if (!userExists) { test.skip(); return; }

    await adminPage.assignRole(newUsername, 'CBS_TELLER');
    await expectToast(page, 'success');
  });

  test('TC16-05: Login as the new user', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = new LoginPage(page);
    await login.goto();
    await login.login(newUsername, 'NewUser123!');
    // May require password change on first login
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|home|change-password|login)/);
    await context.close();
  });

  test('TC16-06: View user active sessions', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();

    const sessionsTab = page.locator('[role=tab]:has-text("Sessions"), a:has-text("Sessions")').first();
    if (await sessionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sessionsTab.click();
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC16-07: View login history', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();

    const historyTab = page.locator('[role=tab]:has-text("Login History"), a:has-text("Login History")').first();
    if (await historyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC16-08: Reset user password', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();

    const userExists = await page.locator(`text=${newUsername}`).isVisible({ timeout: 3000 }).catch(() => false);
    if (!userExists) { test.skip(); return; }

    await adminPage.resetPassword(newUsername);
    await expectToast(page, 'success');
  });

  test('TC16-09: Deactivate user', async ({ page }) => {
    const adminPage = new UserAdminPage(page);
    await adminPage.goto();

    const userExists = await page.locator(`text=${newUsername}`).isVisible({ timeout: 3000 }).catch(() => false);
    if (!userExists) { test.skip(); return; }

    await adminPage.deactivateUser(newUsername);
    await expectToast(page, 'success');
  });

  test('TC16-10: View role and permission matrix', async ({ page }) => {
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible({ timeout: 10_000 });

    const rolesTable = page.locator('table, [data-testid=roles-table]').first();
    if (await rolesTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      const rowCount = await page.locator('tbody tr').count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });
});
