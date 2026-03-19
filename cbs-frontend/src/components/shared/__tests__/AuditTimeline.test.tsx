import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTimeline } from '../AuditTimeline';

type AuditEvent = {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string;
  changes?: { field: string; from: string; to: string }[];
};

const sampleEvents: AuditEvent[] = [
  {
    id: '1',
    action: 'Created',
    performedBy: 'Alice Johnson',
    performedAt: '2024-01-15T10:00:00Z',
    details: 'Initial record created',
  },
  {
    id: '2',
    action: 'Approved',
    performedBy: 'Bob Smith',
    performedAt: '2024-01-16T11:00:00Z',
    changes: [
      { field: 'status', from: 'Pending', to: 'Approved' },
      { field: 'approvedBy', from: '', to: 'Bob Smith' },
    ],
  },
  {
    id: '3',
    action: 'Updated',
    performedBy: 'Carol White',
    performedAt: '2024-01-17T12:00:00Z',
    details: 'Amount adjusted',
    changes: [{ field: 'amount', from: '5000', to: '7500' }],
  },
];

const eventWithoutChanges: AuditEvent = {
  id: '10',
  action: 'Viewed',
  performedBy: 'Dave Brown',
  performedAt: '2024-01-18T09:00:00Z',
};

describe('AuditTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton placeholders when isLoading is true', () => {
    render(<AuditTimeline events={[]} isLoading={true} />);
    // Expect 3 skeleton rows
    const skeletons =
      document.querySelectorAll('[data-testid="skeleton"]').length > 0
        ? document.querySelectorAll('[data-testid="skeleton"]')
        : document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('does not render real events when isLoading is true', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={true} />);
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
  });

  it('renders each event action text', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('renders each event performedBy', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
  });

  it('does not show expand button for events without changes', () => {
    render(<AuditTimeline events={[eventWithoutChanges]} isLoading={false} />);
    // No ChevronRight/expand button should exist
    const expandBtn =
      screen.queryByRole('button', { name: /expand/i }) ??
      document.querySelector('[data-testid="expand-changes"]') ??
      document.querySelector('.lucide-chevron-right');
    expect(expandBtn).toBeNull();
  });

  it('shows expand button for events with changes', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);
    // Events id=2 and id=3 have changes; expect at least one expand button
    const expandBtns =
      document.querySelectorAll('[data-testid="expand-changes"]').length > 0
        ? document.querySelectorAll('[data-testid="expand-changes"]')
        : document.querySelectorAll('button .lucide-chevron-right, button svg');
    // At least one button for expanding changes
    expect(expandBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('shows changes when expand button is clicked', async () => {
    const user = userEvent.setup();
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);

    const expandBtns = screen.getAllByRole('button');
    // Click the first expand button (id=2 event has changes)
    await user.click(expandBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('status')).toBeInTheDocument();
    });
  });

  it('shows from→to values in changes', async () => {
    const user = userEvent.setup();
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);

    const expandBtns = screen.getAllByRole('button');
    await user.click(expandBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  it('collapses changes when expand button is clicked again', async () => {
    const user = userEvent.setup();
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);

    const expandBtns = screen.getAllByRole('button');
    // Open
    await user.click(expandBtns[0]);
    await waitFor(() => expect(screen.getByText('status')).toBeInTheDocument());

    // Close
    await user.click(expandBtns[0]);
    await waitFor(() => expect(screen.queryByText('status')).not.toBeInTheDocument());
  });

  it('only one event expanded at a time', async () => {
    const user = userEvent.setup();
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);

    const expandBtns = screen.getAllByRole('button');
    // Open first expandable (Approved event with 'status' change)
    await user.click(expandBtns[0]);
    await waitFor(() => expect(screen.getByText('status')).toBeInTheDocument());

    // Open second expandable (Updated event with 'amount' change)
    await user.click(expandBtns[1]);
    await waitFor(() => expect(screen.getByText('amount')).toBeInTheDocument());

    // First event's changes should now be collapsed
    expect(screen.queryByText('status')).not.toBeInTheDocument();
  });

  it('Created action event dot has bg-green-500 class', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);
    const dots = document.querySelectorAll('.bg-green-500');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('Approved action event dot has bg-blue-500 class', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);
    const dots = document.querySelectorAll('.bg-blue-500');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('renders details text below performedBy when provided', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);
    expect(screen.getByText('Initial record created')).toBeInTheDocument();
    expect(screen.getByText('Amount adjusted')).toBeInTheDocument();
  });

  it('renders empty div when events array is empty', () => {
    const { container } = render(<AuditTimeline events={[]} isLoading={false} />);
    // Should render but be empty (no event content)
    expect(screen.queryByText(/performed by/i)).not.toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render skeleton when isLoading is false', () => {
    render(<AuditTimeline events={sampleEvents} isLoading={false} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(0);
  });
});
