import { Page, expect } from '@playwright/test';

export class AccountDetailPage {
  constructor(private page: Page) {}

  async goto(accountNumber: string) {
    await this.page.goto(`/accounts/${accountNumber}`);
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.page.locator('h1, [data-testid=account-header]').first()).toBeVisible({ timeout: 15_000 });
  }

  async getBalance(): Promise<string> {
    const balance = this.page.locator('[data-testid=account-balance],[class*=balance]').first();
    return (await balance.textContent()) || '';
  }

  async getAccountStatus(): Promise<string> {
    const status = this.page.locator('[data-testid=account-status],[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }

  async clickTab(tabName: string) {
    await this.page.click(`[role=tab]:has-text("${tabName}")`);
    await this.page.waitForTimeout(300);
  }

  async getTransactionCount(): Promise<number> {
    await this.clickTab('Transactions');
    return this.page.locator('tbody tr').count();
  }

  async freezeAccount() {
    await this.page.click('button:has-text("Freeze"), button:has-text("Block")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async unfreezeAccount() {
    await this.page.click('button:has-text("Unfreeze"), button:has-text("Unblock")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }
}
