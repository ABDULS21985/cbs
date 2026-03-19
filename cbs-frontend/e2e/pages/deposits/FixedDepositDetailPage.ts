import { Page, expect } from '@playwright/test';

export class FixedDepositDetailPage {
  constructor(private page: Page) {}

  async goto(fdRef: string) {
    await this.page.goto(`/deposits/fixed/${fdRef}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatus(): Promise<string> {
    const status = this.page.locator('[data-testid=fd-status],[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }

  async getMaturityDate(): Promise<string> {
    const date = this.page.locator('[data-testid=maturity-date], text=/maturity/i').first();
    return (await date.textContent()) || '';
  }

  async earlyWithdrawal(reason?: string) {
    await this.page.click('button:has-text("Early Withdrawal"), button:has-text("Break FD")');
    if (reason) await this.page.fill('[name=withdrawalReason],[name=reason]', reason);
    // Review penalty
    const penaltyText = await this.page.locator('[data-testid=penalty],[text*=penalty i]').first().textContent().catch(() => '');
    await this.page.click('button:has-text("Confirm"), button:has-text("Proceed")');
    await this.page.waitForLoadState('networkidle');
    return penaltyText;
  }

  async rolloverFd(instruction: string) {
    await this.page.click('button:has-text("Rollover"), button:has-text("Renew")');
    await this.page.locator('[name=rolloverInstruction]').selectOption(instruction).catch(() => {});
    await this.page.click('button:has-text("Confirm"), button:has-text("Save")');
    await this.page.waitForLoadState('networkidle');
  }
}
