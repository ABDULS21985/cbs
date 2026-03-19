import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://cbs_user:cbs_pass@localhost:5432/cbs_db',
  max: 5,
  idleTimeoutMillis: 30_000,
});

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

// Customer helpers
export async function getCustomerByNumber(customerNumber: string) {
  return queryOne('SELECT * FROM cbs.customer WHERE customer_number = $1', [customerNumber]);
}

export async function getCustomerById(id: number) {
  return queryOne('SELECT * FROM cbs.customer WHERE id = $1', [id]);
}

export async function getCustomerByNin(nin: string) {
  return queryOne('SELECT * FROM cbs.customer WHERE nin = $1', [nin]);
}

// Account helpers
export async function getAccountByNumber(accountNumber: string) {
  return queryOne('SELECT * FROM cbs.account WHERE account_number = $1', [accountNumber]);
}

export async function getAccountBalance(accountNumber: string): Promise<number | null> {
  const row = await queryOne<{ available_balance: number }>(
    'SELECT available_balance FROM cbs.account WHERE account_number = $1',
    [accountNumber],
  );
  return row?.available_balance ?? null;
}

// Loan helpers
export async function getLoanApplicationByRef(ref: string) {
  return queryOne('SELECT * FROM cbs.loan_application WHERE application_ref = $1', [ref]);
}

export async function getLoanAccountByNumber(loanNumber: string) {
  return queryOne('SELECT * FROM cbs.loan_account WHERE loan_number = $1', [loanNumber]);
}

// Transaction helpers
export async function getTransactionByRef(ref: string) {
  return queryOne('SELECT * FROM cbs.payment_transaction WHERE transaction_ref = $1', [ref]);
}

export async function getRecentTransactions(accountNumber: string, limit = 5) {
  return query(
    'SELECT * FROM cbs.payment_transaction WHERE source_account = $1 OR destination_account = $1 ORDER BY created_at DESC LIMIT $2',
    [accountNumber, limit],
  );
}

// Card helpers
export async function getCardByPan(maskedPan: string) {
  return queryOne('SELECT * FROM cbs.card WHERE masked_pan = $1', [maskedPan]);
}

// Fixed Deposit helpers
export async function getFixedDepositByRef(fdRef: string) {
  return queryOne('SELECT * FROM cbs.fixed_deposit WHERE fd_reference = $1', [fdRef]);
}

// User helpers
export async function getUserByUsername(username: string) {
  return queryOne('SELECT * FROM cbs.app_user WHERE username = $1', [username]);
}

// Cleanup helpers
export async function resetTestCustomers() {
  await query("DELETE FROM cbs.customer WHERE created_by = 'test-automation'");
}

export async function resetTestAccounts() {
  await query("DELETE FROM cbs.account WHERE created_by = 'test-automation'");
}

export async function resetTestLoans() {
  await query("DELETE FROM cbs.loan_application WHERE created_by = 'test-automation'");
}

export async function cleanupTestData() {
  // Order matters due to FK constraints
  await query("DELETE FROM cbs.loan_account WHERE created_by = 'test-automation'");
  await query("DELETE FROM cbs.loan_application WHERE created_by = 'test-automation'");
  await query("DELETE FROM cbs.payment_transaction WHERE created_by = 'test-automation'");
  await query("DELETE FROM cbs.fixed_deposit WHERE created_by = 'test-automation'");
  await query("DELETE FROM cbs.account WHERE created_by = 'test-automation'");
  await query("DELETE FROM cbs.customer WHERE created_by = 'test-automation'");
}

export async function closePool() {
  await pool.end();
}
