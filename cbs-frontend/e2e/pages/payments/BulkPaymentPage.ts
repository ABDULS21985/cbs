import { Page, expect } from '@playwright/test';
import path from 'path';

export class BulkPaymentPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/payments/bulk');
    await this.page.waitForLoadState('networkidle');
  }

  async uploadFile(filePath: string) {
    const input = this.page.locator('input[type=file]').first();
    await input.setInputFiles(filePath);
    await this.page.waitForTimeout(1000);
  }

  async validateBatch() {
    await this.page.click('button:has-text("Validate"), button:has-text("Check")');
    await this.page.waitForLoadState('networkidle');
  }

  async getValidationResult(): Promise<{ valid: number; invalid: number }> {
    const validText = await this.page.locator('[data-testid=valid-count], text=/\\d+ valid/i').first().textContent() || '0';
    const invalidText = await this.page.locator('[data-testid=invalid-count], text=/\\d+ invalid/i').first().textContent() || '0';
    return {
      valid: parseInt(validText.match(/\d+/)?.[0] || '0', 10),
      invalid: parseInt(invalidText.match(/\d+/)?.[0] || '0', 10),
    };
  }

  async submitBatch() {
    await this.page.click('button:has-text("Submit Batch"), button:has-text("Process")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async getBatchRef(): Promise<string> {
    const ref = this.page.locator('[data-testid=batch-ref], text=/BATCH-\\w+/').first();
    return (await ref.textContent()) || '';
  }
}
