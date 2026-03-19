import { Page, expect } from '@playwright/test';

export class AMLAlertsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/compliance/aml');
    await this.page.waitForLoadState('networkidle');
  }

  async getAlertCount(): Promise<number> {
    return this.page.locator('tbody tr, [data-testid=alert-row]').count();
  }

  async filterByStatus(status: string) {
    await this.page.locator('[name=status],[data-testid=alert-status-filter]').selectOption(status).catch(async () => {
      await this.page.click('[name=status]');
      await this.page.click(`[role=option]:has-text("${status}")`);
    });
    await this.page.waitForLoadState('networkidle');
  }

  async filterByRisk(risk: string) {
    await this.page.locator('[name=riskLevel],[data-testid=risk-filter]').selectOption(risk).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  async clickFirstAlert() {
    await this.page.locator('tbody tr').first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickAlert(alertId: string) {
    await this.page.click(`text=${alertId}`);
    await this.page.waitForLoadState('networkidle');
  }
}
