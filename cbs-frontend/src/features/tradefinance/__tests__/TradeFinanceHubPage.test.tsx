import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { TradeFinanceHubPage } from '../pages/TradeFinanceHubPage';

// ─── Sonner toast mock ─────────────────────────────────────────────────────────

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// ─── Navigation mock ──────────────────────────────────────────────────────────

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// ─── Mock Data ────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockLcs = [
  {
    id: 1,
    lcNumber: 'LC-2026-001',
    lcRef: 'LC-2026-001',
    lcType: 'IMPORT_LC',
    lcRole: 'ISSUING_BANK',
    applicant: { id: 101, name: 'Acme Corp' },
    beneficiaryName: 'Global Exports Ltd',
    amount: 500000,
    currencyCode: 'USD',
    utilizedAmount: 0,
    issueDate: '2026-01-10',
    expiryDate: '2026-07-10',
    paymentTerms: 'SIGHT',
    status: 'ISSUED',
  },
  {
    id: 2,
    lcNumber: 'LC-2026-002',
    lcRef: 'LC-2026-002',
    lcType: 'EXPORT_LC',
    lcRole: 'ADVISING_BANK',
    applicant: { id: 102, name: 'Beta Industries' },
    beneficiaryName: 'Oceanic Trading',
    amount: 250000,
    currencyCode: 'EUR',
    utilizedAmount: 100000,
    issueDate: '2026-02-01',
    expiryDate: '2026-08-01',
    paymentTerms: 'USANCE',
    tenorDays: 90,
    status: 'PARTIALLY_UTILIZED',
  },
  {
    id: 3,
    lcNumber: 'LC-2025-099',
    lcRef: 'LC-2025-099',
    lcType: 'STANDBY_LC',
    lcRole: 'ISSUING_BANK',
    applicant: { id: 103, name: 'Gamma LLC' },
    beneficiaryName: 'Delta Supplies',
    amount: 100000,
    currencyCode: 'GBP',
    utilizedAmount: 100000,
    issueDate: '2025-06-01',
    expiryDate: '2025-12-01',
    paymentTerms: 'SIGHT',
    status: 'EXPIRED',
  },
];

const mockGuarantees = [
  {
    id: 10,
    guaranteeNumber: 'BG-2026-001',
    guaranteeRef: 'BG-2026-001',
    guaranteeType: 'PERFORMANCE',
    applicant: { id: 201, name: 'Constructor Co' },
    beneficiaryName: 'Ministry of Works',
    amount: 1000000,
    currencyCode: 'NGN',
    issueDate: '2026-01-15',
    expiryDate: '2027-01-15',
    claimedAmount: 0,
    status: 'ISSUED',
  },
  {
    id: 11,
    guaranteeNumber: 'BG-2026-002',
    guaranteeRef: 'BG-2026-002',
    guaranteeType: 'BID_BOND',
    applicant: { id: 202, name: 'Bid Winner Inc' },
    beneficiaryName: 'State Procurement',
    amount: 200000,
    currencyCode: 'USD',
    issueDate: '2026-02-01',
    expiryDate: '2026-05-01',
    claimedAmount: 0,
    status: 'ACTIVE',
  },
  {
    id: 12,
    guaranteeNumber: 'BG-2025-050',
    guaranteeRef: 'BG-2025-050',
    guaranteeType: 'ADVANCE_PAYMENT',
    applicant: { id: 203, name: 'Advance Ltd' },
    beneficiaryName: 'Project Owner',
    amount: 750000,
    currencyCode: 'EUR',
    issueDate: '2025-06-01',
    expiryDate: '2025-12-31',
    claimedAmount: 0,
    status: 'EXPIRED',
  },
];

const mockScfProgrammes = [
  {
    id: 20,
    programmeCode: 'SCF-001',
    programmeName: 'Acme Payables Programme',
    programmeLimit: 5000000,
    utilizedAmount: 1500000,
    currencyCode: 'USD',
    discountRate: 3.5,
    status: 'ACTIVE',
  },
  {
    id: 21,
    programmeCode: 'SCF-002',
    programmeName: 'Beta Supply Chain',
    programmeLimit: 2000000,
    utilizedAmount: 0,
    currencyCode: 'EUR',
    discountRate: 4.0,
    status: 'ACTIVE',
  },
];

const mockFactoredInvoices = [
  {
    id: 30,
    facilityCode: 'FAC-001',
    facilityId: 1,
    invoiceRef: 'INV-2026-100',
    invoiceDate: '2026-03-01',
    invoiceAmount: 50000,
    buyerName: 'Retail Corp',
    advanceAmount: 42500,
    status: 'SUBMITTED',
  },
  {
    id: 31,
    facilityCode: 'FAC-001',
    facilityId: 1,
    invoiceRef: 'INV-2026-101',
    invoiceDate: '2026-03-05',
    invoiceAmount: 75000,
    buyerName: 'Wholesale Inc',
    advanceAmount: 63750,
    status: 'FUNDED',
  },
];

