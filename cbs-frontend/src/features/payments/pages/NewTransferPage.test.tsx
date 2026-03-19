import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { NewTransferPage } from './NewTransferPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAccounts = [
  { id: 1, accountNumber: '0123456789', accountName: 'Adeola Johnson', accountType: 'SAVINGS', availableBalance: 5000000, currency: 'NGN' },
  { id: 2, accountNumber: '0234567890', accountName: 'TechVentures Ltd', accountType: 'CURRENT', availableBalance: 12000000, currency: 'NGN' },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/accounts/selector', () =>
      HttpResponse.json(mockAccounts)
    ),
    http.get('/api/v1/accounts', () =>
      HttpResponse.json(wrap(mockAccounts))
    ),
    http.get('/api/v1/beneficiaries', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/payments/recent', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/payments/fee-preview', () =>
      HttpResponse.json(wrap({ transferFee: 52.50, vat: 3.94, totalFee: 56.44, totalDebit: 50056.44 }))
    ),
    http.post('/api/v1/payments/name-enquiry', () =>
      HttpResponse.json(wrap({ accountNumber: '0987654321', accountName: 'CHIDI OKAFOR', bankCode: '044', bankName: 'Access Bank', verified: true }))
    ),
    http.get('/api/v1/payments/check-duplicate', () =>
      HttpResponse.json(wrap({ isDuplicate: false }))
    ),
    http.post('/api/v1/payments/check-duplicate', () =>
      HttpResponse.json(wrap({ isDuplicate: false }))
    ),
    http.get('/api/v1/banks', () =>
      HttpResponse.json(wrap([
        { code: '044', name: 'Access Bank' },
        { code: '058', name: 'GTBank' },
      ]))
    ),
    http.post('/api/v1/payments/transfer', () =>
      HttpResponse.json(wrap({ id: 1, transactionRef: 'TXN-123456', status: 'SUCCESSFUL', amount: 50000, currency: 'NGN' }), { status: 201 })
    ),
  );
}

describe('NewTransferPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('New Transfer')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText(/initiate a fund transfer/i)).toBeInTheDocument();
  });

  it('renders "From Account" label', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('From Account')).toBeInTheDocument();
  });

  it('renders account selector with default option', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Select account...')).toBeInTheDocument();
  });

  it('renders transfer type radio buttons', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Own Account')).toBeInTheDocument();
    expect(screen.getByText('Within BellBank')).toBeInTheDocument();
    expect(screen.getByText('Other Bank (NIP)')).toBeInTheDocument();
    expect(screen.getByText('International')).toBeInTheDocument();
  });

  it('renders the "Transfer To" label', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Transfer To')).toBeInTheDocument();
  });

  it('renders the Amount label', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders the Narration label', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Narration')).toBeInTheDocument();
  });

  it('renders the narration input', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByPlaceholderText('Payment description')).toBeInTheDocument();
  });

  it('renders Immediate and Schedule radio buttons', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Immediate')).toBeInTheDocument();
    expect(screen.getByText('Schedule for later')).toBeInTheDocument();
  });

  it('renders the Review Transfer button', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText(/review transfer/i)).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('can type in narration field', async () => {
    setupHandlers();
    
    renderWithProviders(<NewTransferPage />);
    const narration = screen.getByPlaceholderText('Payment description');
    fireEvent.change(narration, { target: { value: 'Monthly rent' } });
    expect(narration).toHaveValue('Monthly rent');
  });

  it('can switch transfer type to NIP', async () => {
    setupHandlers();
    
    renderWithProviders(<NewTransferPage />);
    fireEvent.click(screen.getByText('Other Bank (NIP)'));
    const nipRadio = screen.getByDisplayValue('NIP');
    expect(nipRadio).toBeChecked();
  });

  it('can switch transfer type to Own Account', async () => {
    setupHandlers();
    
    renderWithProviders(<NewTransferPage />);
    fireEvent.click(screen.getByText('Own Account'));
    const ownRadio = screen.getByDisplayValue('OWN_ACCOUNT');
    expect(ownRadio).toBeChecked();
  });

  it('renders Transfer Details section', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Transfer Details')).toBeInTheDocument();
  });

  it('INTERNAL is selected by default', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    const internalRadio = screen.getByDisplayValue('INTERNAL');
    expect(internalRadio).toBeChecked();
  });

  it('Immediate is selected by default', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    const radios = screen.getAllByRole('radio');
    const immediateRadio = radios.find(r => {
      const label = r.closest('label');
      return label && label.textContent?.includes('Immediate');
    });
    expect(immediateRadio).toBeChecked();
  });

  it('shows schedule date input when Schedule for later is selected', async () => {
    setupHandlers();
    
    renderWithProviders(<NewTransferPage />);
    fireEvent.click(screen.getByText('Schedule for later'));
    const dateInput = document.querySelector('input[type="datetime-local"]');
    expect(dateInput).toBeInTheDocument();
  });

  it('handles Cancel button click', async () => {
    setupHandlers();
    
    renderWithProviders(<NewTransferPage />);
    const narration = screen.getByPlaceholderText('Payment description');
    fireEvent.change(narration, { target: { value: 'some text' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(narration).toHaveValue('');
  });

  it('renders the Transfer Details form section', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    expect(screen.getByText('Transfer Details')).toBeInTheDocument();
  });

  it('can switch to International transfer type', async () => {
    setupHandlers();
    
    renderWithProviders(<NewTransferPage />);
    fireEvent.click(screen.getByText('International'));
    const swiftRadio = screen.getByDisplayValue('SWIFT');
    expect(swiftRadio).toBeChecked();
  });

  it('renders the sidebar recent transfers section', () => {
    setupHandlers();
    renderWithProviders(<NewTransferPage />);
    // RecentTransfersList component renders in sidebar
  });
});
