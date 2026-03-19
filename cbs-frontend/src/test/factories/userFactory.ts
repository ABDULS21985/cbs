let counter = 0;

export function createMockUser(overrides: Record<string, unknown> = {}) {
  counter++;
  return {
    id: `user-${counter}`,
    username: `testuser${counter}`,
    firstName: 'Test',
    lastName: 'User',
    email: `test${counter}@bellbank.com`,
    roles: ['CBS_ADMIN', 'CBS_OFFICER'],
    branchId: 'br-001',
    branchName: 'Head Office',
    department: 'Operations',
    permissions: ['*'],
    mfaEnabled: false,
    ...overrides,
  };
}
