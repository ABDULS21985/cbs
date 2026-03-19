import { Page, expect } from '@playwright/test';

export class CardListPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/cards');
    await this.page.waitForLoadState('networkidle');
  }

  async requestCard(data: { accountNumber: string; cardType?: string; deliveryOption?: string }) {
    await this.page.click('button:has-text("Request Card"), button:has-text("New Card")');
    await this.page.fill('[name=accountNumber],[name=account]', data.accountNumber);
    if (data.cardType) {
      await this.page.locator('[name=cardType]').selectOption(data.cardType).catch(() => {});
    }
    if (data.deliveryOption) {
      await this.page.locator('[name=deliveryOption],[name=delivery]').selectOption(data.deliveryOption).catch(() => {});
    }
    await this.page.click('button:has-text("Submit"), button:has-text("Request")');
    await this.page.waitForLoadState('networkidle');
  }

  async getCardCount(): Promise<number> {
    return this.page.locator('tbody tr, [data-testid=card-row]').count();
  }

  async clickCard(maskedPan: string) {
    await this.page.click(`text=${maskedPan}`);
    await this.page.waitForLoadState('networkidle');
  }

  async clickFirstCard() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForLoadState('networkidle');
  }
}
