import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { DigitalBankingPage } from './DigitalBankingPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockUssdMenus = [
  { id: 1, menuCode: 'MAIN', parentMenuCode: null, displayOrder: 0, title: 'Main Menu', shortcode: '*123#', actionType: 'MENU', serviceCode: null, requiresPin: false, isActive: true, createdAt: '2026-01-01T00:00:00Z', version: 1 },
  { id: 2, menuCode: 'BALANCE', parentMenuCode: 'MAIN', displayOrder: 1, title: 'Check Balance', shortcode: null, actionType: 'SERVICE', serviceCode: 'BALANCE_INQUIRY', requiresPin: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', version: 1 },
  { id: 3, menuCode: 'TRANSFER', parentMenuCode: 'MAIN', displayOrder: 2, title: 'Transfer Funds', shortcode: null, actionType: 'SERVICE', serviceCode: 'TRANSFER', requiresPin: true, isActive: false, createdAt: '2026-01-01T00:00:00Z', version: 1 },
];

const mockSummaries = [
  { id: 1, customerId: 100, channel: 'WEB', periodType: 'DAILY', periodDate: '2026-03-22', totalSessions: 5, totalTransactions: 12, totalAmount: 250000, avgResponseTimeMs: 340, failureCount: 1, uniqueActivities: 4, mostUsedActivity: 'TRANSFER' },
  { id: 2, customerId: 200, channel: 'MOBILE', periodType: 'DAILY', periodDate: '2026-03-22', totalSessions: 8, totalTransactions: 20, totalAmount: 500000, avgResponseTimeMs: 210, failureCount: 0, uniqueActivities: 6, mostUsedActivity: 'PAYMENT' },
];

function setupHandlers(overrides?: {
  loginInfo?: unknown;
  idleStatus?: unknown;
  menus?: unknown;
  summaries?: unknown;
}) {
  server.use(
    http.get('/api/v1/internet-banking/login', () =>
      HttpResponse.json(wrap(overrides?.loginInfo ?? { status: 'READY', methods: 'PASSWORD,OTP,BIOMETRIC' })),
    ),
    http.get('/api/v1/internet-banking/sessions/expire-idle', () =>
      HttpResponse.json(wrap(overrides?.idleStatus ?? { expired: 2 })),
    ),
    http.post('/api/v1/internet-banking/sessions/expire-idle', () =>
      HttpResponse.json(wrap({ expired: 2 })),
    ),
    http.get('/api/v1/ussd/menus/all', () =>
      HttpResponse.json(wrap(overrides?.menus ?? mockUssdMenus)),
    ),
    http.post('/api/v1/ussd/menus', () =>
      HttpResponse.json(wrap({ ...mockUssdMenus[0], id: 4 })),
    ),
    http.put('/api/v1/ussd/menus/:id', () =>
      HttpResponse.json(wrap(mockUssdMenus[0])),
    ),
    http.delete('/api/v1/ussd/menus/:id', () =>
      HttpResponse.json(wrap(null)),
    ),
    http.get('/api/v1/channel-activity/summarize', () =>
      HttpResponse.json(wrap(overrides?.summaries ?? mockSummaries)),
    ),
    http.post('/api/v1/channel-activity/summarize', () =>
      HttpResponse.json(wrap(mockSummaries[0])),
    ),
  );
}

