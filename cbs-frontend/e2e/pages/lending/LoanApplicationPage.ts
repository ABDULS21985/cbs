import { Page, expect } from '@playwright/test';

export class LoanApplicationPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/lending/apply');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCustomer(customerNumber: string) {
    await this.page.fill('[name=customerNumber],[name=customerId],[placeholder*=customer i]', customerNumber);
    await this.page.waitForTimeout(500);
    const option = this.page.locator('[role=option]').first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) await option.click();
  }

  async selectProduct(productCode: string) {
    const card = this.page.locator(`[data-product-code="${productCode}"]`).first();
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      await card.click();
    } else {
      await this.page.locator('[name=productCode]').selectOption(productCode);
    }
  }

  async fillLoanDetails(data: {
    requestedAmount: number;
    tenorMonths: number;
    purpose: string;
    repaymentMethod?: string;
    repaymentFrequency?: string;
  }) {
    await this.page.fill('[name=requestedAmount],[name=loanAmount]', data.requestedAmount.toString());
    await this.page.fill('[name=tenorMonths],[name=tenor]', data.tenorMonths.toString());
    await this.page.fill('[name=purpose]', data.purpose);
    if (data.repaymentMethod) {
      await this.page.locator('[name=repaymentMethod]').selectOption(data.repaymentMethod).catch(() => {});
    }
    if (data.repaymentFrequency) {
      await this.page.locator('[name=repaymentFrequency]').selectOption(data.repaymentFrequency).catch(() => {});
    }
  }

  async fillFinancials(data: { monthlyIncome: number; monthlyExpenses: number }) {
    await this.page.fill('[name=monthlyIncome]', data.monthlyIncome.toString());
    await this.page.fill('[name=monthlyExpenses]', data.monthlyExpenses.toString());
  }

  async clickNext() {
    await this.page.click('button:has-text("Next"), button:has-text("Continue")');
    await this.page.waitForTimeout(300);
  }

  async submitApplication() {
    await this.page.click('button:has-text("Submit Application"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async getApplicationRef(): Promise<string> {
    const ref = this.page.locator('[data-testid=application-ref], text=/LA-\\w+/, text=/APP-\\w+/').first();
    await ref.waitFor({ state: 'visible', timeout: 15_000 });
    return (await ref.textContent()) || '';
  }
}
