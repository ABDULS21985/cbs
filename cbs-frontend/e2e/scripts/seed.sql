-- CBS E2E Test Data Seed Script
-- Run AFTER schema migrations, BEFORE running E2E tests
-- Schema: cbs

BEGIN;

-- ============================================================
-- Test users (passwords hashed with BCrypt: TestPass123!)
-- ============================================================
INSERT INTO cbs.app_user (username, password_hash, full_name, email, role, branch_code, is_active, created_at)
VALUES
  ('testuser',       '$2a$12$xxx', 'Test Officer',    'testuser@cba.test',       'CBS_OFFICER',       'BR001', true, NOW()),
  ('testmanager',    '$2a$12$xxx', 'Test Manager',    'testmanager@cba.test',    'CBS_MANAGER',       'BR001', true, NOW()),
  ('testcompliance', '$2a$12$xxx', 'Test Compliance', 'testcompliance@cba.test', 'COMPLIANCE_OFFICER', NULL,   true, NOW()),
  ('testtreasury',   '$2a$12$xxx', 'Test Treasury',   'testtreasury@cba.test',   'TREASURY_DEALER',   NULL,   true, NOW()),
  ('testadmin',      '$2a$12$xxx', 'Test Admin',      'testadmin@cba.test',      'SYSTEM_ADMIN',      NULL,   true, NOW())
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- Seed Customers (known test fixtures)
-- ============================================================
INSERT INTO cbs.customer (
  customer_number, type, title, first_name, last_name, date_of_birth,
  gender, nationality, nin, bvn, email, phone_number,
  kyc_status, risk_rating, status, created_by, created_at
) VALUES
  ('CUS-TEST-001', 'INDIVIDUAL', 'Mr',  'James',   'Okonkwo', '1985-06-15', 'MALE',   'Nigerian', 'NIN111111111', 'BVN111111111', 'james@test.cba',   '08011111111', 'VERIFIED', 'LOW',    'ACTIVE', 'test-seed', NOW()),
  ('CUS-TEST-002', 'INDIVIDUAL', 'Mrs', 'Adaeze',  'Eze',     '1990-03-22', 'FEMALE', 'Nigerian', 'NIN222222222', 'BVN222222222', 'adaeze@test.cba',  '08022222222', 'VERIFIED', 'LOW',    'ACTIVE', 'test-seed', NOW()),
  ('CUS-TEST-003', 'INDIVIDUAL', 'Dr',  'Emeka',   'Nwosu',   '1978-11-05', 'MALE',   'Nigerian', 'NIN333333333', 'BVN333333333', 'emeka@test.cba',   '08033333333', 'VERIFIED', 'MEDIUM', 'ACTIVE', 'test-seed', NOW()),
  ('CUS-TEST-004', 'CORPORATE',  NULL,  NULL,      NULL,      NULL,         NULL,     NULL,       NULL,           'BVN444444444', 'corp@test.cba',    '0114444444',  'VERIFIED', 'LOW',    'ACTIVE', 'test-seed', NOW())
ON CONFLICT (customer_number) DO NOTHING;

-- ============================================================
-- Seed Accounts
-- ============================================================
INSERT INTO cbs.account (
  account_number, customer_id, product_code, account_name,
  currency, ledger_balance, available_balance, status, created_by, created_at
)
SELECT
  '1000000001', c.id, 'SAV001', 'James Okonkwo Savings',
  'NGN', 500000.00, 480000.00, 'ACTIVE', 'test-seed', NOW()
FROM cbs.customer c WHERE c.customer_number = 'CUS-TEST-001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO cbs.account (
  account_number, customer_id, product_code, account_name,
  currency, ledger_balance, available_balance, status, created_by, created_at
)
SELECT
  '1000000002', c.id, 'CUR001', 'Adaeze Eze Current',
  'NGN', 1200000.00, 1150000.00, 'ACTIVE', 'test-seed', NOW()
FROM cbs.customer c WHERE c.customer_number = 'CUS-TEST-002'
ON CONFLICT (account_number) DO NOTHING;

-- ============================================================
-- Seed Loan Application (for approval workflow testing)
-- ============================================================
INSERT INTO cbs.loan_application (
  application_ref, customer_id, product_code, product_name,
  requested_amount, interest_rate, tenor_months, purpose,
  repayment_method, repayment_frequency,
  monthly_income, monthly_expenses, debt_to_income_ratio,
  status, created_by, created_at
)
SELECT
  'LA-TEST-001', c.id, 'PL001', 'Personal Loan',
  500000.00, 22.00, 12, 'Medical expenses',
  'EQUAL_INSTALLMENT', 'MONTHLY',
  300000.00, 80000.00, 26.67,
  'PENDING_APPROVAL', 'test-seed', NOW()
FROM cbs.customer c WHERE c.customer_number = 'CUS-TEST-001'
ON CONFLICT (application_ref) DO NOTHING;

-- ============================================================
-- Seed Active Loan Account (for repayment testing)
-- ============================================================
INSERT INTO cbs.loan_account (
  loan_number, application_id, customer_id, product_code, product_name,
  disbursed_amount, outstanding_principal, outstanding_interest, total_outstanding,
  interest_rate, tenor_months, remaining_months, monthly_payment,
  next_payment_date, next_payment_amount, days_past_due,
  classification, currency, disbursed_date, maturity_date,
  restructure_count, status, created_by, created_at
)
SELECT
  'LN-TEST-001', la.id, c.id, 'PL001', 'Personal Loan',
  500000.00, 450000.00, 9166.67, 459166.67,
  22.00, 12, 10, 50208.33,
  NOW() + INTERVAL '30 days', 50208.33, 0,
  'CURRENT', 'NGN', NOW() - INTERVAL '60 days', NOW() + INTERVAL '10 months',
  0, 'ACTIVE', 'test-seed', NOW()
FROM cbs.loan_application la
JOIN cbs.customer c ON c.id = la.customer_id
WHERE la.application_ref = 'LA-TEST-001'
ON CONFLICT (loan_number) DO NOTHING;

-- ============================================================
-- Seed Fixed Deposit
-- ============================================================
INSERT INTO cbs.fixed_deposit (
  fd_reference, account_id, customer_id, principal_amount,
  interest_rate, tenor_days, maturity_date, rollover_instruction,
  status, created_by, created_at
)
SELECT
  'FD-TEST-001', a.id, c.id, 1000000.00,
  12.50, 90, NOW() + INTERVAL '90 days', 'ROLL_PRINCIPAL_AND_INTEREST',
  'ACTIVE', 'test-seed', NOW()
FROM cbs.account a
JOIN cbs.customer c ON c.id = a.customer_id
WHERE a.account_number = '1000000001'
ON CONFLICT (fd_reference) DO NOTHING;

COMMIT;
