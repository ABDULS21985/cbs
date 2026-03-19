let seq = 0;

export function createMockTransfer(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    transactionRef: `TXN-${Date.now()}-${seq}`,
    status: 'SUCCESSFUL',
    fromAccount: '0123456789',
    fromAccountName: 'Adeola Johnson',
    toAccount: '0987654321',
    toAccountName: 'Chidi Okafor',
    toBankName: 'Access Bank',
    amount: 50000,
    currency: 'NGN',
    fee: 52.50,
    vat: 3.94,
    totalDebit: 50056.44,
    narration: 'Test payment',
    requiresApproval: false,
    createdAt: '2026-03-18T14:00:00Z',
    ...overrides,
  };
}

export function createMockStandingOrder(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    reference: `SO-${String(seq).padStart(6, '0')}`,
    sourceAccountId: 1,
    sourceAccountNumber: '0123456789',
    sourceAccountName: 'Test Account',
    beneficiaryName: `Beneficiary ${seq}`,
    beneficiaryAccount: '0987654321',
    beneficiaryBankName: 'GTBank',
    amount: 50000,
    currency: 'NGN',
    frequency: 'MONTHLY',
    dayOfMonth: 15,
    startDate: '2026-01-15',
    nextExecution: '2026-04-15',
    description: 'Monthly payment',
    executionCount: 3,
    failureCount: 0,
    status: 'ACTIVE',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
    version: 1,
    ...overrides,
  };
}
