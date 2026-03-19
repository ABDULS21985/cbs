import { Page, expect } from '@playwright/test';

export class UserAdminPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/users');
    await this.page.waitForLoadState('networkidle');
  }

  async createUser(data: {
    username: string;
    fullName: string;
    email: string;
    role: string;
    branchCode?: string;
    password?: string;
  }) {
    await this.page.click('button:has-text("New User"), button:has-text("Create User"), button:has-text("Add User")');
    await this.page.fill('[name=username]', data.username);
    await this.page.fill('[name=fullName],[name=name]', data.fullName);
    await this.page.fill('[name=email]', data.email);
    await this.page.locator('[name=role]').selectOption(data.role).catch(async () => {
      await this.page.click('[name=role]');
      await this.page.click(`[role=option]:has-text("${data.role}")`);
    });
    if (data.branchCode) {
      await this.page.locator('[name=branchCode],[name=branch]').selectOption(data.branchCode).catch(() => {});
    }
    if (data.password) {
      await this.page.fill('[name=password],[name=tempPassword]', data.password);
    }
    await this.page.click('button:has-text("Save"), button:has-text("Create"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async deactivateUser(username: string) {
    const row = this.page.locator(`tr:has-text("${username}")`).first();
    await row.locator('button:has-text("Deactivate"), button:has-text("Disable")').click();
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async resetPassword(username: string) {
    const row = this.page.locator(`tr:has-text("${username}")`).first();
    await row.locator('button:has-text("Reset"), [aria-label*=password i]').click();
    await this.page.click('button:has-text("Confirm"), button:has-text("Send Reset")');
    await this.page.waitForLoadState('networkidle');
  }

  async getUserCount(): Promise<number> {
    return this.page.locator('tbody tr').count();
  }

  async expectUserExists(username: string) {
    await expect(this.page.locator(`text=${username}`).first()).toBeVisible();
  }

  async assignRole(username: string, role: string) {
    const row = this.page.locator(`tr:has-text("${username}")`).first();
    await row.locator('button:has-text("Edit"), [aria-label*=edit i]').click();
    await this.page.locator('[name=role]').selectOption(role).catch(() => {});
    await this.page.click('button:has-text("Save"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }
}
