let seq = 0;

export function createMockLoan(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    loanNumber: `LN-${String(seq).padStart(6, '0')}`,
    customerId: 1,
    customerName: `Borrower ${seq}`,
    productName: 'Personal Loan',
    disbursedAmount: 5000000,
    outstandingPrincipal: 3200000,
    outstandingInterest: 156789,
    totalOutstanding: 3356789,
    interestRate: 18,
    tenorMonths: 12,
    remainingMonths: 8,
    monthlyPayment: 466667,
    nextPaymentDate: '2026-04-18',
    daysPastDue: 0,
    classification: 'CURRENT',
    provision: 0,
    status: 'ACTIVE',
    currency: 'NGN',
    disbursedDate: '2026-01-18',
    maturityDate: '2027-01-18',
    createdAt: '2026-01-18T10:00:00Z',
    updatedAt: '2026-03-18T14:00:00Z',
    ...overrides,
  };
}

export function createMockLoanApplication(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    applicationRef: `LA-2026-${String(seq).padStart(6, '0')}`,
    customerId: 1,
    customerName: `Applicant ${seq}`,
    productName: 'Personal Loan',
    requestedAmount: 5000000,
    tenorMonths: 24,
    status: 'PENDING_APPROVAL',
    assignedOfficer: 'J. Obi',
    createdAt: '2026-03-17T10:00:00Z',
    ...overrides,
  };
}

export function createMockScheduleItem(num: number) {
  return {
    installmentNumber: num,
    dueDate: new Date(2026, num - 1, 18).toISOString(),
    principalDue: 416667,
    interestDue: 50000 - (num - 1) * 4167,
    totalDue: 466667 - (num - 1) * 4167,
    status: num <= 3 ? 'PAID' : num === 4 ? 'DUE' : 'FUTURE',
    outstanding: 5000000 - num * 416667,
  };
}
