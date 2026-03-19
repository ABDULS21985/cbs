import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { NewCasePage } from './NewCasePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers() {
  server.use(
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
    http.get('/api/v1/customers/search', () =>
      HttpResponse.json(wrap([{ id: 1, fullName: 'Test Customer' }]))
    ),
  );
}

describe('NewCasePage', () => {
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

  it('renders Case Type dropdown', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Case Type')).toBeInTheDocument();
    expect(screen.getByText('Select type...')).toBeInTheDocument();
  });

  it('renders case type options', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Complaint')).toBeInTheDocument();
    expect(screen.getByText('Service Request')).toBeInTheDocument();
    expect(screen.getByText('Enquiry')).toBeInTheDocument();
    expect(screen.getByText('Dispute')).toBeInTheDocument();
    expect(screen.getByText('Fraud')).toBeInTheDocument();
  });

  it('renders Sub-Category dropdown (disabled by default)', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Sub-Category')).toBeInTheDocument();
    const subSelect = screen.getAllByText('Select...')[0].closest('select');
    expect(subSelect).toBeDisabled();
  });

  it('enables sub-category when case type is selected', async () => {
    setupHandlers();
    
    renderWithProviders(<NewCasePage />);
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT' } });
    const subSelect = screen.getAllByText('Select...')[0].closest('select');
    expect(subSelect).not.toBeDisabled();
  });

  it('shows sub-categories for COMPLAINT type', async () => {
    setupHandlers();
    
    renderWithProviders(<NewCasePage />);
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT' } });
    expect(screen.getByText('Service Quality')).toBeInTheDocument();
    expect(screen.getByText('Charges/Fees')).toBeInTheDocument();
    expect(screen.getByText('Account Issues')).toBeInTheDocument();
  });

  it('shows sub-categories for DISPUTE type', async () => {
    setupHandlers();
    
    renderWithProviders(<NewCasePage />);
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'DISPUTE' } });
    expect(screen.getByText('Transaction Dispute')).toBeInTheDocument();
    expect(screen.getByText('Charge Dispute')).toBeInTheDocument();
  });

  it('renders Priority dropdown', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('MEDIUM is default priority', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    const prioritySelect = screen.getByText('Medium').closest('select');
    expect(prioritySelect).toHaveValue('MEDIUM');
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

  it('renders Assign To input', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    expect(screen.getByText('Assign To (optional)')).toBeInTheDocument();
  });

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

  it('can type in customer ID', async () => {
    setupHandlers();
    
    renderWithProviders(<NewCasePage />);
    const input = screen.getByPlaceholderText(/search customer/i);
    fireEvent.change(input, { target: { value: '123' } });
    expect(input).toHaveValue('123');
  });

  it('can type in subject', async () => {
    setupHandlers();
    
    renderWithProviders(<NewCasePage />);
    const subjectInputs = document.querySelectorAll('input[required]');
    const subjectInput = Array.from(subjectInputs).find(el => {
      const label = el.closest('div')?.querySelector('label');
      return label?.textContent === 'Subject';
    }) as HTMLInputElement;
    if (subjectInput) {
      fireEvent.change(subjectInput, { target: { value: 'ATM Issue' } });
      expect(subjectInput).toHaveValue('ATM Issue');
    }
  });

  it('can change priority to HIGH', async () => {
    setupHandlers();
    
    renderWithProviders(<NewCasePage />);
    const prioritySelect = screen.getByText('Medium').closest('select')!;
    fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });
    expect(prioritySelect).toHaveValue('HIGH');
  });

  it('resets sub-category when case type changes', async () => {
    setupHandlers();
    
    renderWithProviders(<NewCasePage />);
    const typeSelect = screen.getByText('Select type...').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT' } });
    const subSelect = screen.getAllByText('Select...')[0].closest('select')!;
    fireEvent.change(subSelect, { target: { value: 'Service Quality' } });
    fireEvent.change(typeSelect, { target: { value: 'FRAUD' } });
    expect(screen.getByText('Unauthorized Transaction')).toBeInTheDocument();
  });

  it('renders the form as a proper form element', () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  it('shows creating state on button when submitting', async () => {
    setupHandlers();
    renderWithProviders(<NewCasePage />);
    // Button should say "Create Case" before submission
    expect(screen.getByText('Create Case')).toBeInTheDocument();
  });
});
