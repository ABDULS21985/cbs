import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  outputDir: 'playwright-results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: /@smoke/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: /@smoke/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      grep: /@mobile/,
    },
    // Cross-cutting responsive projects
    {
      name: 'desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
      testDir: './e2e/cross-cutting',
      grep: /@desktop/,
    },
    {
      name: 'tablet-768',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 },
      },
      testDir: './e2e/cross-cutting',
      grep: /@tablet/,
    },
    {
      name: 'mobile-375',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 812 },
      },
      testDir: './e2e/cross-cutting',
      grep: /@mobile/,
    },
    // Dark mode project
    {
      name: 'dark-mode',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
      testDir: './e2e/cross-cutting',
      testMatch: /dark-mode|accessibility/,
    },
    // Cross-cutting tests (all viewports, default Chrome)
    {
      name: 'cross-cutting',
      use: { ...devices['Desktop Chrome'] },
      testDir: './e2e/cross-cutting',
    },
  ],
  webServer: [
    {
      command: 'cd ../cbs-backend && ./gradlew bootRun --args="--spring.profiles.active=test" -q',
      url: 'http://localhost:8081/actuator/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
