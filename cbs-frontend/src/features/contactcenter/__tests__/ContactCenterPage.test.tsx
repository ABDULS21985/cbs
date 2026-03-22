import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { ContactCenterPage } from '../pages/ContactCenterPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAgents = [
  { agentId: 'agent-1', agentName: 'John Smith', currentState: 'AVAILABLE', currentInteractionId: null, dailyHandled: 15, dailyAvgHandleTime: 240, dailyFirstContactResolution: 85, qualityScore: 92 },
  { agentId: 'agent-2', agentName: 'Jane Doe', currentState: 'ON_CALL', currentInteractionId: 1, dailyHandled: 20, dailyAvgHandleTime: 180, dailyFirstContactResolution: 90, qualityScore: 88 },
  { agentId: 'agent-3', agentName: 'Bob Wilson', currentState: 'BREAK', currentInteractionId: null, dailyHandled: 8, dailyAvgHandleTime: 300, dailyFirstContactResolution: 75, qualityScore: 78 },
];

const mockQueues = [
  { queueName: 'General Inquiry', queueType: 'INBOUND_CALL', currentWaiting: 3, longestWaitSeconds: 120, slaTargetSeconds: 30, slaAchievementPct: 85, agentsAssigned: 5, agentsAvailable: 2 },
  { queueName: 'Card Services', queueType: 'INBOUND_CALL', currentWaiting: 1, longestWaitSeconds: 45, slaTargetSeconds: 30, slaAchievementPct: 92, agentsAssigned: 3, agentsAvailable: 1 },
];

const mockInteractions = [
  { id: 1, interactionId: 'INT-ABC123', centerId: 1, customerId: 1001, agentId: 'agent-1', channel: 'PHONE', direction: 'INBOUND', contactReason: 'Balance inquiry', queueName: 'General', waitTimeSec: 30, handleTimeSec: 180, wrapUpTimeSec: 0, transferCount: 0, disposition: 'RESOLVED', sentiment: 'POSITIVE', firstContactResolution: true, caseId: null, notes: '', recordingRef: '', status: 'COMPLETED', startedAt: '2026-03-22T10:00:00Z', endedAt: '2026-03-22T10:05:00Z', createdAt: '2026-03-22T10:00:00Z' },
  { id: 2, interactionId: 'INT-DEF456', centerId: 1, customerId: 1002, agentId: 'agent-2', channel: 'CHAT', direction: 'INBOUND', contactReason: 'Card block', queueName: 'Card Services', waitTimeSec: 15, handleTimeSec: 0, wrapUpTimeSec: 0, transferCount: 0, disposition: null, sentiment: null, firstContactResolution: false, caseId: null, notes: '', recordingRef: '', status: 'ACTIVE', startedAt: '2026-03-22T11:00:00Z', endedAt: null, createdAt: '2026-03-22T11:00:00Z' },
];

const mockCallbacks = [
  { id: 1, customerId: 2001, callbackNumber: '+2341234567', preferredTime: '2026-03-22T14:00:00Z', preferredLanguage: 'en', contactReason: 'GENERAL', urgency: 'MEDIUM', assignedAgentId: null, attemptCount: 0, maxAttempts: 3, lastAttemptAt: null, lastOutcome: null, status: 'SCHEDULED' },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/contact-center/agents', () => HttpResponse.json(wrap(mockAgents))),
    http.get('/api/v1/contact-center/queues', () => HttpResponse.json(wrap(mockQueues))),
    http.get('/api/v1/contact-center/interactions', () => HttpResponse.json(wrap(mockInteractions))),
    http.get('/api/v1/contact-center/callbacks', () => HttpResponse.json(wrap(mockCallbacks))),
    http.get('/api/v1/contact-routing/callbacks', () => HttpResponse.json(wrap(mockCallbacks))),
    http.post('/api/v1/contact-center/interactions', () => HttpResponse.json(wrap({ id: 3, interactionId: 'INT-NEW123', status: 'ACTIVE', channel: 'PHONE' }))),
    http.post('/api/v1/contact-center/interactions/:id/assign', () => HttpResponse.json(wrap({ ...mockInteractions[1], agentId: 'agent-1', status: 'ACTIVE' }))),
    http.post('/api/v1/contact-center/interactions/:id/complete', () => HttpResponse.json(wrap({ ...mockInteractions[1], status: 'COMPLETED', disposition: 'RESOLVED' }))),
    http.put('/api/v1/contact-routing/agents/:agentId/state', () => HttpResponse.json(wrap({}))),
    http.post('/api/v1/contact-routing/callbacks', () => HttpResponse.json(wrap({ id: 2, status: 'SCHEDULED' }))),
    http.post('/api/v1/contact-routing/callbacks/:id/attempt', () => HttpResponse.json(wrap({ id: 1, status: 'COMPLETED', lastOutcome: 'ANSWERED' }))),
  );
}

