let seq = 0;

export function createMockCard(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    cardNumberMasked: `**** **** **** ${String(1000 + seq)}`,
    customerName: `Card Holder ${seq}`,
    customerId: seq,
    cardType: 'DEBIT',
    scheme: 'VISA',
    accountNumber: `01${String(seq).padStart(8, '0')}`,
    accountId: seq,
    expiryDate: '03/28',
    nameOnCard: `CARD HOLDER ${seq}`,
    status: 'ACTIVE',
    issuedDate: '2024-03-15',
    deliveryMethod: 'BRANCH_PICKUP',
    controls: { posEnabled: true, atmEnabled: true, onlineEnabled: true, internationalEnabled: false, contactlessEnabled: true, recurringEnabled: true },
    ...overrides,
  };
}
