import { Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface TestUser {
  username: string;
  password: string;
  role: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  officer: {
    username: process.env.TEST_USER_OFFICER || 'testuser',
    password: process.env.TEST_USER_OFFICER_PASS || 'TestPass123!',
    role: 'CBS_OFFICER',
  },
  manager: {
    username: process.env.TEST_USER_MANAGER || 'testmanager',
    password: process.env.TEST_USER_MANAGER_PASS || 'TestPass123!',
    role: 'CBS_MANAGER',
  },
  compliance: {
    username: process.env.TEST_USER_COMPLIANCE || 'testcompliance',
    password: process.env.TEST_USER_COMPLIANCE_PASS || 'TestPass123!',
    role: 'COMPLIANCE_OFFICER',
  },
  treasury: {
    username: process.env.TEST_USER_TREASURY || 'testtreasury',
    password: process.env.TEST_USER_TREASURY_PASS || 'TestPass123!',
    role: 'TREASURY_DEALER',
  },
  admin: {
    username: process.env.TEST_USER_ADMIN || 'testadmin',
    password: process.env.TEST_USER_ADMIN_PASS || 'TestPass123!',
    role: 'SYSTEM_ADMIN',
  },
};

const STORAGE_DIR = path.join(__dirname, '..', '.auth');

export function getStoragePath(role: string): string {
  return path.join(STORAGE_DIR, `${role}.json`);
}

export async function loginAs(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('[name=username]', { state: 'visible' });
  await page.fill('[name=username]', user.username);
  await page.fill('[name=password]', user.password);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 15_000 });
}

export async function saveAuthState(context: BrowserContext, role: string): Promise<void> {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  await context.storageState({ path: getStoragePath(role) });
}

export function authStateExists(role: string): boolean {
  return fs.existsSync(getStoragePath(role));
}