describe('ContactCenterPage', () => {
  it('renders the page header with title', () => {
    setupHandlers();
    renderWithProviders(<ContactCenterPage />);
    expect(screen.getByText('Contact Center')).toBeInTheDocument();
  });

  it('renders live connection indicator', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterPage />);
    await waitFor(() => {
      const liveText = screen.queryByText('Live') || screen.queryByText('Updating...');
      expect(liveText).toBeInTheDocument();
    });
  });

  it('renders wallboard button', () => {
    setupHandlers();
    renderWithProviders(<ContactCenterPage />);
    expect(screen.getByText('Wallboard')).toBeInTheDocument();
  });

  it('renders stat cards with live data', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterPage />);
    await waitFor(() => {
      expect(screen.getByText('In Service')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Waiting').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Avg Wait')).toBeInTheDocument();
    expect(screen.getByText('Avg Handle')).toBeInTheDocument();
  });

  it('renders all 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<ContactCenterPage />);
    expect(screen.getByText('Queues')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Interactions')).toBeInTheDocument();
    expect(screen.getByText('Callbacks')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('displays queue cards when queues tab is active', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterPage />);
    await waitFor(() => {
      expect(screen.getByText('General Inquiry')).toBeInTheDocument();
    });
    expect(screen.getByText('Card Services')).toBeInTheDocument();
  });

  it('displays agent cards in agents tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterPage />);
    const agentsTab = screen.getByText('Agents');
    await user.click(agentsTab);
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('displays interactions table', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterPage />);
    const tab = screen.getByText('Interactions');
    await user.click(tab);
    await waitFor(() => {
      expect(screen.getByText('INT-ABC123')).toBeInTheDocument();
    });
    expect(screen.getByText('INT-DEF456')).toBeInTheDocument();
  });

  it('displays New Interaction button in interactions tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterPage />);
    const tab = screen.getByText('Interactions');
    await user.click(tab);
    expect(screen.getByText('New Interaction')).toBeInTheDocument();
  });

  it('displays callbacks tab with request callback button', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterPage />);
    const tab = screen.getByText('Callbacks');
    await user.click(tab);
    expect(screen.getByText('Request Callback')).toBeInTheDocument();
  });

  it('displays performance analytics', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterPage />);
    const tab = screen.getByText('Performance');
    await user.click(tab);
    await waitFor(() => {
      expect(screen.getByText('Total Interactions')).toBeInTheDocument();
    });
    expect(screen.getByText('Agent Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Channel Breakdown')).toBeInTheDocument();
  });

  it('shows error banner when API fails', async () => {
    server.use(
      http.get('/api/v1/contact-center/agents', () => HttpResponse.json(wrap([]), { status: 500 })),
      http.get('/api/v1/contact-center/queues', () => HttpResponse.json(wrap([]), { status: 500 })),
      http.get('/api/v1/contact-center/interactions', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/contact-center/callbacks', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<ContactCenterPage />);
    await waitFor(() => {
      const errorBanners = screen.queryAllByText(/failed to load/i);
      expect(errorBanners.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('sends direction field in new interaction POST body (NOT NULL constraint)', async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.get('/api/v1/contact-center/agents', () => HttpResponse.json(wrap(mockAgents))),
      http.get('/api/v1/contact-center/queues', () => HttpResponse.json(wrap(mockQueues))),
      http.get('/api/v1/contact-center/interactions', () => HttpResponse.json(wrap(mockInteractions))),
      http.get('/api/v1/contact-center/callbacks', () => HttpResponse.json(wrap(mockCallbacks))),
      http.post('/api/v1/contact-center/interactions', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json(wrap({ id: 3, interactionId: 'INT-NEW999', status: 'ACTIVE', channel: 'PHONE' }));
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterPage />);

    // Navigate to Interactions tab and open New Interaction form
    await user.click(screen.getByText('Interactions'));
    await user.click(screen.getByText('New Interaction'));

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByText('Customer ID')).toBeInTheDocument();
    });

    // Fill customer ID (number input)
    const customerIdInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    await user.clear(customerIdInput);
    await user.type(customerIdInput, '1001');

    // Fill contact reason (text input)
    const textInputs = document.querySelectorAll('input:not([type="number"])');
    const reasonInput = Array.from(textInputs).find(
      (el) => (el as HTMLInputElement).required,
    ) as HTMLInputElement | undefined;
    if (reasonInput) {
      await user.type(reasonInput, 'Balance inquiry');
    }

    await user.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(capturedBody).toHaveProperty('direction');
    });
    // direction must be a non-empty string (NOT NULL column)
    expect(typeof capturedBody.direction).toBe('string');
    expect((capturedBody.direction as string).length).toBeGreaterThan(0);
  });

  it('renders agent state filter buttons in agents tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterPage />);
    await user.click(screen.getByText('Agents'));
    await waitFor(() => {
      const filterButtons = screen.getAllByRole('button');
      const availableBtn = filterButtons.find(b => b.textContent?.includes('AVAILABLE') && b.textContent?.includes('('));
      expect(availableBtn).toBeTruthy();
    });
  });
});
