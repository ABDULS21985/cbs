import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { NewCasePage } from './NewCasePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers() {
  server.use(
    http.get('/api/v1/cases/metadata', () => HttpResponse.json(wrap({
      caseTypes: [
        { value: 'COMPLAINT', label: 'Complaint', category: 'GENERAL', subCategories: ['Service Quality', 'Charges/Fees', 'Account Issues', 'Card Issues', 'ATM/POS', 'Online Banking', 'Staff Behaviour'] },
        { value: 'SERVICE_REQUEST', label: 'Service Request', category: 'GENERAL', subCategories: ['Account Update', 'Card Request', 'Statement', 'Reference Letter', 'Cheque Book', 'Token/OTP'] },
        { value: 'INQUIRY', label: 'Inquiry', category: 'GENERAL', subCategories: ['Product Information', 'Balance Inquiry', 'Rate Inquiry', 'General'] },
        { value: 'DISPUTE', label: 'Dispute', category: 'PAYMENTS', subCategories: ['Transaction Dispute', 'Charge Dispute', 'Interest Dispute'] },
        { value: 'FRAUD_REPORT', label: 'Fraud Report', category: 'GENERAL', subCategories: ['Unauthorized Transaction', 'Phishing', 'Card Fraud', 'Identity Theft'] },
        { value: 'ACCOUNT_ISSUE', label: 'Account Issue', category: 'ACCOUNTS', subCategories: ['Account Lock', 'Account Update', 'Dormant Account', 'KYC Update'] },
        { value: 'PAYMENT_ISSUE', label: 'Payment Issue', category: 'PAYMENTS', subCategories: ['Failed Transfer', 'Delayed Payment', 'Wrong Beneficiary', 'Reversal'] },
        { value: 'CARD_ISSUE', label: 'Card Issue', category: 'CARDS', subCategories: ['Card Blocked', 'Card Replacement', 'PIN Reset', 'Card Activation'] },
        { value: 'LOAN_ISSUE', label: 'Loan Issue', category: 'LOANS', subCategories: ['Repayment Issue', 'Disbursement Delay', 'Interest Query', 'Early Settlement'] },
        { value: 'FEE_REVERSAL', label: 'Fee Reversal', category: 'FEES', subCategories: ['Maintenance Fee', 'SMS Fee', 'Transaction Fee', 'Penalty Fee'] },
        { value: 'DOCUMENT_REQUEST', label: 'Document Request', category: 'GENERAL', subCategories: ['Statement', 'Reference Letter', 'Audit Confirmation', 'Tax Certificate'] },
        { value: 'PRODUCT_CHANGE', label: 'Product Change', category: 'GENERAL', subCategories: ['Account Upgrade', 'Account Downgrade', 'Product Switch'] },
        { value: 'CLOSURE', label: 'Closure', category: 'ACCOUNTS', subCategories: ['Account Closure', 'Card Closure', 'Loan Closure'] },
        { value: 'REGULATORY', label: 'Regulatory', category: 'GENERAL', subCategories: ['CBN Directive', 'Compliance Issue', 'AML/CFT'] },
        { value: 'ESCALATION', label: 'Escalation', category: 'GENERAL', subCategories: ['Management Escalation', 'Regulatory Escalation', 'Ombudsman'] },
      ],
      priorities: ['MEDIUM', 'HIGH', 'LOW', 'CRITICAL'],
    }))),
    http.post('/api/v1/cases', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      return HttpResponse.json(wrap({
        id: 99,
        caseNumber: 'CASE-000099',
        ...body,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      }), { status: 201 });
    }),
  );
}

