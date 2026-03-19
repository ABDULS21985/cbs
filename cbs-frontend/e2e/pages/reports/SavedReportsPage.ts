import { Page, expect } from '@playwright/test';

export class SavedReportsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/reports/saved');
    await this.page.waitForLoadState('networkidle');
  }

  async getReportCount(): Promise<number> {
    return this.page.locator('tbody tr, [data-testid=report-row]').count();
  }

  async runReport(reportName: string) {
    const row = this.page.locator(`tr:has-text("${reportName}")`).first();
    await row.locator('button:has-text("Run"), [data-testid=run-report]').click();
    await this.page.waitForLoadState('networkidle');
  }

  async deleteReport(reportName: string) {
    const row = this.page.locator(`tr:has-text("${reportName}")`).first();
    await row.locator('button:has-text("Delete"), [aria-label*=delete i]').click();
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async expectReportExists(reportName: string) {
    await expect(this.page.locator(`text=${reportName}`).first()).toBeVisible();
  }
}
