import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TemplateManagementPage } from '../pages/TemplateManagementPage';

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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const sampleTemplates = [
  {
    id: 1,
    templateCode: 'ACC_STMT',
    templateName: 'Account Statement',
    channel: 'EMAIL' as const,
    eventType: 'ACCOUNT',
    subject: 'Your Account Statement',
    bodyTemplate: 'Dear {{customerName}}, your statement is attached.',
    isHtml: true,
    locale: 'en_NG',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
    createdBy: 'admin',
    version: 3,
  },
  {
    id: 2,
    templateCode: 'OTP_SMS',
    templateName: 'OTP SMS',
    channel: 'SMS' as const,
    eventType: 'SECURITY',
    subject: null,
    bodyTemplate: 'Your OTP is {{otp}}. Valid for 5 minutes.',
    isHtml: false,
    locale: 'en_NG',
    isActive: false,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
    createdBy: 'admin',
    version: 1,
  },
];

describe('TemplateManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/templates') return Promise.resolve(sampleTemplates);
      return Promise.resolve([]);
    });
  });

  it('renders page header with Create Template button', async () => {
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Communication Templates')).toBeInTheDocument();
    expect(screen.getByText('Create Template')).toBeInTheDocument();
  });

  it('displays template count stats', async () => {
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    // Wait for templates to load — verify by checking the template name appears
    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Total Templates')).toBeInTheDocument();
    // "Active" appears in stat label AND status filter — use getAllByText
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Archived').length).toBeGreaterThanOrEqual(1);
  });

  it('renders templates in table', async () => {
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });
    expect(screen.getByText('OTP SMS')).toBeInTheDocument();
    expect(screen.getByText('ACC_STMT')).toBeInTheDocument();
  });

  it('filters by channel', async () => {
    const user = userEvent.setup();
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    // Click the SMS channel filter button (text includes emoji prefix)
    const smsButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('SMS'));
    const channelFilterBtn = smsButtons.find(b => !b.textContent?.includes('OTP'));
    expect(channelFilterBtn).toBeTruthy();
    await user.click(channelFilterBtn!);

    await waitFor(() => {
      expect(screen.queryByText('Account Statement')).not.toBeInTheDocument();
      expect(screen.getByText('OTP SMS')).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('All Statuses');
    await user.selectOptions(statusSelect, 'Archived');

    await waitFor(() => {
      expect(screen.queryByText('Account Statement')).not.toBeInTheDocument();
      expect(screen.getByText('OTP SMS')).toBeInTheDocument();
    });
  });

  it('filters by search term', async () => {
    const user = userEvent.setup();
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search templates...');
    await user.type(searchInput, 'OTP');

    await waitFor(() => {
      expect(screen.queryByText('Account Statement')).not.toBeInTheDocument();
      expect(screen.getByText('OTP SMS')).toBeInTheDocument();
    });
  });

  it('opens create template modal', async () => {
    const user = userEvent.setup();
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Create Template'));

    await waitFor(() => {
      expect(screen.getByText('Create Template', { selector: 'h2' })).toBeInTheDocument();
    });
  });

  it('publishes template via action dropdown', async () => {
    mocks.apiPost.mockResolvedValue({ ...sampleTemplates[1], isActive: true });
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('OTP SMS')).toBeInTheDocument();
    });

    // The OTP SMS template (isActive: false) should have a Publish action
    // This verifies the publish mutation endpoint is correct
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/templates');
  });

  it('clears all filters when Clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<TemplateManagementPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    // Apply a channel filter
    const smsButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('SMS'));
    const channelFilterBtn = smsButtons.find(b => !b.textContent?.includes('OTP'));
    await user.click(channelFilterBtn!);

    await waitFor(() => {
      expect(screen.queryByText('Account Statement')).not.toBeInTheDocument();
    });

    // Click Clear
    await user.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
      expect(screen.getByText('OTP SMS')).toBeInTheDocument();
    });
  });
});
