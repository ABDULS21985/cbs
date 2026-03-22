import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ScheduledQueue } from '../components/ScheduledQueue';

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

const sampleScheduled = [
  {
    id: 1,
    name: 'Weekly Promo Email',
    templateCode: 'PROMO_WEEKLY',
    channel: 'EMAIL',
    eventType: 'MARKETING',
    subject: 'Weekly deals for you',
    body: null,
    cronExpression: '0 9 * * MON',
    frequency: 'WEEKLY',
    nextRun: '2026-03-23T09:00:00Z',
    lastRun: '2026-03-16T09:00:00Z',
    recipientCriteria: null,
    recipientCount: 1500,
    status: 'ACTIVE',
    createdBy: 'admin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-16T09:00:00Z',
    version: 3,
  },
  {
    id: 2,
    name: 'Year End Greeting',
    templateCode: 'YEAR_END',
    channel: 'SMS',
    eventType: 'MARKETING',
    subject: null,
    body: 'Happy holidays from DigiCore!',
    cronExpression: null,
    frequency: 'ONCE',
    nextRun: '2026-12-25T00:00:00Z',
    lastRun: null,
    recipientCriteria: null,
    recipientCount: 5000,
    status: 'PAUSED',
    createdBy: 'admin',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
    version: 1,
  },
];

describe('ScheduledQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no scheduled campaigns exist', async () => {
    mocks.apiGet.mockResolvedValue([]);
    render(<ScheduledQueue />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No scheduled campaigns')).toBeInTheDocument();
    });
  });

  it('renders scheduled campaigns with correct ScheduledNotification fields', async () => {
    mocks.apiGet.mockResolvedValue(sampleScheduled);
    render(<ScheduledQueue />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Weekly Promo Email')).toBeInTheDocument();
    });
    expect(screen.getByText('Year End Greeting')).toBeInTheDocument();
    expect(screen.getByText(/Template: PROMO_WEEKLY/)).toBeInTheDocument();
    expect(screen.getByText(/1500 recipients/)).toBeInTheDocument();
  });

  it('renders toggle (pause/play) buttons for active and paused campaigns', async () => {
    mocks.apiGet.mockResolvedValue(sampleScheduled);
    render(<ScheduledQueue />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Weekly Promo Email')).toBeInTheDocument();
    });

    // Active campaign should have Pause button
    const pauseBtn = screen.getByTitle('Pause');
    expect(pauseBtn).toBeInTheDocument();

    // Paused campaign should have Resume button
    const resumeBtn = screen.getByTitle('Resume');
    expect(resumeBtn).toBeInTheDocument();
  });

  it('calls toggle endpoint when pause/play button is clicked', async () => {
    mocks.apiGet.mockResolvedValue(sampleScheduled);
    mocks.apiPut.mockResolvedValue({ ...sampleScheduled[0], status: 'PAUSED' });
    const user = userEvent.setup();

    render(<ScheduledQueue />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Pause'));

    await waitFor(() => {
      expect(mocks.apiPut).toHaveBeenCalledWith('/api/v1/notifications/scheduled/1/toggle');
    });
  });

  it('calls delete endpoint when delete button is clicked and confirmed', async () => {
    mocks.apiGet.mockResolvedValue(sampleScheduled);
    mocks.apiDelete.mockResolvedValue({ id: '1', deleted: 'true' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<ScheduledQueue />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Weekly Promo Email')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete campaign');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mocks.apiDelete).toHaveBeenCalledWith('/api/v1/notifications/scheduled/1');
    });
  });

  it('does NOT call delete when confirm is cancelled', async () => {
    mocks.apiGet.mockResolvedValue(sampleScheduled);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();

    render(<ScheduledQueue />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Weekly Promo Email')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete campaign');
    await user.click(deleteButtons[0]);

    expect(mocks.apiDelete).not.toHaveBeenCalled();
  });

  it('shows error banner when backend fails', async () => {
    mocks.apiGet.mockRejectedValue(new Error('Network error'));
    render(<ScheduledQueue />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    });
  });
});
