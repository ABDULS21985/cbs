import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import CollectionsPage from './CollectionsPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const stats = {
  totalDelinquent: 800000,
  cases: 2,
  recoveredMtd: 200000,
  writtenOffMtd: 50000,
};

const aging = [
  { bucket: '1-30', amount: 220000, count: 4 },
  { bucket: '91-180', amount: 310000, count: 2 },
  { bucket: '180+', amount: 270000, count: 1 },
];

const cases = [
  {
    id: 41,
    caseNumber: 'COL-00041',
    loanNumber: 'LN000041',
    customerId: 91,
    customerName: 'Grace Okafor',
    outstanding: 450000,
    dpd: 122,
    bucket: '91-180',
    classification: 'DOUBTFUL',
    assignedTo: 'Tobi',
    lastAction: 'Promise to pay logged',
    lastActionDate: '2026-03-20',
    nextActionDue: '2026-03-25',
    currency: 'NGN',
  },
  {
    id: 42,
    caseNumber: 'COL-00042',
    loanNumber: 'LN000042',
    customerId: 92,
    customerName: 'Bello Farms',
    outstanding: 350000,
    dpd: 45,
    bucket: '31-60',
    classification: 'SUBSTANDARD',
    assignedTo: null,
    lastAction: 'Call attempt',
    lastActionDate: '2026-03-22',
    nextActionDue: '2026-03-24',
    currency: 'NGN',
  },
];

const dunningQueue = [
  {
    id: 41,
    loanNumber: 'LN000041',
    customerName: 'Grace Okafor',
    dpd: 122,
    nextAction: 'LEGAL_NOTICE',
    dueDate: '2026-03-24',
    phone: '+2348011111111',
    outcome: 'Awaiting formal notice',
  },
];

const writeOffRequests = [
  {
    id: 7,
    loanNumber: 'LN000060',
    customerName: 'Apex Manufacturing',
    outstanding: 600000,
    provisionHeld: 480000,
    recoveryProbability: 18,
    requestedBy: 'collections.lead',
    status: 'PENDING',
    requestedAt: '2026-03-21',
  },
];

const recovery = [
  {
    id: 3,
    loanNumber: 'LN000010',
    writtenOff: 300000,
    writeOffDate: '2026-02-18',
    recovered: 85000,
    recoveryPct: 28.3,
    lastRecovery: '2026-03-18',
    agent: 'Ngozi',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/collections/stats', () => HttpResponse.json(wrap(stats))),
    http.get('/api/v1/collections/dpd-aging', () => HttpResponse.json(wrap(aging))),
    http.get('/api/v1/collections/cases', () => HttpResponse.json(wrap(cases))),
    http.get('/api/v1/collections/dunning-queue', () => HttpResponse.json(wrap(dunningQueue))),
    http.get('/api/v1/collections/write-off-requests', () => HttpResponse.json(wrap(writeOffRequests))),
    http.get('/api/v1/collections/recovery', () => HttpResponse.json(wrap(recovery))),
  );
}

function renderPage(route = '/lending/collections') {
  return renderWithProviders(
    <Routes>
      <Route path="/lending/collections" element={<CollectionsPage />} />
      <Route path="/lending/collections/cases/:id" element={<div>Collection case detail</div>} />
    </Routes>,
    { route },
  );
}

describe('CollectionsPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders API-driven collections metrics and efficiency', async () => {
    setupHandlers();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Collections & Recovery')).toBeInTheDocument();
      expect(screen.getByText('20.0%')).toBeInTheDocument();
      expect(screen.getByText('Grace Okafor')).toBeInTheDocument();
    });
  });

  it('opens collection case detail from the active cases table', async () => {
    setupHandlers();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('LN000041')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('LN000041'));

    await waitFor(() => {
      expect(screen.getByText('Collection case detail')).toBeInTheDocument();
    });
  });

  it('respects the tab query param for the write-off workspace', async () => {
    setupHandlers();

    renderPage('/lending/collections?tab=write-offs');

    await waitFor(() => {
      expect(screen.getByText('Submit Write-Off Request')).toBeInTheDocument();
      expect(screen.getByText('Apex Manufacturing')).toBeInTheDocument();
    });
  });
});
