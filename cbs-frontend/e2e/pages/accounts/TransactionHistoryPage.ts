import { Page, expect } from '@playwright/test';

export class TransactionHistoryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/transactions');
    await this.page.waitForLoadState('networkidle');
  }

  async search(params: { accountNumber?: string; dateFrom?: string; dateTo?: string; reference?: string }) {
    if (params.accountNumber) {
      await this.page.fill('[name=accountNumber],[name=account]', params.accountNumber);
    }
    if (params.dateFrom) await this.page.fill('[name=dateFrom],[name=fromDate]', params.dateFrom);
    if (params.dateTo) await this.page.fill('[name=dateTo],[name=toDate]', params.dateTo);
    if (params.reference) await this.page.fill('[name=reference],[name=txnRef]', params.reference);
    await this.page.click('button:has-text("Search"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async getResultCount(): Promise<number> {
    return this.page.locator('tbody tr').count();
  }

  async clickFirstResult() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForTimeout(500);
  }

  async getTransactionRef(rowIndex = 0): Promise<string> {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    const refCell = row.locator('td').first();
    return (await refCell.textContent()) || '';
  }

  async downloadReceipt() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click('button:has-text("Download"), button:has-text("Receipt")'),
    ]);
    return download;
  }

  async exportCSV() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click('button:has-text("Export"), button:has-text("CSV")'),
    ]);
    return download;
  }
}
