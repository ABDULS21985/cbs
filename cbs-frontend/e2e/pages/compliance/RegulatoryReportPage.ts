import { Page, expect } from '@playwright/test';

export class RegulatoryReportPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/compliance/regulatory');
    await this.page.waitForLoadState('networkidle');
  }

  async selectReturn(returnType: string) {
    await this.page.click(`text=${returnType}, [data-testid=return-card]:has-text("${returnType}")`);
    await this.page.waitForLoadState('networkidle');
  }

  async extractData() {
    await this.page.click('button:has-text("Extract Data"), button:has-text("Generate")');
    await this.page.waitForLoadState('networkidle');
    // Wait for extraction to complete
    await this.page.locator('text=Extraction complete, text=Data ready, [data-testid=extraction-done]').first()
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
  }

  async runValidation() {
    await this.page.click('button:has-text("Validate"), button:has-text("Run Validation")');
    await this.page.waitForLoadState('networkidle');
    await this.page.locator('text=Validation complete, [data-testid=validation-done]').first()
      .waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  }

  async getValidationErrors(): Promise<string[]> {
    return this.page.locator('[data-testid=validation-error],[class*=error-item]').allTextContents();
  }

  async submitForApproval() {
    await this.page.click('button:has-text("Submit for Approval"), button:has-text("Submit")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async approve(notes?: string) {
    await this.page.click('button:has-text("Approve"), [data-testid=approve-return]');
    if (notes) await this.page.fill('[name=approvalNotes],[name=notes]', notes);
    await this.page.click('button:has-text("Confirm Approval"), button:has-text("Approve")');
    await this.page.waitForLoadState('networkidle');
  }

  async markAsSubmitted() {
    await this.page.click('button:has-text("Mark as Submitted"), button:has-text("Submitted to Regulator")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async getStatus(): Promise<string> {
    const status = this.page.locator('[data-testid=return-status],[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }
}
