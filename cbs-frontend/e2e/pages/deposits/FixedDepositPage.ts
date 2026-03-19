import { Page, expect } from '@playwright/test';

export class FixedDepositPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/deposits/fixed');
    await this.page.waitForLoadState('networkidle');
  }

  async createFixedDeposit(data: {
    accountNumber: string;
    amount: number;
    tenorDays: number;
    rolloverInstruction?: string;
  }) {
    await this.page.click('button:has-text("New Fixed Deposit"), button:has-text("Create FD"), button:has-text("Place FD")');
    await this.page.fill('[name=accountNumber],[name=sourceAccount]', data.accountNumber);
    await this.page.fill('[name=amount],[name=principalAmount]', data.amount.toString());
    await this.page.fill('[name=tenorDays],[name=tenor]', data.tenorDays.toString());
    if (data.rolloverInstruction) {
      await this.page.locator('[name=rolloverInstruction],[name=rollover]').selectOption(data.rolloverInstruction).catch(() => {});
    }
    await this.page.click('button:has-text("Submit"), button:has-text("Create"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async getFdCount(): Promise<number> {
    return this.page.locator('tbody tr, [data-testid=fd-row]').count();
  }

  async clickFirstFd() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickFd(fdRef: string) {
    await this.page.click(`text=${fdRef}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getFdRef(): Promise<string> {
    const ref = this.page.locator('[data-testid=fd-ref], text=/FD-\\w+/').first();
    await ref.waitFor({ state: 'visible', timeout: 15_000 });
    return (await ref.textContent()) || '';
  }
}
