import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { AgreementCreatePage } from '../pages/AgreementCreatePage';
import { createMockAgreement, createMockAgreementTemplate } from '@/test/factories/agreementFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockTemplates = [
  createMockAgreementTemplate({ id: 1, name: 'Master Service Template', type: 'MASTER_SERVICE', isActive: true }),
  createMockAgreementTemplate({ id: 2, name: 'NDA Template', type: 'NDA', isActive: true }),
  createMockAgreementTemplate({ id: 3, name: 'Inactive Template', type: 'GENERAL', isActive: false }),
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/agreement-templates', () => HttpResponse.json(wrap(mockTemplates))),
    http.post('/api/v1/agreements', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(wrap(createMockAgreement({ id: 99, ...body })), { status: 201 });
    }),
  );
}

describe('AgreementCreatePage', () => {
  it('renders stepper and template selection', () => {
    setupHandlers();
    renderWithProviders(<AgreementCreatePage />);
    expect(screen.getByText('New Agreement')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('shows Start from Scratch option', () => {
    setupHandlers();
    renderWithProviders(<AgreementCreatePage />);
    expect(screen.getByText('Start from Scratch')).toBeInTheDocument();
  });

  it('loads and shows active templates', async () => {
    setupHandlers();
    renderWithProviders(<AgreementCreatePage />);
    await waitFor(() => {
      expect(screen.getByText('Master Service Template')).toBeInTheDocument();
      expect(screen.getByText('NDA Template')).toBeInTheDocument();
    });
    // Should NOT show inactive template
    expect(screen.queryByText('Inactive Template')).not.toBeInTheDocument();
  });

  it('navigates to form step on template selection', async () => {
    setupHandlers();
    renderWithProviders(<AgreementCreatePage />);
    await waitFor(() => {
      expect(screen.getByText('Master Service Template')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Master Service Template'));
    await waitFor(() => {
      expect(screen.getByText('Pre-filled from template:')).toBeInTheDocument();
      expect(screen.getByText('Agreement Type')).toBeInTheDocument();
    });
  });

  it('navigates to form step on Start from Scratch', async () => {
    setupHandlers();
    renderWithProviders(<AgreementCreatePage />);
    fireEvent.click(screen.getByText('Start from Scratch'));
    await waitFor(() => {
      expect(screen.getByText('Agreement Details')).toBeInTheDocument();
    });
  });

  it('has skip to form link', () => {
    setupHandlers();
    renderWithProviders(<AgreementCreatePage />);
    expect(screen.getByText('Skip to form')).toBeInTheDocument();
  });

  it('validates required fields before proceeding to review', async () => {
    setupHandlers();
    renderWithProviders(<AgreementCreatePage />);
    // Go to form step
    fireEvent.click(screen.getByText('Start from Scratch'));
    await waitFor(() => {
      expect(screen.getByText('Agreement Details')).toBeInTheDocument();
    });
    // Try to submit without required fields
    fireEvent.click(screen.getByText('Continue to Review'));
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Customer ID is required')).toBeInTheDocument();
      expect(screen.getByText('Effective from date is required')).toBeInTheDocument();
    });
  });
});
