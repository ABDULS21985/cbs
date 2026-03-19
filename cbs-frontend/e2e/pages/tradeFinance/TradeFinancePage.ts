import { Page, expect } from '@playwright/test';

export class TradeFinancePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/trade-finance');
    await this.page.waitForLoadState('networkidle');
  }

  async newLCApplication(data: {
    applicant: string;
    beneficiary: string;
    amount: number;
    currency: string;
    expiryDate: string;
    goodsDescription: string;
  }) {
    await this.page.click('button:has-text("New LC"), button:has-text("Apply for LC"), button:has-text("New Letter of Credit")');
    await this.page.fill('[name=applicant],[name=applicantName]', data.applicant);
    await this.page.fill('[name=beneficiary],[name=beneficiaryName]', data.beneficiary);
    await this.page.fill('[name=amount],[name=lcAmount]', data.amount.toString());
    await this.page.locator('[name=currency]').selectOption(data.currency).catch(() => {});
    await this.page.fill('[name=expiryDate],[name=expiry]', data.expiryDate);
    await this.page.fill('[name=goodsDescription],[name=goods]', data.goodsDescription);
  }

  async submitLCApplication() {
    await this.page.click('button:has-text("Submit"), button:has-text("Apply"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async getLCRef(): Promise<string> {
    const ref = this.page.locator('[data-testid=lc-ref], text=/LC-\\w+/').first();
    await ref.waitFor({ state: 'visible', timeout: 15_000 });
    return (await ref.textContent()) || '';
  }

  async issueLetter(lcRef: string) {
    await this.page.click(`text=${lcRef}`);
    await this.page.click('button:has-text("Issue"), button:has-text("Approve & Issue")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async submitDocuments(lcRef: string, docTypes: string[]) {
    await this.page.click(`text=${lcRef}`);
    await this.page.click('[role=tab]:has-text("Documents")');
    for (const docType of docTypes) {
      await this.page.click('button:has-text("Add Document")');
      await this.page.locator('[name=documentType]').selectOption(docType).catch(() => {});
      await this.page.click('button:has-text("Save"), button:has-text("Upload")');
    }
    await this.page.click('button:has-text("Submit Documents"), button:has-text("Present")');
    await this.page.waitForLoadState('networkidle');
  }

  async getLCStatus(lcRef: string): Promise<string> {
    const row = this.page.locator(`tr:has-text("${lcRef}")`).first();
    const status = row.locator('[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }
}
