import { Page, expect } from '@playwright/test';

export class AMLAlertDetailPage {
  constructor(private page: Page) {}

  async getAlertType(): Promise<string> {
    const type = this.page.locator('[data-testid=alert-type],[class*=alert-type]').first();
    return (await type.textContent()) || '';
  }

  async getRiskScore(): Promise<number> {
    const score = this.page.locator('[data-testid=risk-score],[class*=risk-score]').first();
    const text = await score.textContent();
    return parseInt(text || '0', 10);
  }

  async viewTransactionTimeline() {
    await this.page.click('[role=tab]:has-text("Timeline"), [role=tab]:has-text("Transactions")');
    await this.page.waitForTimeout(300);
  }

  async addInvestigationNote(note: string) {
    const noteInput = this.page.locator('[name=investigationNote],[name=note],[placeholder*=note i]').first();
    await noteInput.fill(note);
    await this.page.click('button:has-text("Save Note"), button:has-text("Add Note")');
    await this.page.waitForLoadState('networkidle');
  }

  async dismissAsFalsePositive(reason: string) {
    await this.page.click('button:has-text("Dismiss"), button:has-text("False Positive")');
    await this.page.fill('[name=dismissalReason],[name=reason]', reason);
    await this.page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async escalate(notes: string) {
    await this.page.click('button:has-text("Escalate"), button:has-text("Raise SAR")');
    await this.page.fill('[name=escalationNotes],[name=notes]', notes);
    await this.page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async getStatus(): Promise<string> {
    const status = this.page.locator('[data-testid=alert-status],[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }
}
