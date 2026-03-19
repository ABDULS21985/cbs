import { Page, expect } from '@playwright/test';

export class CardDetailPage {
  constructor(private page: Page) {}

  async goto(cardId: string) {
    await this.page.goto(`/cards/${cardId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatus(): Promise<string> {
    const status = this.page.locator('[data-testid=card-status],[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }

  async activateCard(activationCode?: string) {
    await this.page.click('button:has-text("Activate"), [data-testid=activate-card]');
    if (activationCode) {
      await this.page.fill('[name=activationCode],[name=otp]', activationCode);
    }
    await this.page.click('button:has-text("Confirm"), button:has-text("Activate")');
    await this.page.waitForLoadState('networkidle');
  }

  async blockCard(reason: string) {
    await this.page.click('button:has-text("Block"), button:has-text("Freeze Card")');
    await this.page.locator('[name=blockReason],[name=reason]').selectOption(reason).catch(async () => {
      await this.page.fill('[name=blockReason],[name=reason]', reason);
    });
    await this.page.click('button:has-text("Confirm"), button:has-text("Block")');
    await this.page.waitForLoadState('networkidle');
  }

  async unblockCard() {
    await this.page.click('button:has-text("Unblock"), button:has-text("Unfreeze")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async setTransactionLimit(limitType: string, amount: number) {
    await this.page.click('button:has-text("Set Limits"), button:has-text("Limits")');
    await this.page.fill(`[name=${limitType}Limit],[name=${limitType}]`, amount.toString());
    await this.page.click('button:has-text("Save"), button:has-text("Update")');
    await this.page.waitForLoadState('networkidle');
  }

  async toggleControl(controlName: string) {
    const toggle = this.page.locator(`[data-testid="${controlName}-toggle"], label:has-text("${controlName}") input[type=checkbox]`).first();
    await toggle.click();
    await this.page.waitForTimeout(500);
  }

  async requestReplacement(reason: string) {
    await this.page.click('button:has-text("Request Replacement"), button:has-text("Replace")');
    await this.page.locator('[name=replacementReason],[name=reason]').selectOption(reason).catch(async () => {
      await this.page.fill('[name=replacementReason],[name=reason]', reason);
    });
    await this.page.click('button:has-text("Submit"), button:has-text("Confirm")');
    await this.page.waitForLoadState('networkidle');
  }
}
