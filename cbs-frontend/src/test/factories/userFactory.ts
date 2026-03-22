import type { User } from '@/types/auth';

let counter = 0;

export function createMockUser(overrides: Partial<User> = {}): User {
  counter++;
  return {
    id: `user-${counter}`,
    username: `testuser${counter}`,
    fullName: 'Test User',
    email: `test${counter}@bellbank.com`,
    roles: ['CBS_ADMIN', 'CBS_OFFICER'],
    branchId: 1,
    branchName: 'Head Office',
    permissions: ['*'],
    ...overrides,
  };
}
