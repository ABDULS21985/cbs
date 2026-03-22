import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CallbackPage } from '../pages/CallbackPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCallbacks = [
  { id: 1, customerId: 1001, callbackNumber: '+2341234567890', preferredTime: '2026-03-22T14:00:00Z', preferredLanguage: 'en', contactReason: 'ACCOUNT_INQUIRY', urgency: 'HIGH', assignedAgentId: 'agent-1', attemptCount: 1, maxAttempts: 3, lastAttemptAt: '2026-03-22T10:00:00Z', lastOutcome: 'NO_ANSWER', status: 'SCHEDULED' },
  { id: 2, customerId: 1002, callbackNumber: '+2349876543210', preferredTime: '2026-03-22T15:00:00Z', preferredLanguage: 'en', contactReason: 'GENERAL', urgency: 'MEDIUM', assignedAgentId: null, attemptCount: 0, maxAttempts: 3, lastAttemptAt: null, lastOutcome: null, status: 'PENDING' },
  { id: 3, customerId: 1003, callbackNumber: '+2341112223333', preferredTime: '2026-03-21T10:00:00Z', preferredLanguage: 'ha', contactReason: 'COMPLAINT', urgency: 'LOW', assignedAgentId: 'agent-2', attemptCount: 3, maxAttempts: 3, lastAttemptAt: '2026-03-21T12:00:00Z', lastOutcome: 'ANSWERED', status: 'COMPLETED' },
];

function setupHandlers(callbacks = mockCallbacks) {
  server.use(
    http.get('/api/v1/contact-routing/callbacks', () => HttpResponse.json(wrap(callbacks))),
    http.post('/api/v1/contact-routing/callbacks', () => HttpResponse.json(wrap({ id: 4, status: 'SCHEDULED' }))),
    http.post('/api/v1/contact-routing/callbacks/:id/attempt', () => HttpResponse.json(wrap({ id: 1, status: 'COMPLETED', lastOutcome: 'ANSWERED' }))),
  );
}

describe('CallbackPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<CallbackPage />);
    expect(screen.getByText('Callback Management')).toBeInTheDocument();
  });

  it('renders Schedule Callback button', () => {
    setupHandlers();
    renderWithProviders(<CallbackPage />);
    expect(screen.getByText('Schedule Callback')).toBeInTheDocument();
  });

  it('displays stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CallbackPage />);
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed / Expired')).toBeInTheDocument();
  });

  it('renders status filter buttons', () => {
    setupHandlers();
    renderWithProviders(<CallbackPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('displays callback data in the table', async () => {
    setupHandlers();
    renderWithProviders(<CallbackPage />);
    await waitFor(() => {
      expect(screen.getByText('#1001')).toBeInTheDocument();
    });
    expect(screen.getByText('#1002')).toBeInTheDocument();
    expect(screen.getByText('+2341234567890')).toBeInTheDocument();
  });

  it('displays urgency badges', async () => {
    setupHandlers();
    renderWithProviders(<CallbackPage />);
    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('shows attempt button for pending/scheduled callbacks', async () => {
    setupHandlers();
    renderWithProviders(<CallbackPage />);
    await waitFor(() => {
      const attemptBtns = screen.getAllByText('Attempt');
      expect(attemptBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens schedule callback dialog', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<CallbackPage />);
    await user.click(screen.getByText('Schedule Callback'));
    await waitFor(() => {
      expect(screen.getByText('Customer ID *')).toBeInTheDocument();
    });
    expect(screen.getByText('Phone Number *')).toBeInTheDocument();
  });

  it('opens outcome dialog when clicking attempt', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<CallbackPage />);
    await waitFor(() => {
      const attemptBtns = screen.getAllByText('Attempt');
      expect(attemptBtns.length).toBeGreaterThanOrEqual(1);
    });
    const attemptBtns = screen.getAllByText('Attempt');
    await user.click(attemptBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('Record Callback Outcome')).toBeInTheDocument();
    });
  });

  it('filters callbacks by status', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<CallbackPage />);
    await waitFor(() => {
      expect(screen.getByText('#1001')).toBeInTheDocument();
    });
    // The filter buttons are in the filter section, find the PENDING one
    const filterButtons = screen.getAllByRole('button');
    const pendingFilter = filterButtons.find(b => b.textContent === 'PENDING');
    expect(pendingFilter).toBeTruthy();
    await user.click(pendingFilter!);
    await waitFor(() => {
      expect(screen.getByText('#1002')).toBeInTheDocument();
    });
  });
});
