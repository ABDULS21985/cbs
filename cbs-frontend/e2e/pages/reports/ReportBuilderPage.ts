import { Page, expect } from '@playwright/test';

export class ReportBuilderPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/reports/builder');
    await this.page.waitForLoadState('networkidle');
  }

  async selectDataSource(sourceName: string) {
    const source = this.page.locator(`[data-testid=data-source]:has-text("${sourceName}"), button:has-text("${sourceName}")`).first();
    if (await source.isVisible({ timeout: 5000 }).catch(() => false)) {
      await source.click();
    } else {
      await this.page.locator('[name=dataSource]').selectOption(sourceName).catch(() => {});
    }
  }

  async addField(fieldName: string) {
    const field = this.page.locator(`[data-testid=field]:has-text("${fieldName}"), li:has-text("${fieldName}")`).first();
    await field.click();
    await this.page.waitForTimeout(300);
  }

  async clickNext() {
    await this.page.click('button:has-text("Next"), button:has-text("Continue")');
    await this.page.waitForTimeout(500);
  }

  async addFilter(fieldName: string, operator: string, value: string) {
    await this.page.click('button:has-text("Add Filter"), button:has-text("+ Filter")');
    await this.page.locator('[name=filterField]').last().selectOption(fieldName).catch(() => {});
    await this.page.locator('[name=operator]').last().selectOption(operator).catch(() => {});
    await this.page.locator('[name=filterValue]').last().fill(value);
  }

  async selectVisualization(vizType: string) {
    await this.page.click(`[data-viz="${vizType}"], button:has-text("${vizType}")`);
  }

  async previewReport() {
    await this.page.click('button:has-text("Preview"), button:has-text("Run Preview")');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async saveReport(data: {
    name: string;
    description?: string;
    schedule?: string;
    emails?: string[];
  }) {
    await this.page.click('button:has-text("Save Report"), button:has-text("Save")');
    await this.page.fill('[name=name],[name=reportName]', data.name);
    if (data.description) await this.page.fill('[name=description]', data.description);
    if (data.schedule) {
      await this.page.locator('[name=schedule]').selectOption(data.schedule).catch(() => {});
    }
    if (data.emails?.length) {
      for (const email of data.emails) {
        await this.page.fill('[name=deliveryEmails],[placeholder*=email i]', email);
        await this.page.keyboard.press('Enter');
      }
    }
    await this.page.click('button:has-text("Save"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async saveAndRun(name: string) {
    await this.page.fill('[name=name],[name=reportName]', name);
    await this.page.click('button:has-text("Save and Run"), button:has-text("Save & Run")');
    await this.page.waitForLoadState('networkidle');
  }

  async getSavedReportName(): Promise<string> {
    const name = this.page.locator('[data-testid=saved-report-name],[class*=report-name]').first();
    return (await name.textContent()) || '';
  }
}
