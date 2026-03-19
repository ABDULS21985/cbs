import { Page, expect } from '@playwright/test';

export class ContactCenterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/crm/contact-center');
    await this.page.waitForLoadState('networkidle');
  }

  async lookupCustomer(searchTerm: string) {
    await this.page.fill('[name=search],[placeholder*=customer i],[placeholder*=search i]', searchTerm);
    await this.page.waitForTimeout(600);
    const suggestion = this.page.locator('[role=option],[data-testid=customer-suggestion]').first();
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
    } else {
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForLoadState('networkidle');
  }

  async createCase(data: {
    category: string;
    priority: string;
    description: string;
    channel?: string;
  }) {
    await this.page.click('button:has-text("New Case"), button:has-text("Create Case"), button:has-text("Open Case")');
    await this.page.locator('[name=category]').selectOption(data.category).catch(() => {});
    await this.page.locator('[name=priority]').selectOption(data.priority).catch(() => {});
    if (data.channel) await this.page.locator('[name=channel]').selectOption(data.channel).catch(() => {});
    await this.page.fill('[name=description],[name=details]', data.description);
    await this.page.click('button:has-text("Submit"), button:has-text("Create")');
    await this.page.waitForLoadState('networkidle');
  }

  async getCaseRef(): Promise<string> {
    const ref = this.page.locator('[data-testid=case-ref], text=/CASE-\\w+/').first();
    await ref.waitFor({ state: 'visible', timeout: 10_000 });
    return (await ref.textContent()) || '';
  }

  async resolveCase(caseRef: string, resolution: string) {
    await this.page.click(`text=${caseRef}`);
    await this.page.click('button:has-text("Resolve"), button:has-text("Close Case")');
    await this.page.fill('[name=resolution],[name=resolutionNotes]', resolution);
    await this.page.click('button:has-text("Confirm"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async getCaseStatus(caseRef: string): Promise<string> {
    const row = this.page.locator(`tr:has-text("${caseRef}")`).first();
    const status = row.locator('[data-testid=status],[class*=status-badge]').first();
    return (await status.textContent()) || '';
  }
}
