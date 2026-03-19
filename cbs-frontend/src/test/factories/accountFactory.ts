let seq = 0;

export function createMockAccount(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    accountNumber: `01${String(seq).padStart(8, '0')}`,
    accountName: `Test Account ${seq}`,
    accountType: 'SAVINGS',
    productCode: 'SAV-001',
    productName: 'Savings Account',
    customerId: 1,
    customerName: 'Test Customer',
    currency: 'NGN',
    balance: 2500000 + seq * 50000,
    availableBalance: 2400000 + seq * 50000,
    ledgerBalance: 2500000 + seq * 50000,
    status: 'ACTIVE',
    branchId: 1,
    branchName: 'Head Office',
    openedDate: '2023-06-15',
    lastTransactionDate: '2024-03-18',
    createdAt: '2023-06-15T10:00:00Z',
    updatedAt: '2024-03-18T14:00:00Z',
    ...overrides,
  };
}

export function createMockAccountList(count = 5) {
  return Array.from({ length: count }, (_, i) => createMockAccount({ id: i + 1 }));
}
