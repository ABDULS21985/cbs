import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import GeneralLedgerPage from '../pages/GeneralLedgerPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = {
  data: [
    { id: 1, glCode: '1000', glName: 'Assets', glCategory: 'ASSET', parentGlCode: null, levelNumber: 1, isHeader: true, isPostable: false, currencyCode: 'NGN', normalBalance: 'DEBIT', isActive: true },
    { id: 2, glCode: '1100', glName: 'Cash and Bank Balances', glCategory: 'ASSET', parentGlCode: '1000', levelNumber: 2, isHeader: false, isPostable: true, currencyCode: 'NGN', normalBalance: 'DEBIT', isActive: true },
    { id: 3, glCode: '2000', glName: 'Liabilities', glCategory: 'LIABILITY', parentGlCode: null, levelNumber: 1, isHeader: true, isPostable: false, currencyCode: 'NGN', normalBalance: 'CREDIT', isActive: true },
    { id: 4, glCode: '2100', glName: 'Customer Deposits', glCategory: 'LIABILITY', parentGlCode: '2000', levelNumber: 2, isHeader: false, isPostable: true, currencyCode: 'NGN', normalBalance: 'CREDIT', isActive: true },
  ],
};

const MOCK_BALANCES = {
  data: [
    { id: 1, glCode: '1100', branchCode: 'HEAD', currencyCode: 'NGN', balanceDate: '2026-03-22', openingBalance: 1000000, debitTotal: 50000, creditTotal: 30000, closingBalance: 1020000, transactionCount: 15 },
    { id: 2, glCode: '2100', branchCode: 'HEAD', currencyCode: 'NGN', balanceDate: '2026-03-22', openingBalance: 5000000, debitTotal: 100000, creditTotal: 200000, closingBalance: 5100000, transactionCount: 25 },
  ],
};

const MOCK_JOURNALS = {
  data: [
    { id: 1, journalNumber: 'JN0000000000001', journalType: 'MANUAL', description: 'Test journal entry', valueDate: '2026-03-22', postingDate: '2026-03-22', status: 'POSTED', totalDebit: 10000, totalCredit: 10000, createdBy: 'admin', createdAt: '2026-03-22T10:00:00Z', lines: [] },
    { id: 2, journalNumber: 'JN0000000000002', journalType: 'SYSTEM', description: 'Interest accrual', valueDate: '2026-03-22', postingDate: '2026-03-22', status: 'POSTED', totalDebit: 5000, totalCredit: 5000, createdBy: 'system', createdAt: '2026-03-22T11:00:00Z', lines: [] },
  ],
};

const MOCK_TRIAL_BALANCE = {
  data: [
    { id: 1, glCode: '1100', branchCode: 'HEAD', currencyCode: 'NGN', balanceDate: '2026-03-22', openingBalance: 1000000, debitTotal: 50000, creditTotal: 30000, closingBalance: 1020000, transactionCount: 15 },
    { id: 2, glCode: '2100', branchCode: 'HEAD', currencyCode: 'NGN', balanceDate: '2026-03-22', openingBalance: 5000000, debitTotal: 100000, creditTotal: 200000, closingBalance: 5100000, transactionCount: 25 },
  ],
};

const MOCK_RECON = {
  data: [
    { id: 1, reconDate: '2026-03-22', subledgerType: 'LOANS', glCode: '1300', branchCode: 'HEAD', currencyCode: 'NGN', glBalance: 500000, subledgerBalance: 500000, difference: 0, isBalanced: true, exceptionCount: 0, status: 'COMPLETED', createdAt: '2026-03-22T12:00:00Z' },
    { id: 2, reconDate: '2026-03-22', subledgerType: 'DEPOSITS', glCode: '2100', branchCode: 'HEAD', currencyCode: 'NGN', glBalance: 5100000, subledgerBalance: 5099500, difference: 500, isBalanced: false, exceptionCount: 1, status: 'COMPLETED', createdAt: '2026-03-22T12:00:00Z' },
  ],
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/gl/accounts', () => HttpResponse.json(MOCK_ACCOUNTS)),
    http.get('/api/v1/gl/balances', () => HttpResponse.json(MOCK_BALANCES)),
    http.get('/api/v1/gl/journals', () => HttpResponse.json(MOCK_JOURNALS)),
    http.get('/api/v1/gl/trial-balance/:date', () => HttpResponse.json(MOCK_TRIAL_BALANCE)),
    http.get('/api/v1/gl/reconciliation/:date', () => HttpResponse.json(MOCK_RECON)),
    http.post('/api/v1/gl/accounts', () =>
      HttpResponse.json({ data: MOCK_ACCOUNTS.data[1] }, { status: 201 }),
    ),
    http.post('/api/v1/gl/journals', () =>
      HttpResponse.json({ data: MOCK_JOURNALS.data[0] }, { status: 201 }),
    ),
    http.post('/api/v1/gl/journals/:id/reverse', () =>
      HttpResponse.json({ data: { ...MOCK_JOURNALS.data[0], status: 'REVERSED' } }),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GeneralLedgerPage', () => {
  it('renders page header "General Ledger"', () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    expect(screen.getByText('General Ledger')).toBeInTheDocument();
  });

  it('shows all five tabs: Chart of Accounts, Balances, Journal Entries, Trial Balance, Reconciliation', () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    expect(screen.getByText('Chart of Accounts')).toBeInTheDocument();
    expect(screen.getByText(/balances/i)).toBeInTheDocument();
    expect(screen.getByText(/journal/i)).toBeInTheDocument();
    expect(screen.getByText(/trial balance/i)).toBeInTheDocument();
    expect(screen.getByText(/reconciliation/i)).toBeInTheDocument();
  });

  it('Chart of Accounts tab displays tree of GL accounts', async () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    await waitFor(() => {
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Liabilities')).toBeInTheDocument();
    });
  });

  it('GL Balances tab shows balance data', async () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    fireEvent.click(screen.getByText(/balances/i));
    await waitFor(() => {
      expect(screen.getByText('1100')).toBeInTheDocument();
    });
  });

  it('Journal Entries tab shows journal list', async () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    fireEvent.click(screen.getByText(/journal/i));
    await waitFor(() => {
      expect(screen.getByText('JN0000000000001')).toBeInTheDocument();
    });
  });

  it('Journal Entries tab shows New Journal button', async () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    fireEvent.click(screen.getByText(/journal/i));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new journal|manual journal|post journal/i })).toBeInTheDocument();
    });
  });

  it('Trial Balance tab shows balance rows', async () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    fireEvent.click(screen.getByText(/trial balance/i));
    await waitFor(() => {
      expect(screen.getByText('1100')).toBeInTheDocument();
    });
  });

  it('Reconciliation tab shows matched and break rows', async () => {
    setupHandlers();
    renderWithProviders(<GeneralLedgerPage />);
    fireEvent.click(screen.getByText(/reconciliation/i));
    await waitFor(() => {
      expect(screen.getByText('LOANS')).toBeInTheDocument();
      expect(screen.getByText('DEPOSITS')).toBeInTheDocument();
    });
  });
});
