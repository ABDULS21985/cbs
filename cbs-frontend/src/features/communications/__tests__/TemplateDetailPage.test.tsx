import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TemplateDetailPage } from '../pages/TemplateDetailPage';

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

function createWrapper(initialRoute = '/communications/templates/1') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/communications/templates/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const sampleTemplate = {
  id: 1,
  templateCode: 'ACC_STMT',
  templateName: 'Account Statement',
  channel: 'EMAIL' as const,
  eventType: 'ACCOUNT',
  subject: 'Your Account Statement — {{date}}',
  bodyTemplate: 'Dear {{customerName}},\n\nYour account {{accountNumber}} statement is attached.\n\nRegards,\nDigiCore Bank',
  isHtml: true,
  locale: 'en_NG',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-03-15T00:00:00Z',
  createdBy: 'admin',
  version: 3,
};

const sampleVersions = [
  { id: 1, templateId: 1, versionNumber: 1, bodyTemplate: 'v1 body', subject: 'v1 subject', changedBy: 'admin', changeSummary: 'Initial', createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, templateId: 1, versionNumber: 2, bodyTemplate: 'v2 body', subject: 'v2 subject', changedBy: 'admin', changeSummary: 'Updated formatting', createdAt: '2026-02-15T00:00:00Z' },
];

describe('TemplateDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/templates/1') return Promise.resolve(sampleTemplate);
      if (url === '/api/v1/notifications/templates/1/versions') return Promise.resolve(sampleVersions);
      if (url === '/api/v1/notifications/templates/1/preview')
        return Promise.resolve({ subject: 'Your Account Statement — 19 Mar 2026', body: 'Dear Adebayo Ogundimu,...', channel: 'EMAIL', isHtml: true });
      return Promise.resolve([]);
    });
  });

  it('renders template name and code in header', async () => {
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });
    // ACC_STMT appears in both the subtitle and the code badge
    const codeElements = screen.getAllByText('ACC_STMT');
    expect(codeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows channel badge and active status', async () => {
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
  });

  it('renders Test Send and Archive action buttons for active template', async () => {
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Send')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('renders Publish button for inactive template', async () => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/templates/1')
        return Promise.resolve({ ...sampleTemplate, isActive: false });
      return Promise.resolve([]);
    });

    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    expect(screen.getByText('Publish')).toBeInTheDocument();
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
  });

  it('renders 4 tabs: Editor, Preview, Test, Version History', async () => {
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Account Statement')).toBeInTheDocument();
    });

    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Version History')).toBeInTheDocument();
  });

  it('calls archive endpoint when Archive button is clicked', async () => {
    mocks.apiPost.mockResolvedValue({ ...sampleTemplate, isActive: false });
    const user = userEvent.setup();
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Archive'));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/templates/1/archive');
    });
  });

  it('calls publish endpoint when Publish button is clicked for inactive template', async () => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/templates/1')
        return Promise.resolve({ ...sampleTemplate, isActive: false });
      return Promise.resolve([]);
    });
    mocks.apiPost.mockResolvedValue({ ...sampleTemplate, isActive: true });

    const user = userEvent.setup();
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Publish'));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/templates/1/publish');
    });
  });

  it('shows error state when template is not found', async () => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/v1/notifications/templates/1') return Promise.reject(new Error('Not found'));
      return Promise.resolve([]);
    });

    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Template Not Found')).toBeInTheDocument();
    });
    expect(screen.getByText('Template could not be loaded')).toBeInTheDocument();
  });

  it('shows loading state while template is being fetched', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches template by ID from route params', async () => {
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/templates/1');
    });
  });

  it('opens test send dialog from header button', async () => {
    const user = userEvent.setup();
    render(<TemplateDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Send')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test Send'));

    await waitFor(() => {
      // TemplateTestSendDialog should appear
      expect(screen.getByText('Send Test', { selector: 'button' })).toBeInTheDocument();
    });
  });
});
