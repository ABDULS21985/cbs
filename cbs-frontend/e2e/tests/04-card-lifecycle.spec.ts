import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { CardListPage } from '../pages/cards/CardListPage';
import { CardDetailPage } from '../pages/cards/CardDetailPage';
import { USERS } from '../data/testUsers';
import { SEED_ACCOUNT_NUMBER } from '../data/testData';
import { expectToast } from '../helpers/utils';

test.describe('Card Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAndWaitForDashboard(USERS.officer.username, USERS.officer.password);
  });

  test('TC04-01: Request a new debit card', async ({ page }) => {
    const cardList = new CardListPage(page);
    await cardList.goto();

    await cardList.requestCard({
      accountNumber: SEED_ACCOUNT_NUMBER,
      cardType: 'DEBIT',
      deliveryOption: 'BRANCH',
    });

    await expectToast(page, 'success');
  });

  test('TC04-02: Card appears in card list', async ({ page }) => {
    const cardList = new CardListPage(page);
    await cardList.goto();
    const count = await cardList.getCardCount();
    expect(count).toBeGreaterThan(0);
  });

  test('TC04-03: Manager approves card request', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/login');
    await login.loginAndWaitForDashboard(USERS.manager.username, USERS.manager.password);

    await page.goto('/cards/approvals');
    await page.waitForLoadState('networkidle');

    const pendingCards = await page.locator('tbody tr').count();
    if (pendingCards > 0) {
      await page.locator('tbody tr').first().click();
      await page.click('button:has-text("Approve"), [data-testid=approve]');
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');
      await expectToast(page, 'success');
    }
  });

  test('TC04-04: View card detail and activate', async ({ page }) => {
    const cardList = new CardListPage(page);
    await cardList.goto();

    const count = await cardList.getCardCount();
    if (count === 0) {
      test.skip();
      return;
    }

    await cardList.clickFirstCard();
    const cardDetail = new CardDetailPage(page);

    const status = await cardDetail.getStatus();
    if (status.toUpperCase().includes('INACTIVE') || status.toUpperCase().includes('PENDING')) {
      await cardDetail.activateCard();
      await expectToast(page, 'success');
    }
  });

  test('TC04-05: Set transaction limits', async ({ page }) => {
    const cardList = new CardListPage(page);
    await cardList.goto();

    const count = await cardList.getCardCount();
    if (count === 0) { test.skip(); return; }

    await cardList.clickFirstCard();
    const cardDetail = new CardDetailPage(page);
    await cardDetail.setTransactionLimit('daily', 100000);
    await expectToast(page, 'success');
  });

  test('TC04-06: Toggle card controls (online transactions)', async ({ page }) => {
    const cardList = new CardListPage(page);
    await cardList.goto();

    const count = await cardList.getCardCount();
    if (count === 0) { test.skip(); return; }

    await cardList.clickFirstCard();
    const cardDetail = new CardDetailPage(page);
    await cardDetail.toggleControl('online');
    await expectToast(page, 'success');
  });

  test('TC04-07: Block card', async ({ page }) => {
    const cardList = new CardListPage(page);
    await cardList.goto();

    const count = await cardList.getCardCount();
    if (count === 0) { test.skip(); return; }

    await cardList.clickFirstCard();
    const cardDetail = new CardDetailPage(page);
    await cardDetail.blockCard('LOST');
    await expectToast(page, 'success');

    const status = await cardDetail.getStatus();
    expect(status.toUpperCase()).toMatch(/BLOCK|FROZEN|INACTIVE/);
  });

  test('TC04-08: Request card replacement', async ({ page }) => {
    const cardList = new CardListPage(page);
    await cardList.goto();

    const count = await cardList.getCardCount();
    if (count === 0) { test.skip(); return; }

    await cardList.clickFirstCard();
    const cardDetail = new CardDetailPage(page);
    await cardDetail.requestReplacement('DAMAGED');
    await expectToast(page, 'success');
  });
});
