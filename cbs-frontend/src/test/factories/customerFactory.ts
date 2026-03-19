let seq = 0;

export function createMockCustomer(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    cifNumber: `CIF${String(seq).padStart(7, '0')}`,
    firstName: `First${seq}`,
    lastName: `Last${seq}`,
    fullName: `First${seq} Last${seq}`,
    email: `customer${seq}@example.com`,
    phone: `+23480${String(seq).padStart(7, '0')}`,
    customerType: 'INDIVIDUAL',
    segment: 'RETAIL',
    status: 'ACTIVE',
    kycStatus: 'VERIFIED',
    bvn: `2200000${String(seq).padStart(4, '0')}`,
    dateOfBirth: '1990-01-15',
    gender: 'MALE',
    nationality: 'NG',
    address: `${seq} Test Street, Lagos`,
    branchId: 1,
    branchName: 'Head Office',
    accountCount: 2,
    totalBalance: 5000000 + seq * 100000,
    relationshipStartDate: '2020-06-01',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-18T14:00:00Z',
    ...overrides,
  };
}

export function createMockCustomerList(count = 10) {
  return Array.from({ length: count }, (_, i) => createMockCustomer({ id: i + 1 }));
}
