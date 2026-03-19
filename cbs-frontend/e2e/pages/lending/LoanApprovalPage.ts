import { Page, expect } from '@playwright/test';

export class LoanApprovalPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/lending/approvals');
    await this.page.waitForLoadState('networkidle');
  }

  async getPendingCount(): Promise<number> {
    const badge = this.page.locator('[data-testid=pending-count],[class*=badge]').first();
    const text = await badge.textContent();
    return parseInt(text || '0', 10) || await this.page.locator('tbody tr').count();
  }

  async openApplication(ref: string) {
    await this.page.click(`text=${ref}`);
    await this.page.waitForLoadState('networkidle');
  }

  async openFirstApplication() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async approve(notes?: string) {
    await this.page.click('button:has-text("Approve"), [data-testid=approve-btn]');
    if (notes) {
      await this.page.fill('[name=approvalNotes],[name=comments],[name=notes]', notes);
    }
    await this.page.click('button:has-text("Confirm Approval"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async reject(reason: string) {
    await this.page.click('button:has-text("Reject"), [data-testid=reject-btn]');
    await this.page.fill('[name=rejectionReason],[name=reason]', reason);
    await this.page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async referBack(notes: string) {
    await this.page.click('button:has-text("Refer Back"), button:has-text("Return")');
    await this.page.fill('[name=referralNotes],[name=notes]', notes);
    await this.page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }
}
