#!/usr/bin/env npx ts-node
/**
 * API-based test data seeding script.
 * Run: npx ts-node e2e/scripts/seed-api.ts
 */
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:8081';
const ADMIN_USER = process.env.SEED_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.SEED_ADMIN_PASS || 'Admin123!';

async function main() {
  console.log('🌱 Seeding test data via API...');

  // Authenticate
  const authRes = await axios.post(`${API_URL}/api/v1/auth/login`, {
    username: ADMIN_USER,
    password: ADMIN_PASS,
  });
  const token: string = authRes.data.token || authRes.data.accessToken;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Create test users
  const testUsers = [
    { username: 'testuser',       password: 'TestPass123!', fullName: 'Test Officer',    email: 'testuser@cba.test',       role: 'CBS_OFFICER'       },
    { username: 'testmanager',    password: 'TestPass123!', fullName: 'Test Manager',    email: 'testmanager@cba.test',    role: 'CBS_MANAGER'       },
    { username: 'testcompliance', password: 'TestPass123!', fullName: 'Test Compliance', email: 'testcompliance@cba.test', role: 'COMPLIANCE_OFFICER' },
    { username: 'testtreasury',   password: 'TestPass123!', fullName: 'Test Treasury',   email: 'testtreasury@cba.test',   role: 'TREASURY_DEALER'   },
    { username: 'testadmin',      password: 'TestPass123!', fullName: 'Test Admin',      email: 'testadmin@cba.test',      role: 'SYSTEM_ADMIN'      },
  ];

  for (const user of testUsers) {
    try {
      await axios.post(`${API_URL}/api/v1/admin/users`, user, { headers });
      console.log(`  ✅ Created user: ${user.username}`);
    } catch (e: any) {
      if (e.response?.status === 409) {
        console.log(`  ⚠️  User already exists: ${user.username}`);
      } else {
        console.error(`  ❌ Failed to create user ${user.username}:`, e.message);
      }
    }
  }

  // Create seed customers
  const customers = [
    {
      type: 'INDIVIDUAL', title: 'Mr', firstName: 'James', lastName: 'Okonkwo',
      dateOfBirth: '1985-06-15', gender: 'MALE', nationality: 'Nigerian',
      nin: 'NIN111111111', bvn: 'BVN111111111', email: 'james@test.cba', phoneNumber: '08011111111',
      createdBy: 'test-seed',
    },
    {
      type: 'INDIVIDUAL', title: 'Mrs', firstName: 'Adaeze', lastName: 'Eze',
      dateOfBirth: '1990-03-22', gender: 'FEMALE', nationality: 'Nigerian',
      nin: 'NIN222222222', bvn: 'BVN222222222', email: 'adaeze@test.cba', phoneNumber: '08022222222',
      createdBy: 'test-seed',
    },
  ];

  for (const customer of customers) {
    try {
      const res = await axios.post(`${API_URL}/api/v1/customers`, customer, { headers });
      console.log(`  ✅ Created customer: ${res.data.customerNumber}`);
    } catch (e: any) {
      if (e.response?.status === 409) {
        console.log(`  ⚠️  Customer already exists`);
      } else {
        console.error(`  ❌ Failed to create customer:`, e.message);
      }
    }
  }

  console.log('✅ Seeding complete!');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
