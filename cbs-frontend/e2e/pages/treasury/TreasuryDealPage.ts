import { Page, expect } from '@playwright/test';

export class TreasuryDealPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/treasury/deals');
    await this.page.waitForLoadState('networkidle');
  }

  async enterFxSpotDeal(data: {
    buyCurrency: string;
    sellCurrency: string;
    buyAmount: number;
    rate?: number;
    counterparty: string;
    valueDate?: string;
  }) {
    await this.page.click('button:has-text("New Deal"), button:has-text("Enter Deal")');
    await this.page.locator('[name=dealType],[name=type]').selectOption('FX_SPOT').catch(() => {});
    await this.page.locator('[name=buyCurrency]').selectOption(data.buyCurrency).catch(() => {});
    await this.page.locator('[name=sellCurrency]').selectOption(data.sellCurrency).catch(() => {});
    await this.page.fill('[name=buyAmount],[name=amount]', data.buyAmount.toString());
    if (data.rate) await this.page.fill('[name=rate],[name=exchangeRate]', data.rate.toString());
    await this.page.fill('[name=counterparty]', data.counterparty);
    if (data.valueDate) await this.page.fill('[name=valueDate]', data.valueDate);
  }

  async validateDeal() {
    await this.page.click('button:has-text("Validate"), button:has-text("Check")');
    await this.page.waitForTimeout(1000);
    const errors = await this.page.locator('[class*=validation-error],[class*=error]').count();
    return errors === 0;
  }

  async submitDeal() {
    await this.page.click('button:has-text("Submit Deal"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async getDealRef(): Promise<string> {
    const ref = this.page.locator('[data-testid=deal-ref], text=/DEAL-\\w+/, text=/FX-\\w+/').first();
    await ref.waitFor({ state: 'visible', timeout: 15_000 });
    return (await ref.textContent()) || '';
  }

  async approveDeal(dealRef: string) {
    await this.page.goto('/treasury/approvals');
    await this.page.waitForLoadState('networkidle');
    await this.page.click(`text=${dealRef}`);
    await this.page.click('button:has-text("Approve"), [data-testid=approve]');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async checkPositions(currency: string): Promise<string> {
    await this.page.goto('/treasury/positions');
    await this.page.waitForLoadState('networkidle');
    const row = this.page.locator(`tr:has-text("${currency}")`).first();
    const amount = row.locator('td').nth(2);
    return (await amount.textContent()) || '';
  }
}
