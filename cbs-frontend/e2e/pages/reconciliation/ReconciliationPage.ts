import { Page, expect } from '@playwright/test';

export class ReconciliationPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/operations/reconciliation');
    await this.page.waitForLoadState('networkidle');
  }

  async createSession(accountNumber: string, date: string) {
    await this.page.click('button:has-text("New Session"), button:has-text("Start Reconciliation")');
    await this.page.fill('[name=accountNumber],[name=account]', accountNumber);
    await this.page.fill('[name=reconciliationDate],[name=date]', date);
    await this.page.click('button:has-text("Create"), button:has-text("Start")');
    await this.page.waitForLoadState('networkidle');
  }

  async uploadBankStatement(filePath: string) {
    const input = this.page.locator('input[type=file]').first();
    await input.setInputFiles(filePath);
    await this.page.waitForTimeout(1000);
    await this.page.click('button:has-text("Upload"), button:has-text("Process")');
    await this.page.waitForLoadState('networkidle');
  }

  async runAutoMatch() {
    await this.page.click('button:has-text("Auto Match"), button:has-text("Run Matching")');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);
  }

  async getMatchStats(): Promise<{ matched: number; unmatched: number }> {
    const matchedText = await this.page.locator('[data-testid=matched-count]').textContent().catch(() => '0');
    const unmatchedText = await this.page.locator('[data-testid=unmatched-count]').textContent().catch(() => '0');
    return {
      matched: parseInt(matchedText || '0', 10),
      unmatched: parseInt(unmatchedText || '0', 10),
    };
  }

  async manualMatchItems(ourRef: string, bankRef: string) {
    // Select our item
    const ourItem = this.page.locator(`[data-testid=unmatched-item]:has-text("${ourRef}")`).first();
    await ourItem.locator('[type=checkbox]').check();
    // Select bank item
    const bankItem = this.page.locator(`[data-testid=bank-item]:has-text("${bankRef}")`).first();
    await bankItem.locator('[type=checkbox]').check();
    await this.page.click('button:has-text("Match Selected"), button:has-text("Create Match")');
    await this.page.waitForLoadState('networkidle');
  }

  async getBreakCount(): Promise<number> {
    const text = await this.page.locator('[data-testid=break-count]').textContent().catch(() => '0');
    return parseInt(text || '0', 10);
  }
}
