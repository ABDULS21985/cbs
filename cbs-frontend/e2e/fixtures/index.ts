import { test as base, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { USERS } from '../data/testUsers';
import { loginAs } from '../helpers/auth';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  asOfficer: Page;
  asManager: Page;
  asCompliance: Page;
  asTreasury: Page;
  asAdmin: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  asOfficer: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.officer);
    await use(page);
    await context.close();
  },

  asManager: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.manager);
    await use(page);
    await context.close();
  },

  asCompliance: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.compliance);
    await use(page);
    await context.close();
  },

  asTreasury: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.treasury);
    await use(page);
    await context.close();
  },

  asAdmin: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, USERS.admin);
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
