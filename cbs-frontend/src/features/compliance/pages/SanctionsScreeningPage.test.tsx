import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { SanctionsScreeningPage } from './SanctionsScreeningPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  totalScreenings: 1240,
  clear: 1100,
  potentialMatch: 120,
  confirmedMatch: 20,
  pendingReview: 15,
  avgScreeningTimeMs: 340,
};

const mockScreenings = [
  {
    id: 1,
    screeningRef: 'SCR-00001',
    subjectName: 'John Doe',
    subjectType: 'INDIVIDUAL',
    screeningType: 'ONBOARDING',
    listsScreened: ['OFAC_SDN', 'UN_CONSOLIDATED'],
    totalMatches: 2,
    trueMatches: 0,
    falsePositives: 0,
    status: 'PENDING',
    createdAt: '2026-03-20T10:00:00Z',
    reviewedBy: null,
    screeningTimeMs: 250,
    matches: [],
  },
  {
    id: 2,
    screeningRef: 'SCR-00002',
    subjectName: 'Acme Corp',
    subjectType: 'COMPANY',
    screeningType: 'TRANSACTION',
    listsScreened: ['EU_CONSOLIDATED'],
    totalMatches: 0,
    trueMatches: 0,
    falsePositives: 0,
    status: 'CLEAR',
    createdAt: '2026-03-19T14:30:00Z',
    reviewedBy: 'admin',
    screeningTimeMs: 180,
    matches: [],
  },
];

const mockPending = [
  {
    id: 1,
    screeningRef: 'SCR-00001',
    subjectName: 'John Doe',
    subjectType: 'INDIVIDUAL',
    screeningType: 'ONBOARDING',
    totalMatches: 2,
    trueMatches: 0,
    falsePositives: 0,
    status: 'PENDING',
    createdAt: '2026-03-20T10:00:00Z',
    screeningTimeMs: 250,
    matches: [
      {
        id: 101,
        watchlistSource: 'OFAC_SDN',
        watchlistName: 'John A. Doe',
        matchScore: 92,
        matchType: 'EXACT',
        matchedFields: ['NAME', 'DOB'],
        disposition: 'PENDING',
      },
      {
        id: 102,
        watchlistSource: 'UN_CONSOLIDATED',
        watchlistName: 'J. Doe',
        matchScore: 75,
        matchType: 'FUZZY',
        matchedFields: ['NAME'],
        disposition: 'PENDING',
      },
    ],
  },
];

const mockWatchlists = [
  {
    id: 1,
    listSource: 'OFAC_SDN',
    entityType: 'INDIVIDUAL',
    primaryName: 'Sanctioned Person A',
    aliases: ['SP-A', 'Person Alpha'],
    nationality: 'IR',
    countryCodes: ['IR', 'SY'],
    programme: 'Counter Terrorism',
    listedDate: '2020-01-15',
    isActive: true,
  },
  {
    id: 2,
    listSource: 'EU_CONSOLIDATED',
    entityType: 'COMPANY',
    primaryName: 'Bad Corp Ltd',
    aliases: [],
    nationality: null,
    countryCodes: ['RU'],
    programme: 'Ukraine Conflict',
    listedDate: '2022-06-01',
    isActive: true,
  },
];

const mockBatchJobs = [
  { jobId: 'BATCH-001', namesCount: 50, status: 'COMPLETED', matchesFound: 3 },
];

