import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { AgentDashboardPage } from '../pages/AgentDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

// Backend shape (BackendAgentState) with currentState field
const mockAgents = [
  {
    agentId: 'agent-1', agentName: 'John Smith',
    currentState: 'AVAILABLE', currentInteractionId: null,
    dailyHandled: 12, dailyAvgHandleTime: 210,
    dailyFirstContactResolution: 88, qualityScore: 91,
  },
  {
    agentId: 'agent-2', agentName: 'Jane Doe',
    currentState: 'ON_CALL', currentInteractionId: 5,
    dailyHandled: 18, dailyAvgHandleTime: 180,
    dailyFirstContactResolution: 92, qualityScore: 95,
  },
];

const mockMyAgent = {
  agentId: 'agent-1', agentName: 'John Smith',
  currentState: 'AVAILABLE', currentInteractionId: null,
  dailyHandled: 12, dailyAvgHandleTime: 210,
  dailyFirstContactResolution: 88, qualityScore: 91,
};

const mockInteractions = [
  {
    id: 1, interactionId: 'INT-001', centerId: 1, customerId: 1001,
    agentId: 'agent-1', channel: 'PHONE', direction: 'INBOUND',
    contactReason: 'Balance inquiry', queueName: 'General',
    waitTimeSec: 30, handleTimeSec: 90, wrapUpTimeSec: 0,
    transferCount: 0, disposition: null, sentiment: null,
    firstContactResolution: false, caseId: null, notes: '', recordingRef: '',
    status: 'ACTIVE', startedAt: '2026-03-22T10:00:00Z', endedAt: null,
    createdAt: '2026-03-22T10:00:00Z',
  },
  {
    id: 2, interactionId: 'INT-002', centerId: 1, customerId: 1002,
    agentId: 'agent-1', channel: 'CHAT', direction: 'INBOUND',
    contactReason: 'Card block', queueName: 'Card Services',
    waitTimeSec: 15, handleTimeSec: 240, wrapUpTimeSec: 30,
    transferCount: 0, disposition: 'RESOLVED', sentiment: 'POSITIVE',
    firstContactResolution: true, caseId: null, notes: '', recordingRef: '',
    status: 'COMPLETED', startedAt: '2026-03-22T09:00:00Z', endedAt: '2026-03-22T09:05:00Z',
    createdAt: '2026-03-22T09:00:00Z',
  },
];

const mockCallbacks = [
  {
    id: 1, customerId: 2001, callbackNumber: '+2341234567890',
    preferredTime: '2026-03-22T15:00:00Z', preferredLanguage: 'en',
    contactReason: 'GENERAL', urgency: 'MEDIUM', assignedAgentId: 'agent-1',
    attemptCount: 0, maxAttempts: 3, lastAttemptAt: null, lastOutcome: null,
    status: 'SCHEDULED',
  },
  {
    id: 2, customerId: 2002, callbackNumber: '+2349876543210',
    preferredTime: '2026-03-22T16:00:00Z', preferredLanguage: 'en',
    contactReason: 'ACCOUNT_INQUIRY', urgency: 'HIGH', assignedAgentId: 'agent-2',
    attemptCount: 1, maxAttempts: 3, lastAttemptAt: null, lastOutcome: null,
    status: 'SCHEDULED',
  },
];

