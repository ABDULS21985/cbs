import { Page, expect } from '@playwright/test';

export class AccountOpeningPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/accounts/open');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCustomer(customerNumberOrName: string) {
    const searchInput = this.page.locator('[placeholder*=customer i],[name=customerSearch],[name=customerId]').first();
    await searchInput.fill(customerNumberOrName);
    await this.page.waitForTimeout(600);
    const suggestion = this.page.locator('[role=option],[data-testid=customer-suggestion]').first();
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
    }
  }

  async selectProduct(productCode: string) {
    const productCard = this.page.locator(`[data-product-code="${productCode}"], text=${productCode}`).first();
    if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productCard.click();
    } else {
      await this.page.locator('[name=productCode]').selectOption(productCode);
    }
  }

  async fillAccountConfig(data: { currency?: string; initialDeposit?: number; branch?: string }) {
    if (data.currency) {
      await this.page.locator('[name=currency]').selectOption(data.currency).catch(() => {});
    }
    if (data.initialDeposit) {
      await this.page.fill('[name=initialDeposit],[name=openingBalance]', data.initialDeposit.toString());
    }
    if (data.branch) {
      await this.page.locator('[name=branchCode],[name=branch]').selectOption(data.branch).catch(() => {});
    }
  }

  async submitOpening() {
    await this.page.click('button:has-text("Open Account"), button:has-text("Submit"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async getNewAccountNumber(): Promise<string> {
    const accountNum = this.page.locator('[data-testid=account-number], text=/\\d{10}/', { hasText: /\d{10}/ }).first();
    await accountNum.waitFor({ state: 'visible', timeout: 15_000 });
    return (await accountNum.textContent()) || '';
  }
}
