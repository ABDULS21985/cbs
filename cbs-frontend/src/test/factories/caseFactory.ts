let seq = 0;

export function createMockCase(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: seq,
    caseNumber: `CASE-${String(seq).padStart(6, '0')}`,
    customerId: 1,
    customerName: `Customer ${seq}`,
    caseType: 'COMPLAINT',
    priority: 'MEDIUM',
    status: 'OPEN',
    subject: `Test Case ${seq}`,
    description: 'Test case description',
    assignedTo: 'agent-1',
    assignedToName: 'Agent One',
    slaDeadline: new Date(Date.now() + 4 * 3600000).toISOString(),
    slaBreached: false,
    activities: [],
    openedAt: '2026-03-18T10:00:00Z',
    createdAt: '2026-03-18T10:00:00Z',
    updatedAt: '2026-03-18T10:00:00Z',
    ...overrides,
  };
}

export function createMockCaseStats() {
  return { openCases: 156, slaBreached: 23, resolvedToday: 45, avgResolutionHours: 4.2 };
}
