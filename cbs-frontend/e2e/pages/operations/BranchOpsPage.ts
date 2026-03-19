import { Page, expect } from '@playwright/test';

export class BranchOpsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/operations/branch');
    await this.page.waitForLoadState('networkidle');
  }

  async selectBranch(branchCode: string) {
    const selector = this.page.locator('[name=branchCode],[name=branch],[data-testid=branch-selector]').first();
    await selector.selectOption(branchCode).catch(async () => {
      await selector.click();
      await this.page.click(`[role=option]:has-text("${branchCode}")`);
    });
    await this.page.waitForLoadState('networkidle');
  }

  async clickTab(tabName: string) {
    await this.page.click(`[role=tab]:has-text("${tabName}")`);
    await this.page.waitForTimeout(300);
  }

  async issueQueueTicket(serviceType: string) {
    await this.clickTab('Queue');
    await this.page.click('button:has-text("Issue Ticket"), button:has-text("New Ticket")');
    await this.page.locator('[name=serviceType],[name=service]').selectOption(serviceType).catch(async () => {
      await this.page.fill('[name=serviceType],[name=service]', serviceType);
    });
    await this.page.click('button:has-text("Issue"), button:has-text("Generate")');
    await this.page.waitForLoadState('networkidle');
  }

  async callNextTicket() {
    await this.page.click('button:has-text("Call Next"), button:has-text("Next Customer")');
    await this.page.waitForTimeout(500);
  }

  async completeService() {
    await this.page.click('button:has-text("Complete"), button:has-text("Done")');
    await this.page.waitForTimeout(500);
  }

  async getQueueLength(): Promise<number> {
    const count = this.page.locator('[data-testid=queue-length],[class*=queue-count]').first();
    const text = await count.textContent();
    return parseInt(text || '0', 10) || await this.page.locator('[data-testid=queue-ticket]').count();
  }

  async getTicketNumber(): Promise<string> {
    const ticket = this.page.locator('[data-testid=ticket-number],[class*=ticket-num]').first();
    return (await ticket.textContent()) || '';
  }
}
