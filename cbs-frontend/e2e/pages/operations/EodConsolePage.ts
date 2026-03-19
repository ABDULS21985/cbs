import { Page, expect } from '@playwright/test';

export class EodConsolePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/operations/eod');
    await this.page.waitForLoadState('networkidle');
  }

  async getCurrentStatus(): Promise<string> {
    const status = this.page.locator('[data-testid=eod-status],[class*=eod-status]').first();
    return (await status.textContent()) || '';
  }

  async triggerEod() {
    await this.page.click('button:has-text("Start EOD"), button:has-text("Run EOD"), button:has-text("Trigger EOD")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes, Start EOD")');
    await this.page.waitForTimeout(2000);
  }

  async waitForEodStep(stepName: string, timeout = 120_000) {
    const step = this.page.locator(`text=${stepName},[data-step="${stepName}"]`);
    await step.waitFor({ state: 'visible', timeout });
  }

  async waitForEodCompletion(timeout = 300_000) {
    await this.page.locator('text=EOD Complete, text=Completed, [data-testid=eod-complete]').first().waitFor({
      state: 'visible',
      timeout,
    });
  }

  async getEodLog(): Promise<string[]> {
    const logLines = await this.page.locator('[data-testid=eod-log] li, [class*=log-line]').allTextContents();
    return logLines;
  }

  async getFailedSteps(): Promise<string[]> {
    const failed = await this.page.locator('[data-testid=failed-step],[class*=step-error]').allTextContents();
    return failed;
  }
}
