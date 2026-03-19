export interface TestCredentials {
  username: string;
  password: string;
  displayName: string;
  role: string;
  branchCode?: string;
}

export const USERS = {
  officer: {
    username: process.env.TEST_USER_OFFICER || 'testuser',
    password: process.env.TEST_USER_OFFICER_PASS || 'TestPass123!',
    displayName: 'Test Officer',
    role: 'CBS_OFFICER',
    branchCode: 'BR001',
  },
  manager: {
    username: process.env.TEST_USER_MANAGER || 'testmanager',
    password: process.env.TEST_USER_MANAGER_PASS || 'TestPass123!',
    displayName: 'Test Manager',
    role: 'CBS_MANAGER',
    branchCode: 'BR001',
  },
  compliance: {
    username: process.env.TEST_USER_COMPLIANCE || 'testcompliance',
    password: process.env.TEST_USER_COMPLIANCE_PASS || 'TestPass123!',
    displayName: 'Test Compliance',
    role: 'COMPLIANCE_OFFICER',
  },
  treasury: {
    username: process.env.TEST_USER_TREASURY || 'testtreasury',
    password: process.env.TEST_USER_TREASURY_PASS || 'TestPass123!',
    displayName: 'Test Treasury',
    role: 'TREASURY_DEALER',
  },
  admin: {
    username: process.env.TEST_USER_ADMIN || 'testadmin',
    password: process.env.TEST_USER_ADMIN_PASS || 'TestPass123!',
    displayName: 'Test Admin',
    role: 'SYSTEM_ADMIN',
  },
} satisfies Record<string, TestCredentials>;