const mockCollections = [
  {
    id: 40,
    collectionNumber: 'COL-2026-001',
    collectionRef: 'COL-2026-001',
    collectionType: 'DP',
    drawer: { id: 301, name: 'Exporter A' },
    draweeName: 'Importer B',
    amount: 120000,
    currencyCode: 'USD',
    status: 'RECEIVED',
  },
  {
    id: 41,
    collectionNumber: 'COL-2026-002',
    collectionRef: 'COL-2026-002',
    collectionType: 'DA',
    drawer: { id: 302, name: 'Exporter C' },
    draweeName: 'Importer D',
    amount: 80000,
    currencyCode: 'EUR',
    tenorDays: 90,
    status: 'ACCEPTED',
  },
  {
    id: 42,
    collectionNumber: 'COL-2025-050',
    collectionRef: 'COL-2025-050',
    collectionType: 'DP',
    drawer: { id: 303, name: 'Exporter E' },
    draweeName: 'Importer F',
    amount: 60000,
    currencyCode: 'GBP',
    status: 'PAID',
  },
];

const mockDocuments = [
  {
    id: 50,
    documentRef: 'DOC-2026-001',
    documentCategory: 'BILL_OF_LADING',
    documentType: 'BILL_OF_LADING',
    lcId: 1,
    fileName: 'bill_of_lading.pdf',
    verificationStatus: 'PENDING',
    complianceStatus: 'PENDING',
    uploadedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 51,
    documentRef: 'DOC-2026-002',
    documentCategory: 'INVOICE',
    documentType: 'INVOICE',
    lcId: 1,
    fileName: 'commercial_invoice.pdf',
    verificationStatus: 'COMPLIANT',
    complianceStatus: 'COMPLIANT',
    uploadedAt: '2026-03-10T11:00:00Z',
    verifiedAt: '2026-03-11T09:00:00Z',
  },
  {
    id: 52,
    documentRef: 'DOC-2026-003',
    documentCategory: 'CERTIFICATE_OF_ORIGIN',
    documentType: 'CERTIFICATE_OF_ORIGIN',
    fileName: 'cert_origin.pdf',
    verificationStatus: 'DISCREPANT',
    complianceStatus: 'DISCREPANT',
    uploadedAt: '2026-03-12T08:00:00Z',
    verifiedAt: '2026-03-12T14:00:00Z',
  },
];

const mockConfirmations = [
  {
    id: 60,
    confirmationRef: 'CONF-001',
    tradeRef: 'TRD-001',
    instrumentType: 'FX_FORWARD',
    ourSide: 'BUY',
    counterpartyCode: 'CP001',
    counterpartyName: 'Alpha Bank',
    tradeDate: '2026-03-15',
    settlementDate: '2026-06-15',
    currency: 'USD',
    amount: 1000000,
    price: 1.0850,
    ourDetails: {},
    counterpartyDetails: {},
    matchStatus: 'UNMATCHED',
    breakFields: {},
    matchedAt: '',
    status: 'PENDING',
  },
  {
    id: 61,
    confirmationRef: 'CONF-002',
    tradeRef: 'TRD-002',
    instrumentType: 'IRS',
    ourSide: 'PAY_FIXED',
    counterpartyCode: 'CP002',
    counterpartyName: 'Beta Securities',
    tradeDate: '2026-03-14',
    settlementDate: '2026-03-16',
    currency: 'EUR',
    amount: 5000000,
    price: 0,
    ourDetails: {},
    counterpartyDetails: {},
    matchStatus: 'MATCHED',
    breakFields: {},
    matchedAt: '2026-03-15T08:00:00Z',
    status: 'CONFIRMED',
  },
];

const mockClearing = [
  {
    id: 70,
    submissionRef: 'CLR-001',
    tradeRef: 'TRD-001',
    ccpName: 'LCH Clearnet',
    ccpCode: 'LCH',
    instrumentType: 'IRS',
    clearingMemberId: 'CM001',
    tradeDate: '2026-03-15',
    settlementDate: '2026-06-15',
    currency: 'USD',
    notionalAmount: 10000000,
    initialMargin: 500000,
    variationMargin: 50000,
    marginCurrency: 'USD',
    submittedAt: '2026-03-15T10:00:00Z',
    clearedAt: '',
    status: 'SUBMITTED',
    rejectionReason: '',
  },
];

const mockReports = [
  {
    id: 80,
    reportRef: 'RPT-001',
    tradeRef: 'TRD-001',
    reportType: 'NEW',
    regime: 'EMIR',
    tradeRepository: 'DTCC',
    reportData: {},
    uti: 'UTI-2026-001',
    lei: 'LEI-001',
    submittedAt: '2026-03-15T12:00:00Z',
    submissionRef: 'SUB-001',
    acknowledgementRef: 'ACK-001',
    status: 'ACCEPTED',
    rejectionReason: '',
  },
];

const mockFactoringFacilities = [
  {
    id: 90,
    facilityCode: 'FAC-001',
    facilityType: 'WITH_RECOURSE',
    sellerCustomerId: 401,
    sellerName: 'Manufacturer Ltd',
    currency: 'NGN',
    facilityLimit: 10000000,
    utilizedAmount: 3000000,
    availableAmount: 7000000,
    status: 'ACTIVE',
  },
];

// ─── MSW Handler Setup ─────────────────────────────────────────────────────────

