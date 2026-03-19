import { Page, expect } from '@playwright/test';

export class ProductFactoryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/products');
    await this.page.waitForLoadState('networkidle');
  }

  async createProduct(data: {
    code: string;
    name: string;
    type: string;
    currency?: string;
    minAmount?: number;
    maxAmount?: number;
    interestRate?: number;
  }) {
    await this.page.click('button:has-text("New Product"), button:has-text("Create Product")');
    await this.page.fill('[name=productCode],[name=code]', data.code);
    await this.page.fill('[name=productName],[name=name]', data.name);
    await this.page.locator('[name=productType],[name=type]').selectOption(data.type).catch(() => {});
    if (data.currency) await this.page.locator('[name=currency]').selectOption(data.currency).catch(() => {});
    if (data.minAmount) await this.page.fill('[name=minAmount]', data.minAmount.toString());
    if (data.maxAmount) await this.page.fill('[name=maxAmount]', data.maxAmount.toString());
    if (data.interestRate) await this.page.fill('[name=interestRate],[name=rate]', data.interestRate.toString());
    await this.page.click('button:has-text("Save"), button:has-text("Create"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async publishProduct(productCode: string) {
    const row = this.page.locator(`tr:has-text("${productCode}")`).first();
    await row.locator('button:has-text("Publish"), button:has-text("Activate")').click();
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes, Publish")');
    await this.page.waitForLoadState('networkidle');
  }

  async getProductStatus(productCode: string): Promise<string> {
    const row = this.page.locator(`tr:has-text("${productCode}")`).first();
    const status = row.locator('[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }

  async expectProductExists(productCode: string) {
    await expect(this.page.locator(`text=${productCode}`).first()).toBeVisible();
  }
}
