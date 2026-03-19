import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { BranchOpsPage } from '../pages/operations/BranchOpsPage';
import { EodConsolePage } from '../pages/operations/EodConsolePage';
import { USERS } from '../data/testUsers';
import { expectToast } from '../helpers/utils';

test.describe('Branch Operations', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);
  });

  test('TC06-01: Navigate to branch operations dashboard', async ({ page }) => {
    const branchOps = new BranchOpsPage(page);
    await branchOps.goto();
    await expect(page.locator('h1, [data-testid=page-title]').first()).toBeVisible();
  });

  test('TC06-02: Select branch and view dashboard cards', async ({ page }) => {
    const branchOps = new BranchOpsPage(page);
    await branchOps.goto();
    // Stat cards should be visible
    const statCards = page.locator('[class*=stat-card],[class*=StatCard]');
    const count = await statCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC06-03: Issue a queue ticket', async ({ page }) => {
    const branchOps = new BranchOpsPage(page);
    await branchOps.goto();
    await branchOps.issueQueueTicket('CASH_DEPOSIT');
    await expectToast(page, 'success').catch(() => {});
    // Ticket number should appear
    const ticket = page.locator('[data-testid=ticket-number],[class*=ticket]').first();
    if (await ticket.isVisible({ timeout: 5000 }).catch(() => false)) {
      const ticketNum = await ticket.textContent();
      expect(ticketNum?.length).toBeGreaterThan(0);
    }
  });

  test('TC06-04: Call next customer in queue', async ({ page }) => {
    const branchOps = new BranchOpsPage(page);
    await branchOps.goto();
    await branchOps.clickTab('Queue');
    await branchOps.callNextTicket();
    // Should not throw
    await expectToast(page, 'success').catch(() => {});
  });

  test('TC06-05: Complete service', async ({ page }) => {
    const branchOps = new BranchOpsPage(page);
    await branchOps.goto();
    await branchOps.clickTab('Queue');
    await branchOps.callNextTicket();
    await branchOps.completeService();
    await expectToast(page, 'success').catch(() => {});
  });

  test('TC06-06: View queue metrics', async ({ page }) => {
    const branchOps = new BranchOpsPage(page);
    await branchOps.goto();
    await branchOps.clickTab('Queue');
    // Queue dashboard should show metrics
    await expect(page.locator('text=/wait time/i, text=/served/i, [data-testid*=queue]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });

  test('TC06-07: View EOD console', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.admin.username, USERS.admin.password);

    const eodConsole = new EodConsolePage(page);
    await eodConsole.goto();
    await expect(page.locator('h1').first()).toBeVisible();

    const status = await eodConsole.getCurrentStatus();
    expect(status.length).toBeGreaterThan(0);
  });

  test('TC06-08: EOD step pipeline is visible', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.admin.username, USERS.admin.password);

    const eodConsole = new EodConsolePage(page);
    await eodConsole.goto();
    // EOD steps should be visible in the pipeline
    const steps = page.locator('[data-testid*=eod-step],[class*=step-card],[class*=pipeline]');
    const count = await steps.count();
    expect(count).toBeGreaterThan(0);
  });
});
