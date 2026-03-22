import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { ScreeningDetailPage } from './ScreeningDetailPage';

const SCREENING_ID = 3;

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockScreeningWithMatches = {
  id: SCREENING_ID,
  screeningRef: 'SCR-DETAIL-001',
  screeningType: 'ONBOARDING',
  subjectName: 'John Suspect',
  subjectType: 'INDIVIDUAL',
  subjectDob: '1975-04-15',
  subjectNationality: 'IR',
  subjectIdNumber: 'ID-12345',
  customerId: 99,
  transactionRef: null,
  listsScreened: ['OFAC_SDN', 'UN_CONSOLIDATED', 'EU_CONSOLIDATED'],
  matchThreshold: 85,
  totalMatches: 2,
  trueMatches: 0,
  falsePositives: 0,
  status: 'POTENTIAL_MATCH',
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  screeningTimeMs: 320,
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
  matches: [
    {
      id: 201,
      screeningId: SCREENING_ID,
      watchlistId: 1,
      watchlistName: 'John Suspect (OFAC)',
      watchlistSource: 'OFAC_SDN',
      matchScore: 95,
      matchedFields: ['NAME', 'DOB'],
      matchType: 'EXACT',
      disposition: 'PENDING',
      disposedBy: null,
      disposedAt: null,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 202,
      screeningId: SCREENING_ID,
      watchlistId: 2,
      watchlistName: 'J. Suspect Jr.',
      watchlistSource: 'UN_CONSOLIDATED',
      matchScore: 87,
      matchedFields: ['NAME'],
      matchType: 'FUZZY',
      disposition: 'PENDING',
      disposedBy: null,
      disposedAt: null,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

const mockScreeningClear = {
  id: SCREENING_ID,
  screeningRef: 'SCR-DETAIL-001',
  screeningType: 'PERIODIC',
  subjectName: 'Clean Customer',
  subjectType: 'INDIVIDUAL',
  subjectDob: null,
  subjectNationality: 'NG',
  subjectIdNumber: null,
  customerId: 100,
  transactionRef: null,
  listsScreened: ['OFAC_SDN'],
  matchThreshold: 85,
  totalMatches: 0,
  trueMatches: 0,
  falsePositives: 0,
  status: 'CLEAR',
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  screeningTimeMs: 180,
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
  matches: [],
};

function setupHandlers(screeningData = mockScreeningWithMatches) {
  server.use(
    http.get('/api/v1/sanctions', () => HttpResponse.json(wrap([screeningData]))),
    http.post(`/api/v1/sanctions/matches/${SCREENING_ID}/confirm`, () =>
      HttpResponse.json(wrap({ ...screeningData, status: 'CONFIRMED_MATCH', trueMatches: 2 })),
    ),
    http.post(`/api/v1/sanctions/matches/${SCREENING_ID}/false-positive`, () =>
      HttpResponse.json(wrap({ ...screeningData, status: 'CLEAR', falsePositives: 2 })),
    ),
  );
}

const ROUTE_PATH = '/compliance/sanctions/screenings/:id';

function renderPage(screeningData = mockScreeningWithMatches) {
  setupHandlers(screeningData);
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<ScreeningDetailPage />} />
    </Routes>,
    { route: `/compliance/sanctions/screenings/${SCREENING_ID}` },
  );
}

describe('ScreeningDetailPage', () => {
  // ── 1. Loading and initial render ────────────────────────────────────────────

  it('renders the screening ref in the page header', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SCR-DETAIL-001')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders subject name and screening type', async () => {
    renderPage();

    await waitFor(() => {
      const els = screen.getAllByText('John Suspect');
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    expect(screen.getByText('ONBOARDING')).toBeInTheDocument();
  });

  it('renders lists screened', async () => {
    renderPage();

    await waitFor(() => {
      const els = screen.getAllByText(/OFAC/i);
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('shows not-found state when screening id is not in list', async () => {
    server.use(
      http.get('/api/v1/sanctions', () => HttpResponse.json(wrap([]))),
    );

    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<ScreeningDetailPage />} />
      </Routes>,
      { route: `/compliance/sanctions/screenings/${SCREENING_ID}` },
    );

    await waitFor(() => {
      // EmptyState renders a title "Screening not found"
      const notFoundEls = screen.getAllByText(/not found/i);
      expect(notFoundEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  // ── 2. Matches display ───────────────────────────────────────────────────────

  it('renders match cards for each potential match', async () => {
    renderPage();

    await waitFor(() => {
      const els = screen.getAllByText('John Suspect (OFAC)');
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const jrEls = screen.getAllByText('J. Suspect Jr.');
    expect(jrEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders match scores for pending matches', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('renders Confirm True Match and Mark False Positive buttons for pending matches', async () => {
    renderPage();

    await waitFor(() => {
      const confirmBtns = screen.getAllByText('Confirm True Match');
      expect(confirmBtns.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const fpBtns = screen.getAllByText('Mark False Positive');
    expect(fpBtns.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Confirm True Match action ─────────────────────────────────────────────

  it('calls POST /sanctions/matches/:screeningId/confirm when confirming match', async () => {
    let confirmCalledId: string | null = null;
    renderPage();

    // Register spy AFTER renderPage so it takes priority
    server.use(
      http.post('/api/v1/sanctions/matches/:id/confirm', ({ params }) => {
        confirmCalledId = params.id as string;
        return HttpResponse.json(wrap({ ...mockScreeningWithMatches, status: 'CONFIRMED_MATCH' }));
      }),
    );

    await waitFor(() => {
      const confirmBtns = screen.getAllByText('Confirm True Match');
      expect(confirmBtns.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    // Click Confirm True Match on the first match card
    fireEvent.click(screen.getAllByText('Confirm True Match')[0]);

    // The confirm dialog requires a notes field
    await waitFor(() => {
      expect(screen.getByText('Confirm True Match?')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Fill in required notes
    const notesTextarea = screen.getByPlaceholderText(/Provide justification/i);
    fireEvent.change(notesTextarea, { target: { value: 'Match confirmed based on DOB and name' } });

    // Dialog is rendered BEFORE the card's action button in the DOM (line 132 of ScreeningDetailPage)
    // So DOM order: [0]=dialog-confirm-btn, [1]=card1-action-btn, [2]=card2-action-btn
    const confirmDialogBtns = screen.getAllByRole('button', { name: /Confirm True Match/i });
    fireEvent.click(confirmDialogBtns[0]);

    await waitFor(() => {
      // The endpoint is called with the SCREENING_ID (not the match entity ID 201 or 202)
      expect(confirmCalledId).toBe(String(SCREENING_ID));
    }, { timeout: 3000 });
  });

  // ── 4. Clear screening ───────────────────────────────────────────────────────

  it('renders CLEAR status badge for clear screenings', async () => {
    renderPage(mockScreeningClear);

    await waitFor(() => {
      expect(screen.getByText('Clean Customer')).toBeInTheDocument();
    }, { timeout: 3000 });

    const clearEls = screen.getAllByText('CLEAR');
    expect(clearEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows zero matches message for clear screenings', async () => {
    renderPage(mockScreeningClear);

    await waitFor(() => {
      const noMatchEls = screen.getAllByText(/no match/i);
      expect(noMatchEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  // ── 5. Screening metadata ─────────────────────────────────────────────────────

  it('renders screening time and total match count', async () => {
    renderPage();

    await waitFor(() => {
      // 320ms screening time displayed
      expect(screen.getByText(/320ms/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // 2 total matches
    const twoEls = screen.getAllByText('2');
    expect(twoEls.length).toBeGreaterThanOrEqual(1);
  });
});
