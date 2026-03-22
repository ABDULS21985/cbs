import { http, HttpResponse } from 'msw';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

export const mockTransaction = {
  id: 1,
  transactionRef: 'TXN-2026-000001',
  reference: 'TXN-2026-000001',
  accountNumber: '0123456789',
  transactionType: 'DEBIT',
  type: 'Debit',
  amount: 15000,
  currencyCode: 'NGN',
  runningBalance: 485000,
  narration: 'Vendor payment',
  description: 'Vendor payment',
  valueDate: '2026-03-20',
  postingDate: '2026-03-20',
  dateTime: '2026-03-20T09:15:00Z',
  contraAccountNumber: '9876543210',
  channel: 'WEB',
  externalRef: 'EXT-001',
  status: 'COMPLETED',
  isReversed: false,
  createdAt: '2026-03-20T09:15:00Z',
  createdBy: 'amara.officer',
  fromAccount: '0123456789',
  fromAccountName: 'Amara Okonkwo',
  toAccount: '9876543210',
  toAccountName: 'Vendor One',
  debitAmount: 15000,
  creditAmount: null,
  fee: 0,
  glEntries: [],
  amlFlagged: false,
  amlFlag: null,
  auditTrail: [],
  latestDispute: null,
  customerEmail: 'amara@example.com',
  customerPhone: '+2348012345678',
};

const mockSummary = {
  totalResults: 1,
  totalDebit: 15000,
  totalCredit: 0,
  netAmount: -15000,
};

