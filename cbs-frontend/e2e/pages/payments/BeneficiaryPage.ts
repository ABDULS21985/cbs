import { Page, expect } from '@playwright/test';

export class BeneficiaryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/payments/beneficiaries');
    await this.page.waitForLoadState('networkidle');
  }

  async addBeneficiary(data: {
    name: string;
    accountNumber: string;
    bankCode: string;
    nickname?: string;
  }) {
    await this.page.click('button:has-text("Add Beneficiary"), button:has-text("New Beneficiary")');
    await this.page.fill('[name=accountNumber],[name=beneficiaryAccount]', data.accountNumber);
    await this.page.locator('[name=bankCode],[name=bank]').selectOption(data.bankCode).catch(async () => {
      await this.page.click('[name=bankCode],[name=bank]');
      await this.page.click(`[role=option]:has-text("${data.bankCode}")`);
    });
    await this.page.click('button:has-text("Verify"), button:has-text("Lookup")');
    await this.page.waitForTimeout(2000);
    if (data.nickname) await this.page.fill('[name=nickname]', data.nickname);
    await this.page.click('button:has-text("Save"), button:has-text("Add")');
    await this.page.waitForLoadState('networkidle');
  }

  async deleteBeneficiary(name: string) {
    const row = this.page.locator(`tr:has-text("${name}")`).first();
    await row.locator('button:has-text("Delete"), [aria-label*=delete i]').click();
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async getBeneficiaryCount(): Promise<number> {
    return this.page.locator('tbody tr, [data-testid=beneficiary-row]').count();
  }

  async expectBeneficiaryExists(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible();
  }
}
