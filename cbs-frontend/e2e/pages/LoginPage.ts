import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await expect(this.page.locator('[name=username]')).toBeVisible();
  }

  async login(username: string, password: string) {
    await this.page.fill('[name=username]', username);
    await this.page.fill('[name=password]', password);
    await this.page.click('button[type=submit]');
  }

  async loginAndWaitForDashboard(username: string, password: string) {
    await this.login(username, password);
    await this.page.waitForURL(/\/(dashboard|home)/, { timeout: 20_000 });
  }

  async expectError(message?: string) {
    const error = this.page.locator('[role=alert], .text-red-500, .text-destructive').first();
    await expect(error).toBeVisible();
    if (message) await expect(error).toContainText(message);
  }

  async expectLoginPage() {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.page.locator('[name=username]')).toBeVisible();
  }
}
