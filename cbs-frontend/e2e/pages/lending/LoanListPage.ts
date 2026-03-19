import { Page, expect } from '@playwright/test';

export class LoanListPage {
  constructor(private page: Page) {}

  async goto(section: 'applications' | 'accounts' | 'dashboard' = 'accounts') {
    await this.page.goto(`/lending/${section}`);
    await this.page.waitForLoadState('networkidle');
  }

  async search(term: string) {
    await this.page.fill('[placeholder*=search i],[data-testid=search]', term);
    await this.page.waitForTimeout(600);
  }

  async filterByStatus(status: string) {
    const filter = this.page.locator('[name=status],[data-testid=status-filter]').first();
    await filter.selectOption(status).catch(async () => {
      await filter.click();
      await this.page.click(`[role=option]:has-text("${status}")`);
    });
    await this.page.waitForLoadState('networkidle');
  }

  async clickLoan(loanRef: string) {
    await this.page.click(`text=${loanRef}`);
    await this.page.waitForLoadState('networkidle');
  }

  async clickFirstLoan() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async getRowCount(): Promise<number> {
    return this.page.locator('tbody tr').count();
  }
}