function setupHandlers(overrides?: {
  stats?: typeof mockStats;
  screenings?: typeof mockScreenings;
  pending?: typeof mockPending;
  watchlists?: typeof mockWatchlists;
  batchJobs?: typeof mockBatchJobs;
}) {
  server.use(
    http.get('/api/v1/sanctions/stats', () => HttpResponse.json(wrap(overrides?.stats ?? mockStats))),
    http.get('/api/v1/sanctions', () => HttpResponse.json(wrap(overrides?.screenings ?? mockScreenings))),
    http.get('/api/v1/sanctions/pending', () => HttpResponse.json(wrap(overrides?.pending ?? mockPending))),
    http.get('/api/v1/sanctions/watchlists', () => HttpResponse.json(wrap(overrides?.watchlists ?? mockWatchlists))),
    http.get('/api/v1/sanctions/matches', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/sanctions/batch-screen', () => HttpResponse.json(wrap(overrides?.batchJobs ?? mockBatchJobs))),
  );
}

describe('SanctionsScreeningPage', () => {
  // ─── 1. Page header ──────────────────────────────────────────────────────────

  it('renders the page header title', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Sanctions & PEP Screening')).toBeInTheDocument();
  });

  it('renders the page subtitle', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText(/watchlist screening.*match disposition.*compliance monitoring/i)).toBeInTheDocument();
  });

  // ─── 2. Stat cards ──────────────────────────────────────────────────────────

  it('renders 6 stat card labels', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Screenings')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Potential Matches')).toBeInTheDocument();
    expect(screen.getByText('Confirmed Matches')).toBeInTheDocument();
    // "Pending Review" appears as both stat card and tab label
    const pendingReviewEls = screen.getAllByText('Pending Review');
    expect(pendingReviewEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg Time')).toBeInTheDocument();
  });

  it('displays stat card values from API', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    await waitFor(() => {
      expect(screen.getByText('1,240')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('1,100')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('340ms')).toBeInTheDocument();
  });

  // ─── 3. Tab navigation ──────────────────────────────────────────────────────

  it('renders all 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    // "Pending Review" is a tab
    const pendingReviewEls = screen.getAllByText('Pending Review');
    expect(pendingReviewEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('All Screenings')).toBeInTheDocument();
    expect(screen.getByText('Watchlists')).toBeInTheDocument();
    expect(screen.getByText('Batch Screening')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('Pending Review tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    const tabs = screen.getAllByText('Pending Review');
    const tabButton = tabs.find((el) => el.tagName === 'BUTTON' && el.className.includes('border-'));
    expect(tabButton?.className).toContain('border-primary');
  });

  it('can switch to All Screenings tab', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('All Screenings'));
    const tab = screen.getByText('All Screenings');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Watchlists tab', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Watchlists'));
    const tab = screen.getByText('Watchlists');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Batch Screening tab', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Batch Screening'));
    const tab = screen.getByText('Batch Screening');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Analytics tab', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Analytics'));
    const tab = screen.getByText('Analytics');
    expect(tab.className).toContain('border-primary');
  });

  // ─── 4. Screening table (All Screenings tab) ────────────────────────────────

  it('renders screening data in All Screenings tab', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('All Screenings'));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  // ─── 5. Pending matches tab ──────────────────────────────────────────────────

  it('renders pending screening data on default tab', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows urgency banner when pending screenings exist', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    await waitFor(() => {
      expect(screen.getByText(/screening\(s\) with potential matches require disposition/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ─── 6. Watchlist tab ────────────────────────────────────────────────────────

  it('renders watchlist entries on Watchlists tab', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Watchlists'));
    await waitFor(() => {
      expect(screen.getByText('Sanctioned Person A')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Bad Corp Ltd')).toBeInTheDocument();
  });

  // ─── 7. Screen Name button ──────────────────────────────────────────────────

  it('renders the Screen Name button', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Screen Name')).toBeInTheDocument();
  });

  it('opens the Screen Name dialog when button is clicked', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Screen Name'));
    await waitFor(() => {
      expect(screen.getByText('Screen a name against sanctions and PEP watchlists')).toBeInTheDocument();
    });
  });

  // ─── 8. Match action buttons ─────────────────────────────────────────────────

  it('renders Confirm and False + buttons for pending matches in expanded row', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    // The pending tab is default; wait for data to appear, then expand row
    await waitFor(() => {
      expect(screen.getByText('SCR-00001')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Find the expand button (ChevronRight icon button)
    const expandButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg') && btn.className.includes('hover:bg-muted'),
    );
    if (expandButtons.length > 0) {
      fireEvent.click(expandButtons[0]);
      await waitFor(() => {
        // Multiple matches may exist (one per pending match)
        const confirmBtns = screen.getAllByText('Confirm');
        expect(confirmBtns.length).toBeGreaterThanOrEqual(1);
        const falsePlusBtns = screen.getAllByText('False +');
        expect(falsePlusBtns.length).toBeGreaterThanOrEqual(1);
      }, { timeout: 3000 });
    }
  });

  // ─── 9. Error handling ───────────────────────────────────────────────────────

  it('handles stats API error gracefully and still renders header', () => {
    server.use(
      http.get('/api/v1/sanctions/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/pending', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/watchlists', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/matches', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/batch-screen', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Sanctions & PEP Screening')).toBeInTheDocument();
  });

  it('still renders page when all API calls fail', async () => {
    server.use(
      http.get('/api/v1/sanctions/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions/pending', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions/watchlists', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions/matches', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions/batch-screen', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<SanctionsScreeningPage />);
    // Page header and tabs should still render even when APIs fail
    expect(screen.getByText('Sanctions & PEP Screening')).toBeInTheDocument();
    expect(screen.getByText('All Screenings')).toBeInTheDocument();
  });

  it('displays -- for stat values when stats API fails', async () => {
    server.use(
      http.get('/api/v1/sanctions/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/pending', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/watchlists', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/matches', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/batch-screen', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<SanctionsScreeningPage />);
    await waitFor(() => {
      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });
  });

  // ─── 10. Empty state handling ────────────────────────────────────────────────

  it('shows empty message on Pending Review tab when no pending screenings', async () => {
    setupHandlers({ pending: [] });
    renderWithProviders(<SanctionsScreeningPage />);
    await waitFor(() => {
      expect(screen.getByText('No screenings pending review')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows empty message on All Screenings tab when no screenings exist', async () => {
    setupHandlers({ screenings: [] });
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('All Screenings'));
    await waitFor(() => {
      expect(screen.getByText('No screenings found')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows empty message on Watchlists tab when no watchlist entries exist', async () => {
    setupHandlers({ watchlists: [] });
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Watchlists'));
    await waitFor(() => {
      expect(screen.getByText('No watchlist entries')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('does not show urgency banner when no pending screenings exist', async () => {
    setupHandlers({ pending: [] });
    renderWithProviders(<SanctionsScreeningPage />);
    await waitFor(() => {
      expect(screen.getByText('No screenings pending review')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.queryByText(/require disposition/i)).not.toBeInTheDocument();
  });

  // ─── 11. Additional coverage ─────────────────────────────────────────────────

  it('does not show stat cards while stats are loading', () => {
    server.use(
      http.get('/api/v1/sanctions/stats', () => new Promise(() => {})),
      http.get('/api/v1/sanctions', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/pending', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/watchlists', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/matches', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/sanctions/batch-screen', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.queryByText('1,240')).not.toBeInTheDocument();
  });

  it('renders Batch Screening tab content with textarea and submit button', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Batch Screening'));
    await waitFor(() => {
      expect(screen.getByText('Batch Screen Names')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Screen All')).toBeInTheDocument();
  });

  it('renders Analytics tab content with chart headings', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Screenings by Outcome')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Matches by Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Hit Rate')).toBeInTheDocument();
    expect(screen.getByText('False Positive Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Screening Time')).toBeInTheDocument();
    // "Total Screenings" appears in both stat cards and analytics
    const totalScreeningsEls = screen.getAllByText('Total Screenings');
    expect(totalScreeningsEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders tabs as button elements', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    const allScreeningsTab = screen.getByText('All Screenings');
    expect(allScreeningsTab.tagName).toBe('BUTTON');
  });

  it('renders status filter dropdowns on All Screenings tab', async () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    fireEvent.click(screen.getByText('All Screenings'));
    await waitFor(() => {
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });
});
