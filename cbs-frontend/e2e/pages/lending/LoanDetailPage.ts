import { Page, expect } from '@playwright/test';

export class LoanDetailPage {
  constructor(private page: Page) {}

  async goto(loanNumber: string) {
    await this.page.goto(`/lending/accounts/${loanNumber}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatus(): Promise<string> {
    const status = this.page.locator('[data-testid=loan-status],[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }

  async getOutstanding(): Promise<string> {
    const outstanding = this.page.locator('[data-testid=outstanding],[class*=outstanding]').first();
    return (await outstanding.textContent()) || '';
  }

  async clickTab(tabName: string) {
    await this.page.click(`[role=tab]:has-text("${tabName}")`);
    await this.page.waitForTimeout(300);
  }

  async makeRepayment(amount: number) {
    await this.page.click('button:has-text("Make Payment"), button:has-text("Repay")');
    await this.page.fill('[name=amount],[name=paymentAmount]', amount.toString());
    await this.page.click('button:has-text("Submit"), button:has-text("Confirm")');
    await this.page.waitForLoadState('networkidle');
  }

  async requestEarlySettlement() {
    await this.page.click('button:has-text("Early Settlement"), button:has-text("Settle")');
    await this.page.waitForTimeout(500);
    await this.page.click('button:has-text("Confirm"), button:has-text("Calculate")');
    await this.page.waitForLoadState('networkidle');
  }

  async getScheduleRowCount(): Promise<number> {
    await this.clickTab('Schedule');
    return this.page.locator('tbody tr').count();
  }
}
