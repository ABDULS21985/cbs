import { Page, expect } from '@playwright/test';

export class PaymentPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/payments');
    await this.page.waitForLoadState('networkidle');
  }

  async initiateTransfer(data: {
    fromAccount: string;
    toAccount: string;
    amount: number;
    narration: string;
    bankCode?: string;
  }) {
    // Select payment type
    const transferType = data.bankCode ? 'External' : 'Internal';
    await this.page.click(`text=${transferType}, button:has-text("${transferType}")`).catch(() => {});

    // Fill source account
    await this.page.fill('[name=fromAccount],[name=sourceAccount]', data.fromAccount);

    // Fill destination
    await this.page.fill('[name=toAccount],[name=destinationAccount],[name=beneficiaryAccount]', data.toAccount);

    if (data.bankCode) {
      await this.page.locator('[name=bankCode],[name=destinationBank]').selectOption(data.bankCode).catch(() => {});
      // Trigger name verification
      await this.page.click('button:has-text("Verify"), button:has-text("Lookup")');
      await this.page.waitForTimeout(2000);
    }

    await this.page.fill('[name=amount]', data.amount.toString());
    await this.page.fill('[name=narration],[name=description]', data.narration);
  }

  async previewFees() {
    await this.page.click('button:has-text("Preview"), button:has-text("Calculate Fee")');
    await this.page.waitForTimeout(1000);
  }

  async submitPayment() {
    await this.page.click('button:has-text("Submit"), button:has-text("Send"), button[type=submit]');
    await this.page.waitForLoadState('networkidle');
  }

  async confirmPayment() {
    await this.page.click('button:has-text("Confirm"), button:has-text("Authorize")');
    await this.page.waitForLoadState('networkidle');
  }

  async getTransactionRef(): Promise<string> {
    const ref = this.page.locator('[data-testid=txn-ref], text=/TXN-\\w+/, text=/REF-\\w+/').first();
    await ref.waitFor({ state: 'visible', timeout: 15_000 });
    return (await ref.textContent()) || '';
  }

  async enterOTP(otp: string) {
    const otpInput = this.page.locator('[name=otp],[placeholder*=OTP i]').first();
    if (await otpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await otpInput.fill(otp);
      await this.page.click('button:has-text("Verify OTP"), button:has-text("Confirm")');
    }
  }
}
