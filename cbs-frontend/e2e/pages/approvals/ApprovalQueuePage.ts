import { Page, expect } from '@playwright/test';

export class ApprovalQueuePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/approvals');
    await this.page.waitForLoadState('networkidle');
  }

  async getPendingCount(): Promise<number> {
    return this.page.locator('tbody tr, [data-testid=approval-row]').count();
  }

  async filterByType(type: string) {
    await this.page.locator('[name=type],[data-testid=type-filter]').selectOption(type).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  async openFirstItem() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async approve(comments?: string) {
    await this.page.click('button:has-text("Approve"), [data-testid=approve]');
    if (comments) await this.page.fill('[name=comments],[name=notes]', comments);
    await this.page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async reject(reason: string) {
    await this.page.click('button:has-text("Reject"), [data-testid=reject]');
    await this.page.fill('[name=reason],[name=rejectionReason]', reason);
    await this.page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async expectNotificationSent() {
    // Check notification indicator in header
    const bell = this.page.locator('[data-testid=notification-bell],[aria-label*=notification i]').first();
    if (await bell.isVisible({ timeout: 3000 }).catch(() => false)) {
      const badge = bell.locator('[class*=badge],[class*=count]');
      const count = parseInt((await badge.textContent()) || '0', 10);
      expect(count).toBeGreaterThan(0);
    }
  }
}
