SET search_path TO cbs;

-- Follow-on hardening for the profit distribution engine introduced in V92.
-- Keeps migration ordering safe by extending the shipped schema instead of
-- rewriting already-versioned Flyway history.

CREATE INDEX IF NOT EXISTS idx_pool_asset_assignment_pool_status
    ON pool_asset_assignment (pool_id, assignment_status);

CREATE INDEX IF NOT EXISTS idx_pool_asset_assignment_pool_contract
    ON pool_asset_assignment (pool_id, contract_type_code);

CREATE INDEX IF NOT EXISTS idx_pool_asset_assignment_pool_maturity
    ON pool_asset_assignment (pool_id, maturity_date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pool_asset_assignment_active_asset
    ON pool_asset_assignment (pool_id, asset_reference_id)
    WHERE assignment_status = 'ACTIVE' AND asset_reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pool_income_record_pool_period
    ON pool_income_record (pool_id, period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_pool_income_record_pool_type
    ON pool_income_record (pool_id, income_type);

CREATE INDEX IF NOT EXISTS idx_pool_income_record_pool_charity
    ON pool_income_record (pool_id, is_charity_income);

CREATE INDEX IF NOT EXISTS idx_pool_expense_record_pool_period
    ON pool_expense_record (pool_id, period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_pool_expense_record_pool_type
    ON pool_expense_record (pool_id, expense_type);

CREATE INDEX IF NOT EXISTS idx_pool_profit_calculation_pool_status
    ON pool_profit_calculation (pool_id, calculation_status);

CREATE INDEX IF NOT EXISTS idx_profit_distribution_run_pool_status
    ON profit_distribution_run (pool_id, status);

CREATE INDEX IF NOT EXISTS idx_distribution_reserve_transaction_run_type
    ON distribution_reserve_transaction (distribution_run_id, reserve_type);

CREATE INDEX IF NOT EXISTS idx_distribution_reserve_transaction_pool
    ON distribution_reserve_transaction (pool_id);

CREATE INDEX IF NOT EXISTS idx_distribution_run_step_log_run_step
    ON distribution_run_step_log (distribution_run_id, step_number);

CREATE INDEX IF NOT EXISTS idx_distribution_run_step_log_run_status
    ON distribution_run_step_log (distribution_run_id, step_status);

INSERT INTO islamic_posting_rule (
    rule_code, name, contract_type_code, transaction_type, description, entries,
    priority, enabled, effective_from, created_at, updated_at
) VALUES
(
    'PDR-DIST-001',
    'Profit Distribution to Mudarabah Depositor',
    'ALL',
    'PROFIT_DISTRIBUTION',
    'Credits depositor or designated payout account from the profit distribution pool',
    '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Profit distribution expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_PARAMETER","accountParameter":"customerInvestmentAccountGlCode","amountExpression":"FULL_AMOUNT","narrationTemplate":"Depositor profit distribution {{reference}}"}]'::jsonb,
    110,
    TRUE,
    CURRENT_DATE,
    NOW(),
    NOW()
),
(
    'PDR-BANK-001',
    'Bank Mudarib Share Recognition',
    'ALL',
    'MUDARIB_FEE',
    'Recognises the bank mudarib share from approved profit allocations',
    '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Bank mudarib share expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"4200-MDR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Bank mudarib income {{reference}}"}]'::jsonb,
    110,
    TRUE,
    CURRENT_DATE,
    NOW(),
    NOW()
),
(
    'PDR-LOSS-001',
    'Loss Allocation to Depositor',
    'ALL',
    'LOSS_ALLOCATION',
    'Allocates pool loss to capital providers after IRR utilisation',
    '[{"entryType":"DEBIT","accountResolution":"BY_PARAMETER","accountParameter":"customerInvestmentAccountGlCode","amountExpression":"FULL_AMOUNT","narrationTemplate":"Depositor loss allocation {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6300-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Pool loss offset {{reference}}"}]'::jsonb,
    110,
    TRUE,
    CURRENT_DATE,
    NOW(),
    NOW()
),
(
    'PDR-CHAR-001',
    'Charity Income Segregation',
    'ALL',
    'CHARITY_DISTRIBUTION',
    'Routes late payment charity income to the charity fund outside distributable profit',
    '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6600-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Charity segregation {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"2300-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Charity fund recognition {{reference}}"}]'::jsonb,
    110,
    TRUE,
    CURRENT_DATE,
    NOW(),
    NOW()
),
(
    'PDR-REV-001',
    'Profit Distribution Reversal',
    'ALL',
    'CONTRACT_CANCELLATION',
    'Template used when reversing a previously completed profit distribution run',
    '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"4200-MDR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Reverse bank mudarib income {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Reverse profit distribution expense {{reference}}"}]'::jsonb,
    110,
    TRUE,
    CURRENT_DATE,
    NOW(),
    NOW()
)
ON CONFLICT (rule_code) DO NOTHING;
