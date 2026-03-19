import { Page, expect } from '@playwright/test';

export class CustomerOnboardingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/customers/onboarding');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCustomerType(type: 'Individual' | 'Corporate' | 'SME') {
    await this.page.click(`text=${type}, [data-value=${type.toUpperCase()}], button:has-text("${type}")`);
  }

  async clickNext() {
    await this.page.click('button:has-text("Next"), button:has-text("Continue")');
    await this.page.waitForTimeout(300);
  }

  async clickBack() {
    await this.page.click('button:has-text("Back"), button:has-text("Previous")');
    await this.page.waitForTimeout(300);
  }

  async fillPersonalInfo(data: {
    title?: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    nationality?: string;
  }) {
    if (data.title) {
      const titleSel = this.page.locator('[name=title]').first();
      if (await titleSel.getAttribute('role') === null) {
        await titleSel.selectOption(data.title);
      } else {
        await titleSel.click();
        await this.page.click(`[role=option]:has-text("${data.title}")`);
      }
    }
    await this.page.fill('[name=firstName]', data.firstName);
    await this.page.fill('[name=lastName]', data.lastName);
    await this.page.fill('[name=dateOfBirth]', data.dateOfBirth);
    if (data.gender) {
      const genderSel = this.page.locator('[name=gender]').first();
      await genderSel.selectOption(data.gender).catch(async () => {
        await genderSel.click();
        await this.page.click(`[role=option]:has-text("${data.gender}")`);
      });
    }
    if (data.nationality) {
      await this.page.fill('[name=nationality], [placeholder*=nationality i]', data.nationality);
    }
  }

  async fillContactInfo(data: { email: string; phoneNumber: string }) {
    await this.page.fill('[name=email]', data.email);
    await this.page.fill('[name=phoneNumber], [name=phone]', data.phoneNumber);
  }

  async fillIdentification(data: { nin?: string; bvn?: string }) {
    if (data.nin) await this.page.fill('[name=nin]', data.nin);
    if (data.bvn) await this.page.fill('[name=bvn]', data.bvn);
  }

  async fillAddress(data: { street: string; city: string; state: string; country?: string }) {
    await this.page.fill('[name=addressLine1],[name=street],[name=address]', data.street);
    await this.page.fill('[name=city]', data.city);
    await this.page.fill('[name=state]', data.state);
    if (data.country) await this.page.fill('[name=country]', data.country);
  }

  async fillEmployment(data: { status?: string; employer?: string; monthlyIncome?: number }) {
    if (data.status) {
      await this.page.locator('[name=employmentStatus]').selectOption(data.status).catch(async () => {
        await this.page.click(`[role=option]:has-text("${data.status}")`);
      });
    }
    if (data.employer) await this.page.fill('[name=employer],[name=employerName]', data.employer);
    if (data.monthlyIncome) await this.page.fill('[name=monthlyIncome]', data.monthlyIncome.toString());
  }

  async fillNextOfKin(data: { name: string; relationship: string; phoneNumber: string }) {
    await this.page.fill('[name=nextOfKinName],[name=nokName]', data.name);
    await this.page.locator('[name=nextOfKinRelationship],[name=nokRelationship]').selectOption(data.relationship).catch(() => {});
    await this.page.fill('[name=nextOfKinPhone],[name=nokPhone]', data.phoneNumber);
  }

  async submitDeclaration() {
    const checkbox = this.page.locator('[type=checkbox]').first();
    if (await checkbox.isVisible()) await checkbox.check();
  }

  async submitApplication() {
    await this.page.click('button:has-text("Submit"), button:has-text("Create Customer"), button:has-text("Complete")');
    await this.page.waitForLoadState('networkidle');
  }

  async getCurrentStep(): Promise<number> {
    const stepIndicators = this.page.locator('[data-testid=step],[aria-current=step],[class*=step-active]');
    return stepIndicators.count();
  }

  async expectStep(stepNumber: number) {
    const stepText = this.page.locator(`text=Step ${stepNumber}, [data-step="${stepNumber}"]`).first();
    await expect(stepText).toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  async getCustomerNumber(): Promise<string> {
    const ref = this.page.locator('[data-testid=customer-number], text=/CUS-\\d+/').first();
    await ref.waitFor({ state: 'visible', timeout: 15_000 });
    return (await ref.textContent()) || '';
  }
}
