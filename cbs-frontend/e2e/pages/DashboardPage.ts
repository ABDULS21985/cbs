import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.page.locator('h1, [data-testid=dashboard-header]').first()).toBeVisible({ timeout: 15_000 });
  }

  async navigateTo(section: string) {
    await this.page.click(`[href*="${section}"], nav a:has-text("${section}")`);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatCardValue(label: string): Promise<string> {
    const card = this.page.locator(`:has-text("${label}")`).filter({ has: this.page.locator('[class*=font-bold],[class*=text-2xl]') }).first();
    const value = card.locator('[class*=font-bold],[class*=text-2xl],[class*=stat]').first();
    return (await value.textContent()) || '';
  }

  async expectStatCardVisible(label: string) {
    await expect(this.page.locator(`text=${label}`).first()).toBeVisible();
  }

  async logout() {
    await this.page.click('[data-testid=user-menu], button:has-text("Logout"), [aria-label=logout]');
    const logoutBtn = this.page.locator('text=Logout, text=Sign Out').first();
    if (await logoutBtn.isVisible()) await logoutBtn.click();
    await this.page.waitForURL(/\/login/);
  }
}