describe('DigitalBankingPage', () => {
  // ── 1. Page header renders ──────────────────────────────────────────────────

  it('renders page header "Digital Banking"', () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    expect(screen.getByText('Digital Banking')).toBeInTheDocument();
  });

  // ── 2. Internet Banking tab renders by default ──────────────────────────────

  it('renders Internet Banking tab by default', () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    expect(screen.getByText('Internet Banking')).toBeInTheDocument();
    expect(screen.getByText('USSD Management')).toBeInTheDocument();
    expect(screen.getByText('Activity Analytics')).toBeInTheDocument();
  });

  // ── 3. Shows Portal Status, Auth Methods, Idle Sessions info ────────────────

  it('shows Portal Status (READY), Auth Methods, and Idle Sessions info', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    await waitFor(() => {
      expect(screen.getByText('Portal Status')).toBeInTheDocument();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByText('READY')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Auth Methods')).toBeInTheDocument();
    // PASSWORD/OTP/BIOMETRIC appear in both auth methods badges and login form dropdown
    const passwordEls = screen.getAllByText('PASSWORD');
    expect(passwordEls.length).toBeGreaterThanOrEqual(1);
    const otpEls = screen.getAllByText('OTP');
    expect(otpEls.length).toBeGreaterThanOrEqual(1);
    const bioEls = screen.getAllByText('BIOMETRIC');
    expect(bioEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Idle Sessions')).toBeInTheDocument();
    expect(screen.getByText('2 expired')).toBeInTheDocument();
  });

  // ── 4. IB architecture cards ────────────────────────────────────────────────

  it('shows IB architecture cards (Idle Timeout, Absolute Timeout, MFA Required, SCA Support)', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    await waitFor(() => {
      expect(screen.getByText('Idle Timeout')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('Absolute Timeout')).toBeInTheDocument();
    expect(screen.getByText('480 min')).toBeInTheDocument();
    expect(screen.getByText('MFA Required')).toBeInTheDocument();
    expect(screen.getByText('Configurable')).toBeInTheDocument();
    expect(screen.getByText('SCA Support')).toBeInTheDocument();
    expect(screen.getByText('PSD2 Compliant')).toBeInTheDocument();
  });

  // ── 5. Expire Idle Sessions button for admin ───────────────────────────────

  it('shows "Expire Idle Sessions" button for admin', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    await waitFor(() => {
      expect(screen.getByText('Expire Idle Sessions')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 6. Switching to USSD Management tab shows menu table ────────────────────

  it('switching to USSD Management tab shows menu table', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    fireEvent.click(screen.getByText('USSD Management'));
    await waitFor(() => {
      expect(screen.getByText('USSD Menu Tree')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Wait for data to load (DataTable only renders headers after loading)
    await waitFor(() => {
      expect(screen.getByText('Main Menu')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Menu Code')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  // ── 7. Shows USSD menu data ─────────────────────────────────────────────────

  it('shows USSD menu data (code, title, parent, action type, PIN, status)', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    fireEvent.click(screen.getByText('USSD Management'));
    await waitFor(() => {
      expect(screen.getByText('Main Menu')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Menu codes - MAIN appears as code and as parent of sub-menus
    const mainEls = screen.getAllByText('MAIN');
    expect(mainEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('BALANCE')).toBeInTheDocument();
    expect(screen.getByText('Check Balance')).toBeInTheDocument();
    expect(screen.getByText('Transfer Funds')).toBeInTheDocument();
    // Action types
    expect(screen.getByText('MENU')).toBeInTheDocument();
    const serviceElements = screen.getAllByText('SERVICE');
    expect(serviceElements.length).toBeGreaterThanOrEqual(2);
    // Status badges
    const activeElements = screen.getAllByText('ACTIVE');
    expect(activeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  // ── 8. Shows stats (Total Menus: 3, Root Menus: 1, Sub Menus: 2) ──────────

  it('shows stats (Total Menus, Root Menus, Sub Menus)', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    fireEvent.click(screen.getByText('USSD Management'));
    await waitFor(() => {
      expect(screen.getByText('Total Menus')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Root Menus')).toBeInTheDocument();
    expect(screen.getByText('Sub Menus')).toBeInTheDocument();
    // Wait for data-driven stat values (3 total, 1 root, 2 sub)
    await waitFor(() => {
      const threeEls = screen.getAllByText('3');
      expect(threeEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  // ── 9. Shows "New Menu" button for admin ────────────────────────────────────

  it('shows "New Menu" button for admin', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    fireEvent.click(screen.getByText('USSD Management'));
    await waitFor(() => {
      expect(screen.getByText('New Menu')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 10. Switching to Activity Analytics tab shows summaries table ───────────

  it('switching to Activity Analytics tab shows summaries table', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    fireEvent.click(screen.getByText('Activity Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Activity Summaries')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Wait for data to load before checking column headers
    await waitFor(() => {
      const dailyEls = screen.getAllByText('DAILY');
      expect(dailyEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
    // Column headers - some may appear in multiple places
    const customerIdEls = screen.getAllByText('Customer ID');
    expect(customerIdEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Period')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  // ── 11. Shows summary stats and data ────────────────────────────────────────

  it('shows summary stats and data', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    fireEvent.click(screen.getByText('Activity Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Summary Records')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Wait for data to load
    await waitFor(() => {
      const dailyElements = screen.getAllByText('DAILY');
      expect(dailyElements.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });
    // Customer IDs may appear in multiple places (table + stat cards)
    const hundredEls = screen.getAllByText('100');
    expect(hundredEls.length).toBeGreaterThanOrEqual(1);
    const twoHundredEls = screen.getAllByText('200');
    expect(twoHundredEls.length).toBeGreaterThanOrEqual(1);
  });

  // ── 12. Shows "Generate Summary" and "View Raw Logs" buttons ────────────────

  it('shows "Generate Summary" and "View Raw Logs" buttons', async () => {
    setupHandlers();
    renderWithProviders(<DigitalBankingPage />);
    fireEvent.click(screen.getByText('Activity Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Generate Summary')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('View Raw Logs')).toBeInTheDocument();
  });
});
