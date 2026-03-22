import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RoutingRulesPage } from '../pages/RoutingRulesPage';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPut: mocks.apiPut,
  apiDelete: mocks.apiDelete,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { id: '1', username: 'admin', fullName: 'Admin', email: 'admin@test.com', roles: ['CBS_ADMIN'], permissions: [] } }),
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const sampleRules = [
  {
    id: 1,
    ruleName: 'VIP Routing',
    ruleType: 'VIP',
    priority: 1,
    conditions: { 'AND_0_0_customerSegment': { operator: 'IS', value: 'VIP' } },
    targetQueue: 'VIP_QUEUE',
    targetSkillGroup: null,
    targetAgentId: null,
    fallbackRuleId: null,
    maxWaitBeforeFallback: 30,
    isActive: true,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 2,
    ruleName: 'General Support',
    ruleType: 'ROUND_ROBIN',
    priority: 10,
    conditions: null,
    targetQueue: 'GENERAL_QUEUE',
    targetSkillGroup: 'TIER1_SUPPORT',
    targetAgentId: null,
    fallbackRuleId: null,
    maxWaitBeforeFallback: 60,
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
];

describe('RoutingRulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/contact-routing/rules') return Promise.resolve(sampleRules);
      return Promise.resolve([]);
    });
  });

  it('renders page header with New Rule and Test Route buttons', async () => {
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Contact Routing Rules')).toBeInTheDocument();
    expect(screen.getByText('New Rule')).toBeInTheDocument();
    expect(screen.getByText('Test Route')).toBeInTheDocument();
  });

  it('displays routing rules sorted by priority', async () => {
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('VIP Routing')).toBeInTheDocument();
    });
    expect(screen.getByText('General Support')).toBeInTheDocument();
    expect(screen.getByText('VIP_QUEUE')).toBeInTheDocument();
  });

  it('shows rule type badges with correct labels', async () => {
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });
    expect(screen.getByText('ROUND ROBIN')).toBeInTheDocument();
  });

  it('shows empty state when no rules exist', async () => {
    mocks.apiGet.mockResolvedValue([]);
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No routing rules configured.')).toBeInTheDocument();
    });
  });

  it('opens multi-step create rule dialog', async () => {
    const user = userEvent.setup();
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('New Rule'));

    await waitFor(() => {
      expect(screen.getByText('New Routing Rule — Step 1/4')).toBeInTheDocument();
    });
    expect(screen.getByText('Rule Name *')).toBeInTheDocument();
  });

  it('navigates through all 4 steps of rule creation', async () => {
    const user = userEvent.setup();
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('New Rule'));

    // Step 1 - basic info
    await waitFor(() => {
      expect(screen.getByText('New Routing Rule — Step 1/4')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Next'));

    // Step 2 - conditions
    await waitFor(() => {
      expect(screen.getByText('New Routing Rule — Step 2/4')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Next'));

    // Step 3 - target
    await waitFor(() => {
      expect(screen.getByText('New Routing Rule — Step 3/4')).toBeInTheDocument();
    });
    expect(screen.getByText('Target Queue')).toBeInTheDocument();
    await user.click(screen.getByText('Next'));

    // Step 4 - review
    await waitFor(() => {
      expect(screen.getByText('New Routing Rule — Step 4/4')).toBeInTheDocument();
    });
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Create Rule')).toBeInTheDocument();
  });

  it('submits create rule and calls POST endpoint', async () => {
    mocks.apiPost.mockResolvedValue({ id: 3, ruleName: 'Test Rule', ruleType: 'SKILL_BASED', priority: 3, isActive: true });
    const user = userEvent.setup();
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('New Rule'));

    // Step 1 - fill rule name
    await waitFor(() => {
      expect(screen.getByText('Rule Name *')).toBeInTheDocument();
    });
    const nameInput = screen.getByText('Rule Name *').parentElement!.querySelector('input')!;
    await user.type(nameInput, 'Test Rule');
    await user.click(screen.getByText('Next'));

    // Step 2 - skip conditions
    await user.click(screen.getByText('Next'));

    // Step 3 - set target queue
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. VIP_QUEUE')).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText('e.g. VIP_QUEUE'), 'TEST_QUEUE');
    await user.click(screen.getByText('Next'));

    // Step 4 - submit
    await user.click(screen.getByText('Create Rule'));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/contact-routing/rules',
        expect.objectContaining({ ruleName: 'Test Rule', targetQueue: 'TEST_QUEUE' }),
      );
    });
  });

  it('opens route tester dialog and submits test', async () => {
    mocks.apiPost.mockResolvedValue({ queue: 'VIP_QUEUE', agent: 'AGENT-001', matchedRule: 'VIP Routing' });
    const user = userEvent.setup();
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Test Route'));

    await waitFor(() => {
      expect(screen.getByText('Test Route', { selector: 'h3' })).toBeInTheDocument();
    });

    const customerIdInput = screen.getByText('Customer ID').parentElement!.querySelector('input')!;
    await user.type(customerIdInput, '42');

    const reasonInput = screen.getByPlaceholderText('e.g. ACCOUNT_INQUIRY');
    await user.type(reasonInput, 'Account Issue');

    await user.click(screen.getByText('Route'));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/contact-routing/route?customerId=42&reason=Account%20Issue&channel=PHONE',
      );
    });
  });

  it('displays route test result on success', async () => {
    mocks.apiPost.mockResolvedValue({ queue: 'VIP_QUEUE', agent: 'AGENT-001' });
    const user = userEvent.setup();
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Test Route'));

    await waitFor(() => {
      expect(screen.getByText('Customer ID')).toBeInTheDocument();
    });

    const customerIdInput = screen.getByText('Customer ID').parentElement!.querySelector('input')!;
    await user.type(customerIdInput, '1');
    await user.type(screen.getByPlaceholderText('e.g. ACCOUNT_INQUIRY'), 'Test');
    await user.click(screen.getByText('Route'));

    await waitFor(() => {
      expect(screen.getByText('Route Result')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton while fetching rules', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<RoutingRulesPage />, { wrapper: createWrapper() });

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