const mockPageMeta = {
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

const mockReversalCounts = {
  pendingApproval: 2,
  completed: 10,
  rejected: 1,
};

const mockReversalRecord = {
  id: 10,
  requestRef: 'REV-2026-000010',
  transactionId: 1,
  transactionRef: 'TXN-2026-000001',
  accountNumber: '0123456789',
  accountName: 'Amara Okonkwo',
  amount: 15000,
  currencyCode: 'NGN',
  reasonCategory: 'CUSTOMER_REQUEST',
  subReason: 'Erroneous Debit',
  notes: null,
  requestedSettlement: 'IMMEDIATE',
  status: 'PENDING_APPROVAL',
  requestedBy: 'amara.officer',
  requestedAt: '2026-03-20T10:00:00Z',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  reversalRef: null,
  approvalRequestCode: 'APR-2026-000010',
  adviceDownloadUrl: null,
};

const mockReversalPreview = {
  transactionId: 1,
  transactionRef: 'TXN-2026-000001',
  originalAmount: 15000,
  originalAccountNumber: '0123456789',
  originalDirection: 'DEBIT',
  reversalDirection: 'CREDIT',
  customerAccountNumber: '0123456789',
  counterpartyAccountNumber: '9876543210',
  glDebitAccount: 'SUSPENSE-GL',
  glCreditAccount: '0123456789',
  settlementTiming: 'Immediate',
  dualAuthorizationRequired: false,
};

const mockReversalResult = {
  requestRef: 'REV-2026-000011',
  status: 'COMPLETED',
  reversalRef: 'RGRP-2026-000001',
  approvalRequired: false,
  approvalRequestCode: null,
  adviceDownloadUrl: '/api/v1/transactions/reversals/11/advice',
  message: 'Transaction reversed successfully',
};

const mockDispute = {
  id: 5,
  disputeRef: 'DIS-2026-000005',
  transactionId: 1,
  transactionRef: 'TXN-2026-000001',
  amount: 15000,
  currencyCode: 'NGN',
  reasonCode: 'UNAUTHORIZED',
  description: 'I did not authorize this transaction',
  contactEmail: 'amara@example.com',
  contactPhone: '+2348012345678',
  status: 'PENDING',
  assignedTo: null,
  filedAt: '2026-03-21T08:00:00Z',
  filedBy: 'amara.officer',
  lastUpdatedAt: '2026-03-21T08:00:00Z',
  updatedBy: 'amara.officer',
  closedAt: null,
  closedBy: null,
  responseNotes: null,
  escalationNotes: null,
  closingNotes: null,
  supportingDocumentIds: [],
};

const mockDisputeDashboard = {
  total: 3,
  pendingResponse: 1,
  underReview: 1,
  resolved: 1,
  escalated: 0,
};

const mockAnalyticsSummary = {
  totalTransactions: 120,
  totalValue: 1800000,
  averageTransactionValue: 15000,
  largestTransaction: { id: 1, reference: 'TXN-2026-000001', amount: 75000 },
  mostUsedChannel: { channel: 'WEB', percentage: 42.5, count: 51, value: 765000, successRate: 98.0, averageValue: 15000 },
  failureRate: 1.67,
  reversalRate: 0.83,
};

const mockVolumeTrend = [
  { periodStart: '2026-03-15', periodEnd: '2026-03-15', label: '15 Mar', creditCount: 10, debitCount: 8, creditValue: 150000, debitValue: 120000, totalValue: 270000 },
  { periodStart: '2026-03-16', periodEnd: '2026-03-16', label: '16 Mar', creditCount: 12, debitCount: 9, creditValue: 180000, debitValue: 135000, totalValue: 315000 },
];

const mockCategoryAnalytics = {
  totalSpend: 500000,
  categories: [
    { category: 'Payments', amount: 300000, count: 20, average: 15000, percentage: 60 },
    { category: 'Transfers', amount: 150000, count: 10, average: 15000, percentage: 30 },
    { category: 'Fees', amount: 50000, count: 50, average: 1000, percentage: 10 },
  ],
  trend: [],
};

const mockChannelAnalytics = {
  channels: [
    { channel: 'WEB', volume: 51, value: 765000, successRate: 98.0, averageValue: 15000 },
    { channel: 'MOBILE', volume: 40, value: 600000, successRate: 97.5, averageValue: 15000 },
  ],
  successRateTrend: [],
};

const mockTopAccounts = [
  { accountNumber: '0123456789', accountName: 'Amara Okonkwo', transactionCount: 35, totalDebit: 350000, totalCredit: 250000, netAmount: -100000, lastTransactionDate: '2026-03-20' },
];

const mockFailureAnalysis = {
  failureRate: 1.67,
  thresholdBreached: false,
  trend: [],
  reasons: [{ reason: 'Insufficient Funds', count: 1, percentage: 50 }, { reason: 'System Error', count: 1, percentage: 50 }],
  hotspots: [],
  topFailingAccounts: [],
};

const mockHeatmap = {
  cells: [],
  anomalies: [],
  anomalyCount: 0,
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const transactionHandlers = [
  // Search transactions
  http.get('/api/v1/transactions', () =>
    HttpResponse.json({
      success: true,
      data: { transactions: [mockTransaction], summary: mockSummary, page: mockPageMeta },
      timestamp: new Date().toISOString(),
    })
  ),

  // Get single transaction
  http.get('/api/v1/transactions/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: mockTransaction, timestamp: new Date().toISOString() });
  }),

  // Preview reversal
  http.post('/api/v1/transactions/:id/reversal/preview', () =>
    HttpResponse.json({ success: true, data: mockReversalPreview, timestamp: new Date().toISOString() })
  ),

  // Submit reversal
  http.post('/api/v1/transactions/:id/reverse', () =>
    HttpResponse.json({ success: true, data: mockReversalResult, timestamp: new Date().toISOString() })
  ),

  // Raise dispute (multipart)
  http.post('/api/v1/transactions/:id/dispute', () =>
    HttpResponse.json({ success: true, data: mockDispute, timestamp: new Date().toISOString() }, { status: 201 })
  ),

  // Reversal counts
  http.get('/api/v1/transactions/reversals/counts', () =>
    HttpResponse.json({ success: true, data: mockReversalCounts, timestamp: new Date().toISOString() })
  ),

  // List reversals
  http.get('/api/v1/transactions/reversals', () =>
    HttpResponse.json({
      success: true,
      data: [mockReversalRecord],
      page: mockPageMeta,
      timestamp: new Date().toISOString(),
    })
  ),

  // Get reversal detail
  http.get('/api/v1/transactions/reversals/:id', () =>
    HttpResponse.json({ success: true, data: mockReversalRecord, timestamp: new Date().toISOString() })
  ),

  // Approve reversal
  http.post('/api/v1/transactions/reversals/:id/approve', () =>
    HttpResponse.json({ success: true, data: { ...mockReversalResult, requestRef: 'REV-2026-000010' }, timestamp: new Date().toISOString() })
  ),

  // Reject reversal
  http.post('/api/v1/transactions/reversals/:id/reject', () =>
    HttpResponse.json({ success: true, data: { requestRef: 'REV-2026-000010', status: 'REJECTED', approvalRequired: false, message: 'Reversal request rejected' }, timestamp: new Date().toISOString() })
  ),

  // Dispute dashboard
  http.get('/api/v1/transactions/disputes/dashboard', () =>
    HttpResponse.json({ success: true, data: mockDisputeDashboard, timestamp: new Date().toISOString() })
  ),

  // List disputes
  http.get('/api/v1/transactions/disputes', () =>
    HttpResponse.json({
      success: true,
      data: [mockDispute],
      page: mockPageMeta,
      timestamp: new Date().toISOString(),
    })
  ),

  // Get dispute detail
  http.get('/api/v1/transactions/disputes/:id', () =>
    HttpResponse.json({ success: true, data: mockDispute, timestamp: new Date().toISOString() })
  ),

  // Respond to dispute
  http.post('/api/v1/transactions/disputes/:id/respond', () =>
    HttpResponse.json({ success: true, data: { ...mockDispute, status: 'UNDER_REVIEW', responseNotes: 'Noted' }, timestamp: new Date().toISOString() })
  ),

  // Escalate dispute
  http.post('/api/v1/transactions/disputes/:id/escalate', () =>
    HttpResponse.json({ success: true, data: { ...mockDispute, status: 'ESCALATED' }, timestamp: new Date().toISOString() })
  ),

  // Close dispute
  http.post('/api/v1/transactions/disputes/:id/close', () =>
    HttpResponse.json({ success: true, data: { ...mockDispute, status: 'RESOLVED' }, timestamp: new Date().toISOString() })
  ),

  // Analytics summary
  http.get('/api/v1/transactions/analytics/summary', () =>
    HttpResponse.json({ success: true, data: mockAnalyticsSummary, timestamp: new Date().toISOString() })
  ),

  // Volume trend
  http.get('/api/v1/transactions/analytics/volume-trend', () =>
    HttpResponse.json({ success: true, data: mockVolumeTrend, timestamp: new Date().toISOString() })
  ),

  // Category analytics
  http.get('/api/v1/transactions/analytics/categories', () =>
    HttpResponse.json({ success: true, data: mockCategoryAnalytics, timestamp: new Date().toISOString() })
  ),

  // Channel analytics
  http.get('/api/v1/transactions/analytics/channels', () =>
    HttpResponse.json({ success: true, data: mockChannelAnalytics, timestamp: new Date().toISOString() })
  ),

  // Top accounts
  http.get('/api/v1/transactions/analytics/top-accounts', () =>
    HttpResponse.json({ success: true, data: mockTopAccounts, timestamp: new Date().toISOString() })
  ),

  // Failure analytics
  http.get('/api/v1/transactions/analytics/failures', () =>
    HttpResponse.json({ success: true, data: mockFailureAnalysis, timestamp: new Date().toISOString() })
  ),

  // Hourly heatmap
  http.get('/api/v1/transactions/analytics/hourly-heatmap', () =>
    HttpResponse.json({ success: true, data: mockHeatmap, timestamp: new Date().toISOString() })
  ),

  // Statement download (blob)
  http.post('/api/v1/transactions/statement', () =>
    new HttpResponse('<html>Statement</html>', {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'attachment; filename="statement.html"',
      },
    })
  ),

  // Statement email
  http.post('/api/v1/transactions/statement/email', () =>
    HttpResponse.json({
      success: true,
      data: { status: 'QUEUED', accountNumber: '0123456789', emailAddress: 'amara@example.com', generatedAt: new Date().toISOString(), message: 'Statement queued for delivery' },
      timestamp: new Date().toISOString(),
    })
  ),
];
