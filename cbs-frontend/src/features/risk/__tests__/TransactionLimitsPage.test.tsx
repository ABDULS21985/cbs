import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { TransactionLimitsPage } from '../pages/TransactionLimitsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

describe('TransactionLimitsPage', () => {
  it('renders page header', () => {
    renderWithProviders(<TransactionLimitsPage />);
    expect(screen.getByText('Transaction Limits')).toBeInTheDocument();
  });

  it('shows New Limit button', () => {
    renderWithProviders(<TransactionLimitsPage />);
    expect(screen.getByText('New Limit')).toBeInTheDocument();
  });

  it('renders account search form', () => {
    renderWithProviders(<TransactionLimitsPage />);
    expect(screen.getByPlaceholderText('Enter Account ID to view limits...')).toBeInTheDocument();
    expect(screen.getByText('Load Limits')).toBeInTheDocument();
  });

  it('shows empty state before account search', () => {
    renderWithProviders(<TransactionLimitsPage />);
    expect(screen.getByText('Enter an Account ID to view configured limits')).toBeInTheDocument();
  });

  it('handles account search form submission', async () => {
    server.use(
      http.get('/api/v1/limits/account/:accountId', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/limits/usage/:accountId/:limitType', () => HttpResponse.json(wrap(null))),
    );
    renderWithProviders(<TransactionLimitsPage />);

    const input = screen.getByPlaceholderText('Enter Account ID to view limits...');
    fireEvent.change(input, { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Load Limits'));

    await waitFor(() => {
      expect(screen.queryByText('Enter an Account ID to view configured limits')).not.toBeInTheDocument();
    });
  });
});
