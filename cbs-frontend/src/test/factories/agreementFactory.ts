let seq = 0;

export function createMockAgreement(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    agreementNumber: `AGR-${String(seq).padStart(6, '0')}`,
    customerId: 1000 + seq,
    agreementType: 'MASTER_SERVICE',
    title: `Service Agreement ${seq}`,
    description: `Description for agreement ${seq}`,
    documentRef: `DOC-REF-${seq}`,
    effectiveFrom: '2025-01-01',
    effectiveTo: '2026-12-31',
    autoRenew: seq % 2 === 0,
    renewalTermMonths: 12,
    noticePeriodDays: 30,
    signedByCustomer: seq % 3 === 0 ? 'Customer Name' : null,
    signedByBank: seq % 3 === 0 ? 'Bank Officer' : null,
    signedDate: seq % 3 === 0 ? '2025-01-15' : null,
    status: 'ACTIVE',
    terminationReason: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockTdFramework(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    agreementNumber: `TDF-${String(seq).padStart(6, '0')}`,
    customerId: 2000 + seq,
    agreementType: 'STANDARD',
    currency: 'USD',
    minDepositAmount: 100000,
    maxDepositAmount: 10000000,
    minTenorDays: 30,
    maxTenorDays: 3650,
    rateStructure: 'FIXED',
    baseRate: 4.5,
    rateTiers: null,
    benchmarkReference: null,
    spreadOverBenchmark: null,
    autoRolloverEnabled: false,
    rolloverTenorDays: null,
    rolloverRateType: 'PREVAILING',
    maturityInstruction: 'CREDIT_ACCOUNT',
    earlyWithdrawalAllowed: true,
    earlyWithdrawalPenaltyPct: 1.0,
    partialWithdrawalAllowed: false,
    partialWithdrawalMin: null,
    status: 'ACTIVE',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    approvedBy: 'Admin User',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockCommissionAgreement(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    agreementCode: `CA-${String(seq).padStart(6, '0')}`,
    agreementName: `Commission Agreement ${seq}`,
    agreementType: 'SALES_OFFICER',
    partyId: `AGT-${String(seq).padStart(3, '0')}`,
    partyName: `Agent ${seq}`,
    commissionBasis: 'PERCENTAGE',
    baseRatePct: 5.0,
    tierStructure: [],
    applicableProducts: ['SAV-001', 'CUR-001'],
    minPayout: 1000,
    maxPayoutMonthly: 500000,
    maxPayoutAnnual: 5000000,
    clawbackPeriodDays: 90,
    clawbackConditions: {},
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31',
    status: 'ACTIVE',
    ...overrides,
  };
}

export function createMockCommissionPayout(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    payoutCode: `PO-${String(seq).padStart(6, '0')}`,
    agreementId: 1,
    partyId: 'AGT-001',
    partyName: 'Agent 1',
    payoutPeriod: '2025-Q1',
    periodStart: '2025-01-01',
    periodEnd: '2025-03-31',
    currency: 'NGN',
    grossSales: 10000000,
    qualifyingSales: 8000000,
    commissionRateApplied: 5.0,
    grossCommission: 400000,
    deductions: 0,
    clawbackAmount: 0,
    taxAmount: 40000,
    netCommission: 360000,
    paymentAccountId: 0,
    paymentReference: '',
    paidAt: null,
    status: 'CALCULATED',
    ...overrides,
  };
}

export function createMockDiscountScheme(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    schemeCode: `DS-${String(seq).padStart(6, '0')}`,
    schemeName: `Discount Scheme ${seq}`,
    schemeType: 'VOLUME_BASED',
    discountBasis: 'PERCENTAGE_OFF',
    discountValue: 10,
    applicableFeeIds: ['TXN_FEE'],
    applicableProducts: ['SAV-001'],
    applicableSegments: ['RETAIL'],
    minRelationshipValue: null,
    minTransactionVolume: null,
    loyaltyTierRequired: null,
    maxDiscountAmount: 50000,
    maxUsagePerCustomer: 5,
    maxTotalBudget: 1000000,
    currentUtilization: 250000,
    combinableWithOtherDiscounts: false,
    priorityOrder: seq,
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31',
    approvedBy: 'Admin',
    approvalDate: '2025-01-01',
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockSpecialPricing(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    agreementCode: `SPA-${String(seq).padStart(6, '0')}`,
    customerId: 3000 + seq,
    customerName: `Corporate Client ${seq}`,
    agreementType: 'RELATIONSHIP_PRICING',
    negotiatedBy: 'Relationship Manager',
    approvedBy: 'Admin',
    approvalLevel: 'SENIOR',
    feeOverrides: { TXN_FEE: 0.5 },
    rateOverrides: null,
    fxMarginOverride: 0.0025,
    freeTransactionAllowance: 50,
    waivedFees: ['ATM_FEE', 'CARD_FEE'],
    conditions: 'Minimum balance of 10M required',
    reviewFrequency: 'QUARTERLY',
    nextReviewDate: '2025-06-30',
    relationshipValueAtApproval: 50000000,
    currentRelationshipValue: 55000000,
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31',
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockAgreementTemplate(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    name: `Template ${seq}`,
    type: 'MASTER_SERVICE',
    description: `Template description ${seq}`,
    content: `<p>Agreement content ${seq}</p>`,
    isActive: true,
    ...overrides,
  };
}