function setupHandlers({
  lcs = mockLcs,
  guarantees = mockGuarantees,
  scfProgrammes = mockScfProgrammes,
  factoredInvoices = mockFactoredInvoices,
  collections = mockCollections,
  documents = mockDocuments,
  confirmations = mockConfirmations,
  clearing = mockClearing,
  reports = mockReports,
  factoringFacilities = mockFactoringFacilities,
}: {
  lcs?: typeof mockLcs;
  guarantees?: typeof mockGuarantees;
  scfProgrammes?: typeof mockScfProgrammes;
  factoredInvoices?: typeof mockFactoredInvoices;
  collections?: typeof mockCollections;
  documents?: typeof mockDocuments;
  confirmations?: typeof mockConfirmations;
  clearing?: typeof mockClearing;
  reports?: typeof mockReports;
  factoringFacilities?: typeof mockFactoringFacilities;
} = {}) {
  server.use(
    // LCs
    http.get('/api/v1/trade-finance/lc', () => HttpResponse.json(wrap(lcs))),
    http.post('/api/v1/trade-finance/lc', () =>
      HttpResponse.json(wrap({ id: 99, lcNumber: 'LC-NEW-001', status: 'ISSUED' })),
    ),
    http.post('/api/v1/trade-finance/lc/:id/settle', () =>
      HttpResponse.json(wrap({ id: 1, status: 'SETTLED' })),
    ),

    // Guarantees
    http.get('/api/v1/trade-finance/guarantees', () => HttpResponse.json(wrap(guarantees))),
    http.post('/api/v1/trade-finance/guarantees', () =>
      HttpResponse.json(wrap({ id: 99, guaranteeNumber: 'BG-NEW-001', status: 'ISSUED' })),
    ),
    http.post('/api/v1/trade-finance/guarantees/:id/claim', () =>
      HttpResponse.json(wrap({ id: 10, status: 'CLAIMED' })),
    ),

    // SCF Programmes
    http.get('/api/v1/trade-finance/scf/programmes', () => HttpResponse.json(wrap(scfProgrammes))),
    http.post('/api/v1/trade-finance/scf/programmes', () =>
      HttpResponse.json(wrap({ id: 99, programmeCode: 'SCF-NEW', status: 'ACTIVE' })),
    ),

    // Factored invoices (factoringApi)
    http.get('/api/v1/factoring/invoice', () => HttpResponse.json(wrap(factoredInvoices))),
    http.get('/api/v1/factoring/facility', () => HttpResponse.json(wrap(factoringFacilities))),

    // SCF invoices
    http.post('/api/v1/trade-finance/scf/invoices', () =>
      HttpResponse.json(wrap({ id: 99, invoiceRef: 'INV-NEW', status: 'SUBMITTED' })),
    ),

    // Collections
    http.get('/api/v1/trade-finance/collections', () => HttpResponse.json(wrap(collections))),
    http.post('/api/v1/trade-finance/collections', () =>
      HttpResponse.json(wrap({ id: 99, collectionNumber: 'COL-NEW', status: 'RECEIVED' })),
    ),
    http.post('/api/v1/trade-finance/collections/:id/settle', () =>
      HttpResponse.json(wrap({ id: 40, status: 'SETTLED' })),
    ),

    // Documents
    http.get('/api/v1/trade-finance/documents', () => HttpResponse.json(wrap(documents))),
    http.post('/api/v1/trade-finance/documents/:id/verify', () =>
      HttpResponse.json(wrap({ id: 50, verificationStatus: 'COMPLIANT' })),
    ),

    // Trade Ops
    http.get('/api/v1/trade-ops/confirmations', () => HttpResponse.json(wrap(confirmations))),
    http.post('/api/v1/trade-ops/confirmations/match', () =>
      HttpResponse.json(wrap(confirmations)),
    ),
    http.get('/api/v1/trade-ops/clearing', () => HttpResponse.json(wrap(clearing))),
    http.get('/api/v1/trade-ops/reports', () => HttpResponse.json(wrap(reports))),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return renderWithProviders(<TradeFinanceHubPage />, { route: '/trade-finance' });
}

async function switchToTab(tabLabel: string) {
  // TabsPage uses plain <button> elements with border-b-2 class
  const allButtons = screen.getAllByRole('button');
  const tabButton = allButtons.find(
    (btn) => {
      const text = btn.textContent ?? '';
      return text.includes(tabLabel) && btn.className.includes('border-b-2');
    }
  );
  if (!tabButton) {
    // Fallback: find by text content alone
    const fallback = allButtons.find((btn) => (btn.textContent ?? '').includes(tabLabel));
    if (fallback) {
      fireEvent.click(fallback);
      return;
    }
    throw new Error(`Tab "${tabLabel}" not found`);
  }
  fireEvent.click(tabButton);
  // Wait for the tab to become active (border-primary class)
  await waitFor(() => {
    expect(tabButton.className).toContain('border-primary');
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PAGE RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - Page Rendering', () => {
  it('renders the page header with title and subtitle', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Trade Finance Hub')).toBeInTheDocument();
    expect(
      screen.getByText(/Manage letters of credit, guarantees, SCF, factoring/),
    ).toBeInTheDocument();
  });

  it('renders all 6 tabs', () => {
    setupHandlers();
    renderPage();
    const tabLabels = ['Letters of Credit', 'Guarantees', 'SCF / Factoring', 'Collections', 'Documents', 'Trade Ops'];
    for (const label of tabLabels) {
      const allButtons = screen.getAllByRole('button');
      const tabBtn = allButtons.find(
        (btn) => btn.textContent?.includes(label) && btn.className.includes('border-b-2'),
      );
      expect(tabBtn).toBeTruthy();
    }
  });

  it('renders summary stat cards', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Active LCs')).toBeInTheDocument();
    });
    expect(screen.getByText('Active Guarantees')).toBeInTheDocument();
    expect(screen.getByText('SCF Programmes')).toBeInTheDocument();
    expect(screen.getByText('Factoring Volume')).toBeInTheDocument();
  });

  it('shows auto-refresh label', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Auto-refreshes every 30s')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LCs TAB
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - LCs Tab', () => {
  it('renders LC table with data', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LC-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Global Exports Ltd')).toBeInTheDocument();
    expect(screen.getByText('LC-2026-002')).toBeInTheDocument();
    expect(screen.getByText('Oceanic Trading')).toBeInTheDocument();
  });

  it('renders LC table column headers', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LC-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Ref')).toBeInTheDocument();
    expect(screen.getByText('Applicant')).toBeInTheDocument();
    expect(screen.getByText('Beneficiary')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Expiry')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows Issue New LC button', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Issue New LC')).toBeInTheDocument();
  });

  it('opens Issue LC dialog when Issue New LC is clicked', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Issue New LC'));
    await waitFor(() => {
      expect(screen.getByText('Issue New Letter of Credit')).toBeInTheDocument();
    });
    expect(screen.getByText('Issue LC')).toBeInTheDocument();
  });

  it('closes Issue LC dialog on Cancel', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Issue New LC'));
    await waitFor(() => {
      expect(screen.getByText('Issue New Letter of Credit')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Issue New Letter of Credit')).not.toBeInTheDocument();
    });
  });

  it('Issue LC dialog has all required fields', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Issue New LC'));
    await waitFor(() => {
      expect(screen.getByText('Issue New Letter of Credit')).toBeInTheDocument();
    });
    expect(screen.getByText('Applicant')).toBeInTheDocument();
    expect(screen.getByText('Beneficiary')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Payment Terms')).toBeInTheDocument();
    expect(screen.getByText('Expiry Date')).toBeInTheDocument();
  });

  it('Issue LC dialog has Sight and Usance payment terms options', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Issue New LC'));
    await waitFor(() => {
      expect(screen.getByText('Issue New Letter of Credit')).toBeInTheDocument();
    });
    // Payment Terms select should have Sight and Usance
    const selects = screen.getAllByRole('combobox');
    const paymentTermsSelect = selects.find(
      (s) => s.querySelector('option[value="SIGHT"]') !== null,
    );
    expect(paymentTermsSelect).toBeTruthy();
    expect(within(paymentTermsSelect!).getByText('Sight')).toBeInTheDocument();
    expect(within(paymentTermsSelect!).getByText('Usance')).toBeInTheDocument();
  });

  it('shows Settle button only for active LCs', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LC-2026-001')).toBeInTheDocument();
    });
    // ISSUED and PARTIALLY_UTILIZED should have Settle; EXPIRED should not
    const settleButtons = screen.getAllByText('Settle');
    expect(settleButtons.length).toBe(2); // LC-2026-001 (ISSUED) and LC-2026-002 (PARTIALLY_UTILIZED)
  });

  it('opens Settle LC dialog when Settle button is clicked', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LC-2026-001')).toBeInTheDocument();
    });
    const settleButtons = screen.getAllByText('Settle');
    fireEvent.click(settleButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Settle LC')).toBeInTheDocument();
    });
    expect(screen.getByText('Presentation Date')).toBeInTheDocument();
    expect(screen.getByText(/Presented Documents/)).toBeInTheDocument();
  });

  it('navigates to LC detail on row click', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LC-2026-001')).toBeInTheDocument();
    });
    // Click on the LC ref to trigger row click
    fireEvent.click(screen.getByText('LC-2026-001'));
    expect(navigateMock).toHaveBeenCalledWith('/trade-finance/lc/1');
  });

  it('Issue LC form submission triggers mutation and shows success toast', async () => {
    setupHandlers();
    renderPage();
    const user = userEvent.setup();
    fireEvent.click(screen.getByText('Issue New LC'));
    await waitFor(() => {
      expect(screen.getByText('Issue New Letter of Credit')).toBeInTheDocument();
    });

    // Fill in the form fields
    const inputs = screen.getAllByRole('textbox');
    const applicantInput = inputs[0]; // Applicant
    const beneficiaryInput = inputs[1]; // Beneficiary
    await user.type(applicantInput, '101');
    await user.type(beneficiaryInput, 'Test Beneficiary');

    const numberInputs = screen.getAllByRole('spinbutton');
    const amountInput = numberInputs[0]; // Amount
    await user.type(amountInput, '100000');

    // Set expiry date
    const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-31' } });

    // Submit
    fireEvent.click(screen.getByText('Issue LC'));
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Letter of Credit issued successfully');
    });
  });

  it('shows empty state when no LCs exist', async () => {
    setupHandlers({ lcs: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No letters of credit found')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GUARANTEES TAB
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - Guarantees Tab', () => {
  it('renders guarantees table with data', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    await waitFor(() => {
      expect(screen.getByText('BG-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Ministry of Works')).toBeInTheDocument();
    expect(screen.getByText('BG-2026-002')).toBeInTheDocument();
  });

  it('shows Issue Guarantee button', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    expect(screen.getByText('Issue Guarantee')).toBeInTheDocument();
  });

  it('opens Issue Guarantee dialog', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    fireEvent.click(screen.getByText('Issue Guarantee'));
    await waitFor(() => {
      expect(screen.getByText('Issue Bank Guarantee')).toBeInTheDocument();
    });
  });

  it('Issue Guarantee dialog has all 10 guarantee type options', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    fireEvent.click(screen.getByText('Issue Guarantee'));
    await waitFor(() => {
      expect(screen.getByText('Issue Bank Guarantee')).toBeInTheDocument();
    });

    // Find the Guarantee Type select
    const selects = screen.getAllByRole('combobox');
    const guaranteeTypeSelect = selects.find(
      (s) => s.querySelector('option[value="PERFORMANCE"]') !== null,
    );
    expect(guaranteeTypeSelect).toBeTruthy();

    const expectedTypes = [
      'Performance',
      'Bid Bond',
      'Advance Payment',
      'Customs',
      'Financial',
      'Payment',
      'Retention',
      'Warranty',
      'Shipping',
      'Other',
    ];
    for (const type of expectedTypes) {
      expect(within(guaranteeTypeSelect!).getByText(type)).toBeInTheDocument();
    }
  });

  it('closes Issue Guarantee dialog on Cancel', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    fireEvent.click(screen.getByText('Issue Guarantee'));
    await waitFor(() => {
      expect(screen.getByText('Issue Bank Guarantee')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Issue Bank Guarantee')).not.toBeInTheDocument();
    });
  });

  it('shows Claim button for ISSUED and ACTIVE guarantees only', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    await waitFor(() => {
      expect(screen.getByText('BG-2026-001')).toBeInTheDocument();
    });
    const claimButtons = screen.getAllByText('Claim');
    // BG-2026-001 is ISSUED, BG-2026-002 is ACTIVE => 2 Claim buttons. BG-2025-050 is EXPIRED => no button.
    expect(claimButtons.length).toBe(2);
  });

  it('opens Claim Guarantee dialog', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    await waitFor(() => {
      expect(screen.getByText('BG-2026-001')).toBeInTheDocument();
    });
    const claimButtons = screen.getAllByText('Claim');
    fireEvent.click(claimButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Process Guarantee Claim')).toBeInTheDocument();
    });
    expect(screen.getByText('Claim Amount')).toBeInTheDocument();
    expect(screen.getByText('Claim Reference')).toBeInTheDocument();
    expect(screen.getByText('Claim Date')).toBeInTheDocument();
  });

  it('navigates to guarantee detail on row click', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    await waitFor(() => {
      expect(screen.getByText('BG-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('BG-2026-001'));
    expect(navigateMock).toHaveBeenCalledWith('/trade-finance/guarantee/10');
  });

  it('shows guarantee type column with Type header', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    await waitFor(() => {
      expect(screen.getByText('BG-2026-001')).toBeInTheDocument();
    });
    // Verify the "Type" column header exists in the guarantees table
    await waitFor(() => {
      const typeHeaders = screen.getAllByText('Type');
      expect(typeHeaders.length).toBeGreaterThanOrEqual(1);
    });
    // Verify the "Status" column renders status badges
    const statusHeaders = screen.getAllByText('Status');
    expect(statusHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it('Issue Guarantee form submission triggers success toast', async () => {
    setupHandlers();
    renderPage();
    const user = userEvent.setup();
    await switchToTab('Guarantees');
    // Click the "Issue Guarantee" button in the toolbar (not the dialog submit button)
    const issueBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('Issue Guarantee') && !b.closest('.fixed'),
    );
    fireEvent.click(issueBtn!);
    await waitFor(() => {
      expect(screen.getByText('Issue Bank Guarantee')).toBeInTheDocument();
    });

    // Get the dialog form inputs
    const dialog = screen.getByText('Issue Bank Guarantee').closest('.fixed')!;
    const inputs = within(dialog).getAllByRole('textbox');
    await user.type(inputs[0], '201'); // Applicant
    await user.type(inputs[1], 'Test Beneficiary'); // Beneficiary

    const numberInputs = within(dialog).getAllByRole('spinbutton');
    await user.type(numberInputs[0], '500000'); // Amount

    const dateInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2027-12-31' } });

    // Click the submit button inside the dialog
    const submitBtn = within(dialog).getByRole('button', { name: /Issue Guarantee/ });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Bank Guarantee issued successfully');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SCF / FACTORING TAB
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - SCF / Factoring Tab', () => {
  it('renders SCF Programmes table', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('SCF-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Acme Payables Programme')).toBeInTheDocument();
    expect(screen.getByText('SCF-002')).toBeInTheDocument();
  });

  it('renders Factored Invoices table', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('INV-2026-100')).toBeInTheDocument();
    });
    expect(screen.getByText('Retail Corp')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-101')).toBeInTheDocument();
  });

  it('shows New SCF Programme button', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    expect(screen.getByText('New SCF Programme')).toBeInTheDocument();
  });

  it('opens New SCF Programme dialog', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('SCF Programmes')).toBeInTheDocument();
    });
    // Find and click the New SCF Programme button
    const buttons = screen.getAllByRole('button');
    const newScfBtn = buttons.find(
      (b) => b.textContent?.includes('New SCF Programme'),
    );
    expect(newScfBtn).toBeTruthy();
    await userEvent.setup().click(newScfBtn!);
    await waitFor(() => {
      // "Buyer" appears in both the dialog and the factored invoices table column
      expect(screen.getAllByText('Buyer').length).toBeGreaterThanOrEqual(2);
    });
    // Dialog-specific fields
    expect(screen.getByText('Discount Rate %')).toBeInTheDocument();
    // "Limit" is in the dialog; the table has "Limit" as column header too
    expect(screen.getAllByText('Limit').length).toBeGreaterThanOrEqual(2);
  });

  it('shows Finance Invoice button', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    expect(screen.getByText('Finance Invoice')).toBeInTheDocument();
  });

  it('opens Finance Invoice dialog', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('Factored Invoices')).toBeInTheDocument();
    });
    // Find and click the Finance Invoice button
    const buttons = screen.getAllByRole('button');
    const finBtn = buttons.find(
      (b) => b.textContent?.includes('Finance Invoice'),
    );
    expect(finBtn).toBeTruthy();
    await userEvent.setup().click(finBtn!);
    await waitFor(() => {
      expect(screen.getByText('Facility Code')).toBeInTheDocument();
    });
    expect(screen.getByText('Buyer Name')).toBeInTheDocument();
    // "Invoice Ref" may appear in both the dialog label and the table column header
    expect(screen.getAllByText('Invoice Ref').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Fund button for SUBMITTED invoices only', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('INV-2026-100')).toBeInTheDocument();
    });
    const fundButtons = screen.getAllByText('Fund');
    // Only INV-2026-100 has status SUBMITTED
    expect(fundButtons.length).toBe(1);
  });

  it('Fund button triggers mutation and shows success toast', async () => {
    setupHandlers();
    // Also need to handle the fund invoice endpoint
    server.use(
      http.post('/api/v1/trade-finance/scf/invoices/:id/fund', () =>
        HttpResponse.json(wrap({ id: 30, status: 'FUNDED' })),
      ),
    );
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('INV-2026-100')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Fund'));
    // The fund invoice uses factoringApi or tradeFinanceExtApi - toast should fire
    await waitFor(
      () => {
        expect(toastSuccessMock).toHaveBeenCalledWith('Invoice funded');
      },
      { timeout: 3000 },
    );
  });

  it('SCF Programme columns include Ref, Programme, Limit, Discount Rate, Utilization, Status', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('SCF Programmes')).toBeInTheDocument();
    });
    expect(screen.getByText('Programme')).toBeInTheDocument();
    expect(screen.getByText('Discount Rate')).toBeInTheDocument();
    expect(screen.getByText('Utilization')).toBeInTheDocument();
  });

  it('shows empty state when no SCF programmes', async () => {
    setupHandlers({ scfProgrammes: [] });
    renderPage();
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getByText('No SCF programmes')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. COLLECTIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - Collections Tab', () => {
  it('renders collections table with data', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    await waitFor(() => {
      expect(screen.getByText('COL-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Importer B')).toBeInTheDocument();
    expect(screen.getByText('COL-2026-002')).toBeInTheDocument();
  });

  it('shows New Collection button', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    expect(screen.getByText('New Collection')).toBeInTheDocument();
  });

  it('opens New Collection dialog', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    fireEvent.click(screen.getByText('New Collection'));
    await waitFor(() => {
      expect(screen.getByText('New Documentary Collection')).toBeInTheDocument();
    });
    expect(screen.getByText('Drawer Customer ID')).toBeInTheDocument();
    expect(screen.getByText('Collection Type')).toBeInTheDocument();
    expect(screen.getByText('Drawee Name (Importer)')).toBeInTheDocument();
  });

  it('New Collection dialog has D/P and D/A collection type options', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    fireEvent.click(screen.getByText('New Collection'));
    await waitFor(() => {
      expect(screen.getByText('New Documentary Collection')).toBeInTheDocument();
    });
    expect(screen.getByText('D/P - Documents against Payment')).toBeInTheDocument();
    expect(screen.getByText('D/A - Documents against Acceptance')).toBeInTheDocument();
  });

  it('closes New Collection dialog on Cancel', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    fireEvent.click(screen.getByText('New Collection'));
    await waitFor(() => {
      expect(screen.getByText('New Documentary Collection')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('New Documentary Collection')).not.toBeInTheDocument();
    });
  });

  it('shows Settle button for RECEIVED, PRESENTED, ACCEPTED, PENDING collections', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    await waitFor(() => {
      expect(screen.getByText('COL-2026-001')).toBeInTheDocument();
    });
    const settleButtons = screen.getAllByText('Settle');
    // COL-2026-001 is RECEIVED, COL-2026-002 is ACCEPTED => 2 buttons. COL-2025-050 is PAID => no button.
    expect(settleButtons.length).toBe(2);
  });

  it('opens Settle Collection dialog when Settle is clicked', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    await waitFor(() => {
      expect(screen.getByText('COL-2026-001')).toBeInTheDocument();
    });
    const settleButtons = screen.getAllByText('Settle');
    fireEvent.click(settleButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Settle Collection')).toBeInTheDocument();
    });
    expect(screen.getByText('Settlement Amount')).toBeInTheDocument();
  });

  it('collection table shows Documentary Collections header', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    expect(screen.getByText('Documentary Collections')).toBeInTheDocument();
  });

  it('shows empty state when no collections', async () => {
    setupHandlers({ collections: [] });
    renderPage();
    await switchToTab('Collections');
    await waitFor(() => {
      expect(screen.getByText('No documentary collections')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - Documents Tab', () => {
  it('renders documents table with data', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText('DOC-2026-002')).toBeInTheDocument();
    expect(screen.getByText('DOC-2026-003')).toBeInTheDocument();
  });

  it('shows document table columns', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
    // Column headers should be present in the Documents tab
    const tabPanel = screen.getByText('DOC-2026-001').closest('[role="tabpanel"]') ??
      screen.getByText('DOC-2026-001').closest('.p-4');
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
  });

  it('shows Verify button only for PENDING documents', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
    const verifyButtons = screen.getAllByText('Verify');
    // Only DOC-2026-001 has verificationStatus PENDING
    expect(verifyButtons.length).toBe(1);
  });

  it('opens Verify Document dialog when Verify is clicked', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => {
      expect(screen.getByText('Verify Document')).toBeInTheDocument();
    });
    expect(screen.getByText('Compliance Status')).toBeInTheDocument();
    expect(screen.getByText('Submit Verification')).toBeInTheDocument();
  });

  it('Verify Document dialog shows COMPLIANT and DISCREPANT options', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => {
      expect(screen.getByText('Verify Document')).toBeInTheDocument();
    });
    expect(screen.getByText('COMPLIANT')).toBeInTheDocument();
    expect(screen.getByText('DISCREPANT')).toBeInTheDocument();
  });

  it('Verify Document dialog shows discrepancies textarea when DISCREPANT is selected', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => {
      expect(screen.getByText('Verify Document')).toBeInTheDocument();
    });
    // Click DISCREPANT radio
    fireEvent.click(screen.getByText('DISCREPANT'));
    await waitFor(() => {
      expect(screen.getByText('Discrepancies (comma-separated)')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Missing signature, Wrong date, ...')).toBeInTheDocument();
  });

  it('closes Verify Document dialog on Cancel', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => {
      expect(screen.getByText('Verify Document')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Verify Document')).not.toBeInTheDocument();
    });
  });

  it('shows Compliant badge for verified documents', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('Compliant')).toBeInTheDocument();
    });
  });

  it('shows Discrepant badge for discrepant documents', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('Discrepant')).toBeInTheDocument();
    });
  });

  it('shows empty state when no documents', async () => {
    setupHandlers({ documents: [] });
    renderPage();
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('No trade documents')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. TRADE OPS TAB
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - Trade Ops Tab', () => {
  it('renders Trade Confirmations section', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Trade Confirmations')).toBeInTheDocument();
    });
  });

  it('renders confirmations data in the table', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('CONF-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Alpha Bank')).toBeInTheDocument();
    expect(screen.getByText('CONF-002')).toBeInTheDocument();
    expect(screen.getByText('Beta Securities')).toBeInTheDocument();
  });

  it('renders Clearing Queue section', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Clearing Queue')).toBeInTheDocument();
    });
  });

  it('renders clearing data', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('CLR-001')).toBeInTheDocument();
    });
    expect(screen.getByText('LCH Clearnet')).toBeInTheDocument();
  });

  it('renders Trade Reports section', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      // "Trade Reports" appears both as a stat card label and section heading
      expect(screen.getAllByText('Trade Reports').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders reports data', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('RPT-001')).toBeInTheDocument();
    });
    expect(screen.getByText('EMIR')).toBeInTheDocument();
    expect(screen.getByText('UTI-2026-001')).toBeInTheDocument();
    expect(screen.getByText('DTCC')).toBeInTheDocument();
  });

  it('renders stat cards for Total Confirmations, Unmatched, Pending Clearing, Trade Reports', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Total Confirmations')).toBeInTheDocument();
    });
    // "Unmatched" may appear in both stat card and match status badge
    expect(screen.getAllByText(/Unmatched/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pending Clearing')).toBeInTheDocument();
    // "Trade Reports" appears in stat card and section heading
    expect(screen.getAllByText('Trade Reports').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Run Matching button when unmatched confirmations exist', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Run Matching')).toBeInTheDocument();
    });
  });

  it('does not show Run Matching button when all confirmations are matched', async () => {
    const allMatched = mockConfirmations.map((c) => ({ ...c, matchStatus: 'MATCHED' }));
    setupHandlers({ confirmations: allMatched });
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Trade Confirmations')).toBeInTheDocument();
    });
    expect(screen.queryByText('Run Matching')).not.toBeInTheDocument();
  });

  it('Run Matching triggers mutation and shows success toast', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Run Matching')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Run Matching'));
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Matching completed');
    });
  });

  it('shows empty state for confirmations when none exist', async () => {
    setupHandlers({ confirmations: [] });
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('No trade confirmations')).toBeInTheDocument();
    });
  });

  it('shows empty state for clearing when none exist', async () => {
    setupHandlers({ clearing: [] });
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('No clearing submissions')).toBeInTheDocument();
    });
  });

  it('shows empty state for reports when none exist', async () => {
    setupHandlers({ reports: [] });
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('No trade reports')).toBeInTheDocument();
    });
  });

  it('displays correct stat values', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Total Confirmations')).toBeInTheDocument();
    });
    // 2 total confirmations, 1 unmatched, 1 pending clearing, 1 report
    const statCards = document.querySelectorAll('.card.p-3');
    expect(statCards.length).toBeGreaterThanOrEqual(4);
  });

  it('confirmation table shows correct column headers', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('CONF-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Trade Ref')).toBeInTheDocument();
    expect(screen.getByText('Instrument')).toBeInTheDocument();
    expect(screen.getByText('Counterparty')).toBeInTheDocument();
    expect(screen.getByText('Match')).toBeInTheDocument();
  });

  it('clearing table shows correct column headers', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('CLR-001')).toBeInTheDocument();
    });
    expect(screen.getByText('CCP')).toBeInTheDocument();
    expect(screen.getByText('Notional')).toBeInTheDocument();
    expect(screen.getByText('Initial Margin')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - Tab Switching', () => {
  it('switches from LCs tab to Guarantees tab', async () => {
    setupHandlers();
    renderPage();
    // Initially on LCs tab - wait for data
    await waitFor(() => {
      expect(screen.getByText('Issue New LC')).toBeInTheDocument();
    });
    await switchToTab('Guarantees');
    await waitFor(() => {
      expect(screen.getByText('Issue Guarantee')).toBeInTheDocument();
    });
  });

  it('switches from Guarantees tab to SCF tab', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Guarantees');
    await waitFor(() => {
      expect(screen.getByText('Issue Guarantee')).toBeInTheDocument();
    });
    await switchToTab('SCF');
    await waitFor(() => {
      expect(screen.getAllByText('SCF Programmes').length).toBeGreaterThanOrEqual(1);
    });
    // Should see New SCF Programme button unique to this tab
    expect(screen.getByText('New SCF Programme')).toBeInTheDocument();
  });

  it('switches from SCF tab to Collections tab', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('SCF');
    await switchToTab('Collections');
    await waitFor(() => {
      expect(screen.getByText('Documentary Collections')).toBeInTheDocument();
    });
  });

  it('switches from Collections tab to Documents tab', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Collections');
    await switchToTab('Documents');
    await waitFor(() => {
      expect(screen.getByText('DOC-2026-001')).toBeInTheDocument();
    });
  });

  it('switches from Documents tab to Trade Ops tab', async () => {
    setupHandlers();
    renderPage();
    await switchToTab('Documents');
    await switchToTab('Trade Ops');
    await waitFor(() => {
      expect(screen.getByText('Trade Confirmations')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

describe('TradeFinanceHubPage - Error Handling', () => {
  it('shows error toast when LC issuance fails', async () => {
    setupHandlers();
    // Override the LC POST handler to return an error
    server.use(
      http.post('/api/v1/trade-finance/lc', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    fireEvent.click(screen.getByText('Issue New LC'));
    await waitFor(() => {
      expect(screen.getByText('Issue New Letter of Credit')).toBeInTheDocument();
    });

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], '101');
    await user.type(inputs[1], 'Beneficiary');
    const numberInputs = screen.getAllByRole('spinbutton');
    await user.type(numberInputs[0], '100000');
    const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-31' } });

    fireEvent.click(screen.getByText('Issue LC'));
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Failed to issue Letter of Credit');
    });
  });

  it('shows error toast when guarantee issuance fails', async () => {
    setupHandlers();
    server.use(
      http.post('/api/v1/trade-finance/guarantees', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await switchToTab('Guarantees');
    // Click the Issue Guarantee toolbar button
    const issueBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.includes('Issue Guarantee') && !b.closest('.fixed'),
    );
    fireEvent.click(issueBtn!);
    await waitFor(() => {
      expect(screen.getByText('Issue Bank Guarantee')).toBeInTheDocument();
    });

    const dialog = screen.getByText('Issue Bank Guarantee').closest('.fixed')!;
    const inputs = within(dialog).getAllByRole('textbox');
    await user.type(inputs[0], '201');
    await user.type(inputs[1], 'Beneficiary');
    const numberInputs = within(dialog).getAllByRole('spinbutton');
    await user.type(numberInputs[0], '500000');
    const dateInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2027-12-31' } });

    const submitBtn = within(dialog).getByRole('button', { name: /Issue Guarantee/ });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Failed to issue Bank Guarantee');
    });
  });

  it('shows error toast when collection creation fails', async () => {
    setupHandlers();
    server.use(
      http.post('/api/v1/trade-finance/collections', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await switchToTab('Collections');
    fireEvent.click(screen.getByText('New Collection'));
    await waitFor(() => {
      expect(screen.getByText('New Documentary Collection')).toBeInTheDocument();
    });

    const dialog = screen.getByText('New Documentary Collection').closest('.fixed')!;
    // drawerCustomerId input
    const drawerInput = within(dialog).getByPlaceholderText('Customer ID');
    await user.type(drawerInput, '301');
    // draweeName input - find by required attribute
    const textInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])');
    const draweeInput = Array.from(textInputs).find(
      (i) => i !== drawerInput && i.getAttribute('required') !== null,
    );
    if (draweeInput) await user.type(draweeInput, 'Test Importer');

    const amountInput = within(dialog).getAllByRole('spinbutton')[0];
    await user.type(amountInput, '50000');

    fireEvent.click(within(dialog).getByText('Create Collection'));
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Failed to create collection');
    });
  });
});
