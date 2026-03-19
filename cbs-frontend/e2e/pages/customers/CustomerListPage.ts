import { Page, expect } from '@playwright/test';

export class CustomerListPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/customers');
    await this.page.waitForLoadState('networkidle');
  }

  async search(term: string) {
    const input = this.page.locator('[placeholder*=search i],[data-testid=search-input],[name=search]').first();
    await input.fill(term);
    await this.page.waitForTimeout(600); // debounce
    await this.page.waitForLoadState('networkidle');
  }

  async clickFirstRow() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickNewCustomer() {
    await this.page.click('text=New Customer, text=Add Customer, button:has-text("Customer")');
    await this.page.waitForLoadState('networkidle');
  }

  async getRowCount(): Promise<number> {
    return this.page.locator('tbody tr').count();
  }

  async getCustomerNumber(rowIndex = 0): Promise<string> {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    const firstCell = row.locator('td').first();
    return (await firstCell.textContent()) || '';
  }

  async filterByStatus(status: string) {
    const statusFilter = this.page.locator('[data-testid=status-filter], select[name=status]').first();
    await statusFilter.selectOption(status);
    await this.page.waitForLoadState('networkidle');
  }

  async expectCustomerInList(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible();
  }
}
