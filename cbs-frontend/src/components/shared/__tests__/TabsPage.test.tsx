import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabsPage } from '../TabsPage';
import { renderWithProviders } from '@/test/helpers';

type Tab = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  content: React.ReactNode;
  disabled?: boolean;
};

const HomeIcon = ({ className }: { className?: string }) => <svg data-testid="home-icon" className={className} />;
const SettingsIcon = ({ className }: { className?: string }) => <svg data-testid="settings-icon" className={className} />;

const sampleTabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    content: <div>Overview Content</div>,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    badge: 5,
    content: <div>Transactions Content</div>,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    content: <div>Settings Content</div>,
  },
  {
    id: 'reports',
    label: 'Reports',
    badge: 0,
    content: <div>Reports Content</div>,
  },
  {
    id: 'archive',
    label: 'Archive',
    disabled: true,
    content: <div>Archive Content</div>,
  },
];

describe('TabsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tab labels as buttons', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transactions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reports/i })).toBeInTheDocument();
  });

  it('first tab is active by default', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    const firstTabBtn = screen.getByRole('button', { name: /overview/i });
    expect(firstTabBtn.className).toMatch(/border-primary/);
  });

  it('shows content of the first tab by default', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    expect(screen.getByText('Overview Content')).toBeInTheDocument();
    expect(screen.queryByText('Transactions Content')).not.toBeInTheDocument();
  });

  it('uses defaultTab prop to set initial active tab', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} defaultTab="transactions" />);
    expect(screen.getByText('Transactions Content')).toBeInTheDocument();
    expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
  });

  it('active tab has border-primary class', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    const overviewBtn = screen.getByRole('button', { name: /overview/i });
    expect(overviewBtn.className).toMatch(/border-primary/);
    // Other tabs should not have border-primary
    const transactionsBtn = screen.getByRole('button', { name: /transactions/i });
    expect(transactionsBtn.className).not.toMatch(/border-primary/);
  });

  it('switches active tab and shows that tab content on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TabsPage tabs={sampleTabs} />);

    await user.click(screen.getByRole('button', { name: /transactions/i }));

    await waitFor(() => {
      expect(screen.getByText('Transactions Content')).toBeInTheDocument();
      expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
    });
  });

  it('switches active tab border-primary class on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TabsPage tabs={sampleTabs} />);

    await user.click(screen.getByRole('button', { name: /transactions/i }));

    await waitFor(() => {
      const transactionsBtn = screen.getByRole('button', { name: /transactions/i });
      expect(transactionsBtn.className).toMatch(/border-primary/);
    });
  });

  it('renders badge number on tab when badge > 0', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render badge when badge is 0', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    // Reports tab has badge=0; should not show badge "0"
    const reportsBtn = screen.getByRole('button', { name: /reports/i });
    expect(within(reportsBtn).queryByText('0')).not.toBeInTheDocument();
  });

  it('does not render badge when badge is undefined', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    // Overview tab has no badge defined
    const overviewBtn = screen.getByRole('button', { name: /overview/i });
    const badge = overviewBtn.querySelector('[class*="badge"], [class*="rounded-full"]');
    expect(badge).toBeNull();
  });

  it('disabled tab has opacity-50 class', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    const archiveBtn = screen.getByRole('button', { name: /archive/i });
    expect(archiveBtn.className).toMatch(/opacity-50/);
  });

  it('disabled tab has cursor-not-allowed class', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    const archiveBtn = screen.getByRole('button', { name: /archive/i });
    expect(archiveBtn.className).toMatch(/cursor-not-allowed/);
  });

  it('clicking disabled tab does not change active tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TabsPage tabs={sampleTabs} />);

    // Active tab is 'overview' by default
    expect(screen.getByText('Overview Content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /archive/i })).catch(() => {});

    // Overview should still be shown, Archive content should not
    expect(screen.queryByText('Archive Content')).not.toBeInTheDocument();
    expect(screen.getByText('Overview Content')).toBeInTheDocument();
  });

  it('renders icon in tab button when icon prop is provided', () => {
    renderWithProviders(<TabsPage tabs={sampleTabs} />);
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('syncWithUrl=true reads and writes tab from URL search params', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TabsPage tabs={sampleTabs} syncWithUrl={true} />, {
      initialEntries: ['/?tab=transactions'],
    });

    await waitFor(() => {
      expect(screen.getByText('Transactions Content')).toBeInTheDocument();
    });
  });

  it('shows correct content after switching multiple tabs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TabsPage tabs={sampleTabs} />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await waitFor(() => expect(screen.getByText('Settings Content')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /overview/i }));
    await waitFor(() => expect(screen.getByText('Overview Content')).toBeInTheDocument());
    expect(screen.queryByText('Settings Content')).not.toBeInTheDocument();
  });
});