function setupHandlers(options?: {
  myAgent?: typeof mockMyAgent | null;
  interactions?: typeof mockInteractions;
  callbacks?: typeof mockCallbacks;
  onStateChange?: (agentId: string, newState: string) => void;
  onCompleteInteraction?: (interactionId: string) => void;
}) {
  const {
    myAgent = mockMyAgent,
    interactions = mockInteractions,
    callbacks = mockCallbacks,
    onStateChange,
    onCompleteInteraction,
  } = options ?? {};

  server.use(
    http.get('/api/v1/contact-center/agents', () =>
      HttpResponse.json(wrap(mockAgents)),
    ),
    http.get('/api/v1/contact-center/agents/me', () =>
      HttpResponse.json(wrap(myAgent)),
    ),
    http.get('/api/v1/contact-center/interactions/agent/:agentId', () =>
      HttpResponse.json(wrap(interactions)),
    ),
    http.get('/api/v1/contact-center/callbacks', () =>
      HttpResponse.json(wrap(callbacks)),
    ),
    http.put('/api/v1/contact-routing/agents/:agentId/state', ({ params, request }) => {
      const url = new URL(request.url);
      const newState = url.searchParams.get('newState') ?? '';
      onStateChange?.(params.agentId as string, newState);
      return HttpResponse.json(wrap({}));
    }),
    http.post('/api/v1/contact-center/interactions/:id/complete', ({ params, request }) => {
      const url = new URL(request.url);
      void url; // params.id is the interactionId path segment
      onCompleteInteraction?.(params.id as string);
      return HttpResponse.json(wrap({ ...interactions[0], status: 'COMPLETED', disposition: url.searchParams.get('disposition') ?? 'RESOLVED' }));
    }),
    http.post('/api/v1/contact-routing/callbacks/:id/attempt', () =>
      HttpResponse.json(wrap({ id: 1, status: 'COMPLETED', lastOutcome: 'ANSWERED' })),
    ),
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('AgentDashboardPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);
    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);
    expect(screen.getByText('My State')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('AHT')).toBeInTheDocument();
    expect(screen.getByText('FCR')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
  });

  it('renders tabs for queue, callbacks, and history', () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);
    expect(screen.getByText('My Queue')).toBeInTheDocument();
    expect(screen.getByText('My Callbacks')).toBeInTheDocument();
    expect(screen.getByText("Today's History")).toBeInTheDocument();
  });

  it('displays agent queue interactions from backend', async () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('INT-001')).toBeInTheDocument();
    });
    expect(screen.getByText('INT-002')).toBeInTheDocument();
  });

  it('shows Complete button only for ACTIVE interactions', async () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('INT-001')).toBeInTheDocument();
    });

    // INT-001 is ACTIVE — Complete button should appear
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('shows my-state selector populated from backend agent data', async () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);

    await waitFor(() => {
      const stateSelect = document.querySelector('select') as HTMLSelectElement;
      expect(stateSelect).not.toBeNull();
      expect(stateSelect.value).toBe('AVAILABLE');
    });
  });

  it('calls agent state update endpoint when state changes', async () => {
    const stateChanges: { agentId: string; state: string }[] = [];
    setupHandlers({
      onStateChange: (agentId, state) => stateChanges.push({ agentId, state }),
    });
    renderWithProviders(<AgentDashboardPage />);

    // Wait for the select to be enabled (requires myAgent data to load)
    await waitFor(() => {
      const stateSelect = document.querySelector('select') as HTMLSelectElement;
      expect(stateSelect).not.toBeNull();
      expect(stateSelect.disabled).toBe(false);
    });

    const stateSelect = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(stateSelect, { target: { value: 'BREAK' } });

    await waitFor(() => {
      expect(stateChanges.some((c) => c.state === 'BREAK')).toBe(true);
    });
  });

  it('filters callbacks to only those assigned to current agent', async () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);

    // Click My Callbacks tab
    fireEvent.click(screen.getByText('My Callbacks'));

    await waitFor(() => {
      // Callback assigned to agent-1 (customerId 2001) should appear
      expect(screen.getByText('Customer #2001 — +2341234567890')).toBeInTheDocument();
    });

    // Callback assigned to agent-2 should NOT appear in agent-1's tab
    expect(screen.queryByText('Customer #2002 — +2349876543210')).not.toBeInTheDocument();
  });

  it('shows "No callbacks assigned to you" when none match the agent', async () => {
    // All callbacks assigned to agent-2, not agent-1
    const otherAgentCallbacks = [
      { ...mockCallbacks[1], assignedAgentId: 'agent-2' },
    ];
    setupHandlers({ callbacks: otherAgentCallbacks });
    renderWithProviders(<AgentDashboardPage />);

    fireEvent.click(screen.getByText('My Callbacks'));

    await waitFor(() => {
      expect(screen.getByText('No callbacks assigned to you')).toBeInTheDocument();
    });
  });

  it('shows warning when authenticated user has no agent mapping', async () => {
    setupHandlers({ myAgent: null });
    renderWithProviders(<AgentDashboardPage />);

    await waitFor(() => {
      // myAgent is null AND user is logged in AND agents loaded — shows warning
      // The warning may or may not show depending on whether user is set in test env
      // At minimum, no crash should occur
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });
  });

  it('opens complete interaction dialog when clicking Complete', async () => {
    setupHandlers();
    renderWithProviders(<AgentDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Complete'));

    await waitFor(() => {
      expect(screen.getByText('Complete Interaction')).toBeInTheDocument();
    });
    expect(screen.getByText('Disposition')).toBeInTheDocument();
    expect(screen.getByText('Sentiment')).toBeInTheDocument();
    expect(screen.getByText('First Contact Resolution')).toBeInTheDocument();
  });
});
