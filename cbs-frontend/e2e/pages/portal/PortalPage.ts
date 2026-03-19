import { Page, expect } from '@playwright/test';

export class PortalPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/portal');
    await this.page.waitForLoadState('networkidle');
  }

  async login(username: string, password: string) {
    await this.page.goto('/portal/login');
    await this.page.fill('[name=username]', username);
    await this.page.fill('[name=password]', password);
    await this.page.click('button[type=submit]');
    await this.page.waitForURL(/\/portal\/(dashboard|home|accounts)/, { timeout: 15_000 });
  }

  async getAccountBalance(accountNumber?: string): Promise<string> {
    const selector = accountNumber
      ? `[data-account="${accountNumber}"] [class*=balance], tr:has-text("${accountNumber}") td`
      : '[class*=balance],[data-testid=balance]';
    const balance = this.page.locator(selector).first();
    return (await balance.textContent()) || '';
  }

  async initiateTransfer(data: { toAccount: string; amount: number; narration: string }) {
    await this.page.click('text=Transfer, button:has-text("Send Money")');
    await this.page.fill('[name=toAccount],[name=destination]', data.toAccount);
    await this.page.fill('[name=amount]', data.amount.toString());
    await this.page.fill('[name=narration],[name=description]', data.narration);
    await this.page.click('button:has-text("Continue"), button:has-text("Next")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Send")');
    await this.page.waitForLoadState('networkidle');
  }

  async blockCard() {
    await this.page.click('text=Cards, [href*=cards]');
    await this.page.click('button:has-text("Block"), button:has-text("Freeze")');
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.page.waitForLoadState('networkidle');
  }

  async downloadStatement(format: 'PDF' | 'CSV') {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click(`button:has-text("${format}"), button:has-text("Download ${format}")`),
    ]);
    return download;
  }
}
