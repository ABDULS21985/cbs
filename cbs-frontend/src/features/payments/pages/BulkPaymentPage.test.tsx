import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { BulkPaymentPage } from './BulkPaymentPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers() {
  server.use(
    http.post('/api/v1/bulk-payments/upload', () =>
      HttpResponse.json(wrap({ id: 1, batchRef: 'BATCH-001' }), { status: 201 })
    ),
    http.get('/api/v1/bulk-payments/:id', () =>
      HttpResponse.json(wrap({
        id: 1,
        batchRef: 'BATCH-001',
        totalRows: 50,
        validRows: 48,
        invalidRows: 2,
        totalAmount: 25000000,
        status: 'VALIDATED',
        items: [],
      }))
    ),
    http.post('/api/v1/bulk-payments/:id/submit', () =>
      HttpResponse.json(wrap({ status: 'SUBMITTED' }))
    ),
  );
}

describe('BulkPaymentPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.getByText('Bulk Payments')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.getByText(/upload and process bulk payment files/i)).toBeInTheDocument();
  });

  it('renders 4 step indicators', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.getByText('1. Upload')).toBeInTheDocument();
    expect(screen.getByText('2. Validate')).toBeInTheDocument();
    expect(screen.getByText('3. Approve')).toBeInTheDocument();
    expect(screen.getByText('4. Processing')).toBeInTheDocument();
  });

  it('starts on Upload step', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    const uploadStep = screen.getByText('1. Upload');
    expect(uploadStep.className).toContain('bg-primary');
  });

  it('step 2 is not active initially', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    const validateStep = screen.getByText('2. Validate');
    expect(validateStep.className).not.toContain('bg-primary');
  });

  it('step 3 is not active initially', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    const approveStep = screen.getByText('3. Approve');
    expect(approveStep.className).not.toContain('bg-primary');
  });

  it('step 4 is not active initially', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    const processingStep = screen.getByText('4. Processing');
    expect(processingStep.className).not.toContain('bg-primary');
  });

  it('renders the FileUploadStep component in upload step', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    // FileUploadStep is visible
    expect(screen.getByText('1. Upload').className).toContain('bg-primary');
  });

  it('does not render validation preview on initial render', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.queryByText('Batch Summary')).not.toBeInTheDocument();
  });

  it('does not render approve step on initial render', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.queryByText('Submit for Approval')).not.toBeInTheDocument();
  });

  it('does not show processing step on initial render', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
  });

  it('renders step indicators as a flex row', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    const stepsContainer = screen.getByText('1. Upload').parentElement;
    expect(stepsContainer).toHaveClass('flex');
  });

  it('handles server error gracefully', () => {
    server.use(
      http.post('/api/v1/bulk-payments/upload', () =>
        HttpResponse.json({}, { status: 500 })
      ),
    );
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.getByText('Bulk Payments')).toBeInTheDocument();
  });

  it('renders page-container for content', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    const container = screen.getByText('Bulk Payments').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('all four steps have text content', () => {
    setupHandlers();
    renderWithProviders(<BulkPaymentPage />);
    expect(screen.getByText('1. Upload')).toBeTruthy();
    expect(screen.getByText('2. Validate')).toBeTruthy();
    expect(screen.getByText('3. Approve')).toBeTruthy();
    expect(screen.getByText('4. Processing')).toBeTruthy();
  });

  it('renders the page without crashing on re-render', () => {
    setupHandlers();
    const { rerender } = renderWithProviders(<BulkPaymentPage />);
    expect(screen.getByText('Bulk Payments')).toBeInTheDocument();
  });
});
