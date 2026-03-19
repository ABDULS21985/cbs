import { Page, expect } from '@playwright/test';

export class Customer360Page {
  constructor(private page: Page) {}

  async goto(customerNumber: string) {
    await this.page.goto(`/customers/${customerNumber}`);
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded(customerName: string) {
    await expect(this.page.locator('h1, [data-testid=customer-name]').first()).toContainText(customerName, { timeout: 15_000 });
  }

  async clickTab(tabName: string) {
    await this.page.click(`[role=tab]:has-text("${tabName}"), button:has-text("${tabName}")`);
    await this.page.waitForTimeout(300);
  }

  async getAccountCount(): Promise<number> {
    await this.clickTab('Accounts');
    return this.page.locator('tbody tr, [data-testid=account-row]').count();
  }

  async getLoanCount(): Promise<number> {
    await this.clickTab('Loans');
    return this.page.locator('tbody tr, [data-testid=loan-row]').count();
  }

  async clickOpenAccount() {
    await this.page.click('button:has-text("Open Account"), text=Open Account');
    await this.page.waitForLoadState('networkidle');
  }

  async getCustomerStatus(): Promise<string> {
    const badge = this.page.locator('[data-testid=customer-status], [class*=status-badge]').first();
    return (await badge.textContent()) || '';
  }

  async editCustomer() {
    await this.page.click('button:has-text("Edit"), [data-testid=edit-customer]');
    await this.page.waitForLoadState('networkidle');
  }
}