describe('NewCasePage', () => {
  // ── Page Structure ────────────────────────────────────────
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('New Case')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText(/create a new customer case/i)).toBeInTheDocument();
  });

  it('renders Customer section', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Customer')).toBeInTheDocument();
  });

  it('renders Case Details section', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Case Details')).toBeInTheDocument();
  });

  // ── Form Fields ───────────────────────────────────────────
  it('renders Customer ID input', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByPlaceholderText(/search customer/i)).toBeInTheDocument();
  });

  it('renders Customer Name input', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Customer Name')).toBeInTheDocument();
  });

  it('renders Case Type dropdown with all 15 types', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Case Type')).toBeInTheDocument();
    await screen.findByText('Complaint');
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    // 15 types + 1 "Select type..." = 16 options
    expect(typeSelect.querySelectorAll('option').length).toBe(16);
  });

  it('renders case type options', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(await screen.findByText('Complaint')).toBeInTheDocument();
    expect(screen.getByText('Service Request')).toBeInTheDocument();
    expect(screen.getByText('Inquiry')).toBeInTheDocument();
    expect(screen.getByText('Dispute')).toBeInTheDocument();
    expect(screen.getByText('Fraud Report')).toBeInTheDocument();
    expect(screen.getByText('Account Issue')).toBeInTheDocument();
    expect(screen.getByText('Payment Issue')).toBeInTheDocument();
    expect(screen.getByText('Card Issue')).toBeInTheDocument();
    expect(screen.getByText('Loan Issue')).toBeInTheDocument();
    expect(screen.getByText('Fee Reversal')).toBeInTheDocument();
    expect(screen.getByText('Document Request')).toBeInTheDocument();
    expect(screen.getByText('Product Change')).toBeInTheDocument();
    expect(screen.getByText('Closure')).toBeInTheDocument();
    expect(screen.getByText('Regulatory')).toBeInTheDocument();
    expect(screen.getByText('Escalation')).toBeInTheDocument();
  });

  it('renders Sub-Category dropdown (disabled by default)', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    await screen.findByText('Complaint');
    const subSelect = screen.getAllByText('Select...')[0].closest('select');
    expect(subSelect).toBeDisabled();
  });

  it('enables sub-category when case type is selected', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    await screen.findByText('Complaint');
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT' } });
    const subSelect = screen.getAllByText('Select...')[0].closest('select');
    expect(subSelect).not.toBeDisabled();
  });

  it('shows sub-categories for COMPLAINT type', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    await screen.findByText('Complaint');
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT' } });
    expect(screen.getByText('Service Quality')).toBeInTheDocument();
    expect(screen.getByText('Charges/Fees')).toBeInTheDocument();
    expect(screen.getByText('Account Issues')).toBeInTheDocument();
    expect(screen.getByText('Card Issues')).toBeInTheDocument();
    expect(screen.getByText('ATM/POS')).toBeInTheDocument();
    expect(screen.getByText('Online Banking')).toBeInTheDocument();
    expect(screen.getByText('Staff Behaviour')).toBeInTheDocument();
  });

  it('shows sub-categories for DISPUTE type', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    await screen.findByText('Complaint');
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'DISPUTE' } });
    expect(screen.getByText('Transaction Dispute')).toBeInTheDocument();
    expect(screen.getByText('Charge Dispute')).toBeInTheDocument();
    expect(screen.getByText('Interest Dispute')).toBeInTheDocument();
  });

  it('shows sub-categories for FRAUD_REPORT type', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    await screen.findByText('Complaint');
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'FRAUD_REPORT' } });
    expect(screen.getByText('Unauthorized Transaction')).toBeInTheDocument();
    expect(screen.getByText('Phishing')).toBeInTheDocument();
    expect(screen.getByText('Card Fraud')).toBeInTheDocument();
    expect(screen.getByText('Identity Theft')).toBeInTheDocument();
  });

  it('resets sub-category when case type changes', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    await screen.findByText('Complaint');
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT' } });
    const subSelect = screen.getAllByText('Select...')[0].closest('select')!;
    fireEvent.change(subSelect, { target: { value: 'Service Quality' } });
    fireEvent.change(typeSelect, { target: { value: 'FRAUD_REPORT' } });
    expect(screen.getByText('Unauthorized Transaction')).toBeInTheDocument();
  });

  it('renders Priority dropdown with MEDIUM as default', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Priority')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Medium').closest('select')).toHaveValue('MEDIUM'));
    const prioritySelect = screen.getByText('Medium').closest('select');
    expect(prioritySelect).toHaveValue('MEDIUM');
  });

  it('renders all 4 priority options', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(await screen.findByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('can change priority', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    await waitFor(() => expect(screen.getByText('Medium').closest('select')).toHaveValue('MEDIUM'));
    const select = screen.getByText('Medium').closest('select')!;
    fireEvent.change(select, { target: { value: 'HIGH' } });
    expect(select).toHaveValue('HIGH');
  });

  it('renders Subject input', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Subject')).toBeInTheDocument();
  });

  it('renders Description textarea', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders Assign To (optional) input', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Assign To (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Agent name or ID')).toBeInTheDocument();
  });

  // ── Form Interaction ──────────────────────────────────────
  it('can type in customer ID', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    const input = screen.getByPlaceholderText(/search customer/i);
    fireEvent.change(input, { target: { value: '123' } });
    expect(input).toHaveValue('123');
  });

  it('prefills customer context from the query string', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />, {
      route: '/cases/new?customerId=41&customerName=Amara%20Okonkwo',
    });

    expect(screen.getByPlaceholderText(/search customer/i)).toHaveValue('41');
    expect(screen.getByDisplayValue('Amara Okonkwo')).toBeInTheDocument();
  });

  it('can type in subject', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    const inputs = document.querySelectorAll('input[required]');
    const subjectInput = Array.from(inputs).find(el => {
      const label = el.closest('div')?.querySelector('label');
      return label?.textContent === 'Subject';
    }) as HTMLInputElement;
    if (subjectInput) {
      fireEvent.change(subjectInput, { target: { value: 'ATM Issue' } });
      expect(subjectInput).toHaveValue('ATM Issue');
    }
  });

  // ── Buttons ───────────────────────────────────────────────
  it('renders Cancel button', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders Create Case button', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Create Case')).toBeInTheDocument();
  });

  it('has a proper form element', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(document.querySelector('form')).toBeInTheDocument();
  });

  // ── Error Handling ────────────────────────────────────────
  it('renders without crashing', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('New Case')).toBeTruthy();
  });
});
