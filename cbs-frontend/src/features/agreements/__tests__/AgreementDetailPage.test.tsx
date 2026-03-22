import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { AgreementDetailPage } from '../pages/AgreementDetailPage';
import { createMockAgreement } from '@/test/factories/agreementFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function renderDetail(route = '/agreements/1', options: Record<string, unknown> = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/agreements/:id" element={<AgreementDetailPage />} />
    </Routes>,
    { route, ...options },
  );
}

function setupHandlers(agreement = createMockAgreement({ id: 1, status: 'ACTIVE' })) {
  server.use(
    http.get('/api/v1/agreements/:id', () => HttpResponse.json(wrap(agreement))),
    http.post('/api/v1/agreements/:number/activate', () =>
      HttpResponse.json(wrap(createMockAgreement({ ...agreement, status: 'ACTIVE' }))),
    ),
    http.post('/api/v1/agreements/:number/terminate', () =>
      HttpResponse.json(wrap(createMockAgreement({ ...agreement, status: 'TERMINATED' }))),
    ),
  );
}

describe('AgreementDetailPage', () => {
  it('renders loading state initially', () => {
    setupHandlers();
    renderDetail();
    expect(screen.getByText('Agreement Detail')).toBeInTheDocument();
  });

  it('displays agreement details after loading', async () => {
    const agreement = createMockAgreement({
      id: 1,
      status: 'ACTIVE',
      title: 'Master Service Agreement',
      agreementNumber: 'AGR-TEST-001',
      customerId: 1001,
    });
    setupHandlers(agreement);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('AGR-TEST-001')).toBeInTheDocument();
    });
  });

  it('shows terminate button for ACTIVE agreements when admin', async () => {
    const agreement = createMockAgreement({ id: 1, status: 'ACTIVE' });
    setupHandlers(agreement);
    renderDetail('/agreements/1', { user: { roles: ['CBS_ADMIN'] } });
    await waitFor(() => {
      expect(screen.getByText('Terminate')).toBeInTheDocument();
    });
  });

  it('shows activate button for DRAFT agreements', async () => {
    const agreement = createMockAgreement({ id: 1, status: 'DRAFT' });
    setupHandlers(agreement);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });
  });

  it('shows edit button for DRAFT agreements', async () => {
    const agreement = createMockAgreement({ id: 1, status: 'DRAFT' });
    setupHandlers(agreement);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('shows terminated alert for TERMINATED agreements', async () => {
    const agreement = createMockAgreement({
      id: 1,
      status: 'TERMINATED',
      terminationReason: 'Customer requested',
    });
    setupHandlers(agreement);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Agreement Terminated')).toBeInTheDocument();
      expect(screen.getByText('Customer requested')).toBeInTheDocument();
    });
  });

  it('shows expired alert for EXPIRED agreements', async () => {
    const agreement = createMockAgreement({ id: 1, status: 'EXPIRED' });
    setupHandlers(agreement);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Agreement Expired')).toBeInTheDocument();
    });
  });

  it('shows suspended alert for SUSPENDED agreements', async () => {
    const agreement = createMockAgreement({ id: 1, status: 'SUSPENDED' });
    setupHandlers(agreement);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Agreement Suspended')).toBeInTheDocument();
    });
  });

  it('hides terminate button for non-admin users', async () => {
    const agreement = createMockAgreement({ id: 1, status: 'ACTIVE' });
    setupHandlers(agreement);
    renderDetail('/agreements/1', { user: { roles: ['CBS_OFFICER'] } });
    await waitFor(() => {
      expect(screen.getByText('Agreement Information')).toBeInTheDocument();
    });
    expect(screen.queryByText('Terminate')).not.toBeInTheDocument();
  });

  it('opens terminate dialog on button click', async () => {
    const agreement = createMockAgreement({ id: 1, status: 'ACTIVE' });
    setupHandlers(agreement);
    renderDetail('/agreements/1', { user: { roles: ['CBS_ADMIN'] } });
    await waitFor(() => {
      expect(screen.getByText('Terminate')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Terminate'));
    await waitFor(() => {
      expect(screen.getByText('Terminate Agreement')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter reason for termination...')).toBeInTheDocument();
    });
  });

  it('displays description when present', async () => {
    const agreement = createMockAgreement({
      id: 1,
      description: 'This is a detailed description of the agreement',
    });
    setupHandlers(agreement);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('This is a detailed description of the agreement')).toBeInTheDocument();
    });
  });
});
