import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionSearchForm } from '../components/TransactionSearchForm';
import type { TransactionFilters } from '../hooks/useTransactionSearch';

const defaultFilters: TransactionFilters = {
  search: '',
  accountNumber: '',
  customerId: '',
  dateFrom: '',
  dateTo: '',
  amountFrom: 0,
  amountTo: 0,
  type: 'ALL',
  channel: 'ALL',
  status: 'ALL',
  flaggedOnly: false,
  page: 0,
  pageSize: 20,
  sortBy: 'postingDate',
  sortDirection: 'desc',
};

function renderForm(overrides?: {
  initialFilters?: Partial<TransactionFilters>;
  onSearch?: () => void;
  onResetSpy?: () => void;
}) {
  const onSearch = overrides?.onSearch ?? vi.fn();
  const onResetSpy = overrides?.onResetSpy ?? vi.fn();

  function Harness() {
    const [filters, setFilters] = useState<TransactionFilters>({
      ...defaultFilters,
      ...overrides?.initialFilters,
    });

    return (
      <TransactionSearchForm
        filters={filters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onSearch={onSearch}
        onReset={() => {
          onResetSpy();
          setFilters(defaultFilters);
        }}
        isLoading={false}
      />
    );
  }

  return {
    user: userEvent.setup(),
    onSearch,
    onResetSpy,
    ...render(<Harness />),
  };
}

describe('TransactionSearchForm', () => {
  it('renders all filter inputs', async () => {
    const { user } = renderForm();

    expect(screen.getByLabelText(/search query/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show filters/i }));

    expect(screen.getByLabelText(/account number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer id \/ name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^channel$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show flagged only/i)).toBeInTheDocument();
  });

  it('validates date range: from < to', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: /show filters/i }));
    await user.type(screen.getByLabelText(/date from/i), '2026-03-20');
    await user.type(screen.getByLabelText(/date to/i), '2026-03-10');

    expect(screen.getByText(/start date must be before end date/i)).toBeInTheDocument();
  });

  it('validates amount range: amountFrom < amountTo', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: /show filters/i }));
    await user.type(screen.getByLabelText(/amount from/i), '5000');
    await user.type(screen.getByLabelText(/amount to/i), '1000');

    expect(screen.getByText(/minimum amount must be less than maximum/i)).toBeInTheDocument();
  });

  it('Enter key triggers onSearch callback', async () => {
    const onSearch = vi.fn();
    const { user } = renderForm({ onSearch });

    await user.type(screen.getByLabelText(/search query/i), 'rent{Enter}');

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('Reset clears all fields and calls onReset', async () => {
    const onResetSpy = vi.fn();
    const { user } = renderForm({
      initialFilters: {
        search: 'rent',
        accountNumber: '0123456789',
      },
      onResetSpy,
    });

    await user.click(screen.getByRole('button', { name: /show filters/i }));
    expect(screen.getByLabelText(/search query/i)).toHaveValue('rent');
    expect(screen.getByLabelText(/account number/i)).toHaveValue('0123456789');

    await user.click(screen.getByRole('button', { name: /^reset$/i }));

    expect(onResetSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/search query/i)).toHaveValue('');
    expect(screen.getByLabelText(/account number/i)).toHaveValue('');
  });

  it('Advanced filters expand/collapse on toggle', async () => {
    const { user } = renderForm();

    expect(screen.queryByLabelText(/account number/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show filters/i }));
    expect(screen.getByLabelText(/account number/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide filters/i }));
    expect(screen.queryByLabelText(/account number/i)).not.toBeInTheDocument();
  });
});
