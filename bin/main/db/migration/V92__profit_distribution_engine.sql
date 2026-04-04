SET search_path TO cbs;

-- ============================================================================
-- V88: Profit Distribution Engine
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. pool_asset_assignment — links financing assets to pools
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pool_asset_assignment (
    id                      BIGSERIAL PRIMARY KEY,
    pool_id                 BIGINT NOT NULL REFERENCES investment_pool(id),
    asset_type              VARCHAR(40) NOT NULL CHECK (asset_type IN (
                                'MURABAHA_FINANCING', 'IJARAH_CONTRACT', 'MUSHARAKAH_INVESTMENT',
                                'MUDARABAH_INVESTMENT', 'SUKUK_HOLDING', 'SALAM_CONTRACT',
                                'ISTISNA_CONTRACT', 'INTERBANK_PLACEMENT', 'REAL_ESTATE', 'OTHER')),
    asset_reference_id      BIGINT,
    asset_reference_code    VARCHAR(100),
    asset_description       VARCHAR(500),
    assigned_amount         DECIMAL(18,2) NOT NULL,
    current_outstanding     DECIMAL(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    assigned_date           DATE NOT NULL,
    unassigned_date         DATE,
    assignment_status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (assignment_status IN (
                                'ACTIVE', 'MATURED', 'DEFAULTED', 'TRANSFERRED', 'UNASSIGNED')),
    expected_return_rate    DECIMAL(8,4),
    risk_weight             DECIMAL(8,4),
    contract_type_code      VARCHAR(30),
    maturity_date           DATE,
    last_income_date        DATE,
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pool_asset_assignment_pool_id
    ON pool_asset_assignment (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_asset_assignment_status
    ON pool_asset_assignment (assignment_status);
CREATE INDEX IF NOT EXISTS idx_pool_asset_assignment_asset_ref
    ON pool_asset_assignment (asset_reference_id);

-- --------------------------------------------------------------------------
-- 2. pool_income_record — income from pool assets
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pool_income_record (
    id                      BIGSERIAL PRIMARY KEY,
    pool_id                 BIGINT NOT NULL REFERENCES investment_pool(id),
    asset_assignment_id     BIGINT REFERENCES pool_asset_assignment(id),
    income_type             VARCHAR(40) NOT NULL,
    amount                  DECIMAL(18,4) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    income_date             DATE NOT NULL,
    period_from             DATE NOT NULL,
    period_to               DATE NOT NULL,
    journal_ref             VARCHAR(50),
    asset_reference_code    VARCHAR(100),
    contract_type_code      VARCHAR(30),
    is_charity_income       BOOLEAN NOT NULL DEFAULT false,
    notes                   TEXT,
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_pool_income_record_pool_id
    ON pool_income_record (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_income_record_period
    ON pool_income_record (period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_pool_income_record_charity
    ON pool_income_record (is_charity_income);

-- --------------------------------------------------------------------------
-- 3. pool_expense_record — expenses charged against pool
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pool_expense_record (
    id                      BIGSERIAL PRIMARY KEY,
    pool_id                 BIGINT NOT NULL REFERENCES investment_pool(id),
    expense_type            VARCHAR(40) NOT NULL,
    amount                  DECIMAL(18,4) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    expense_date            DATE NOT NULL,
    period_from             DATE NOT NULL,
    period_to               DATE NOT NULL,
    journal_ref             VARCHAR(50),
    description             VARCHAR(500),
    allocation_method       VARCHAR(30) DEFAULT 'DIRECT' CHECK (allocation_method IN (
                                'DIRECT', 'PRO_RATA_BY_ASSET_SIZE', 'PRO_RATA_BY_INCOME', 'FIXED')),
    allocation_basis        TEXT,
    approved_by             VARCHAR(100),
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_pool_expense_record_pool_id
    ON pool_expense_record (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_expense_record_period
    ON pool_expense_record (period_from, period_to);

-- --------------------------------------------------------------------------
-- 4. pool_profit_calculation — P&L for a pool per period
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pool_profit_calculation (
    id                          BIGSERIAL PRIMARY KEY,
    pool_id                     BIGINT NOT NULL REFERENCES investment_pool(id),
    calculation_ref             VARCHAR(80) UNIQUE NOT NULL,
    period_from                 DATE NOT NULL,
    period_to                   DATE NOT NULL,
    period_type                 VARCHAR(20) NOT NULL CHECK (period_type IN (
                                    'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'CUSTOM')),
    currency_code               VARCHAR(3) NOT NULL,
    gross_income                DECIMAL(18,4) NOT NULL DEFAULT 0,
    income_breakdown            JSONB,
    charity_income              DECIMAL(18,4) NOT NULL DEFAULT 0,
    distributable_gross_income  DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_expenses              DECIMAL(18,4) NOT NULL DEFAULT 0,
    expense_breakdown           JSONB,
    net_distributable_profit    DECIMAL(18,4) NOT NULL DEFAULT 0,
    is_loss                     BOOLEAN NOT NULL DEFAULT false,
    average_pool_balance        DECIMAL(18,4),
    period_days                 INT,
    effective_return_rate       DECIMAL(8,4),
    bank_mudarib_share          DECIMAL(18,4) DEFAULT 0,
    bank_mudarib_method         VARCHAR(30),
    depositor_pool              DECIMAL(18,4) DEFAULT 0,
    calculation_status          VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (calculation_status IN (
                                    'DRAFT', 'VALIDATED', 'APPROVED', 'USED_IN_DISTRIBUTION')),
    calculated_by               VARCHAR(100),
    calculated_at               TIMESTAMP,
    validated_by                VARCHAR(100),
    validated_at                TIMESTAMP,
    approved_by                 VARCHAR(100),
    approved_at                 TIMESTAMP,
    notes                       TEXT,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    version                     BIGINT DEFAULT 0,

    CONSTRAINT uq_pool_profit_calc_period UNIQUE (pool_id, period_from, period_to)
);

CREATE INDEX IF NOT EXISTS idx_pool_profit_calculation_pool_id
    ON pool_profit_calculation (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_profit_calculation_status
    ON pool_profit_calculation (calculation_status);

-- --------------------------------------------------------------------------
-- 5. profit_distribution_run — master orchestration record
--    (created before distribution_reserve_transaction due to FK dependency)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profit_distribution_run (
    id                                  BIGSERIAL PRIMARY KEY,
    run_ref                             VARCHAR(80) UNIQUE NOT NULL,
    pool_id                             BIGINT NOT NULL REFERENCES investment_pool(id),
    pool_code                           VARCHAR(60),
    period_from                         DATE NOT NULL,
    period_to                           DATE NOT NULL,
    period_type                         VARCHAR(20) NOT NULL,
    currency_code                       VARCHAR(3) NOT NULL,
    profit_calculation_id               BIGINT,
    allocation_batch_id                 BIGINT,
    gross_pool_income                   DECIMAL(18,4),
    charity_income_excluded             DECIMAL(18,4),
    pool_expenses                       DECIMAL(18,4),
    net_distributable_profit            DECIMAL(18,4),
    bank_mudarib_share                  DECIMAL(18,4),
    depositor_pool_before_reserves      DECIMAL(18,4),
    per_adjustment                      DECIMAL(18,4),
    irr_adjustment                      DECIMAL(18,4),
    depositor_pool_after_reserves       DECIMAL(18,4),
    total_distributed_to_depositors     DECIMAL(18,4),
    total_bank_share_from_psr           DECIMAL(18,4),
    participant_count                   INT,
    average_effective_rate              DECIMAL(8,4),
    minimum_rate                        DECIMAL(8,4),
    maximum_rate                        DECIMAL(8,4),
    median_rate                         DECIMAL(8,4),
    is_loss                             BOOLEAN DEFAULT false,
    total_loss_amount                   DECIMAL(18,4),
    loss_absorbed_by_irr                DECIMAL(18,4),
    loss_passed_to_depositors           DECIMAL(18,4),
    status                              VARCHAR(30) NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
                                            'INITIATED', 'CALCULATED', 'CALCULATION_APPROVED',
                                            'RESERVES_APPLIED', 'ALLOCATED', 'ALLOCATION_APPROVED',
                                            'DISTRIBUTING', 'DISTRIBUTED', 'SSB_REVIEW_PENDING',
                                            'SSB_CERTIFIED', 'COMPLETED', 'FAILED', 'REVERSED')),
    initiated_by                        VARCHAR(100),
    initiated_at                        TIMESTAMP NOT NULL DEFAULT NOW(),
    calculated_by                       VARCHAR(100),
    calculated_at                       TIMESTAMP,
    calculation_approved_by             VARCHAR(100),
    calculation_approved_at             TIMESTAMP,
    reserves_applied_by                 VARCHAR(100),
    reserves_applied_at                 TIMESTAMP,
    allocated_by                        VARCHAR(100),
    allocated_at                        TIMESTAMP,
    allocation_approved_by              VARCHAR(100),
    allocation_approved_at              TIMESTAMP,
    distributed_by                      VARCHAR(100),
    distributed_at                      TIMESTAMP,
    ssb_reviewed_by                     VARCHAR(100),
    ssb_reviewed_at                     TIMESTAMP,
    ssb_certification_ref               VARCHAR(100),
    ssb_comments                        TEXT,
    completed_at                        TIMESTAMP,
    failed_at                           TIMESTAMP,
    failure_reason                      TEXT,
    failed_step                         VARCHAR(60),
    retry_count                         INT DEFAULT 0,
    reversed_at                         TIMESTAMP,
    reversed_by                         VARCHAR(100),
    reversal_reason                     TEXT,
    reversal_journal_ref                VARCHAR(50),
    tenant_id                           BIGINT,
    created_at                          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMP NOT NULL DEFAULT NOW(),
    version                             BIGINT DEFAULT 0,

    CONSTRAINT uq_distribution_run_pool_period UNIQUE (pool_id, period_from, period_to)
);

CREATE INDEX IF NOT EXISTS idx_profit_distribution_run_pool_id
    ON profit_distribution_run (pool_id);
CREATE INDEX IF NOT EXISTS idx_profit_distribution_run_status
    ON profit_distribution_run (status);

-- --------------------------------------------------------------------------
-- 6. distribution_reserve_transaction — PER/IRR in distribution context
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS distribution_reserve_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    distribution_run_id     BIGINT NOT NULL REFERENCES profit_distribution_run(id),
    pool_id                 BIGINT NOT NULL,
    reserve_type            VARCHAR(10) NOT NULL CHECK (reserve_type IN ('PER', 'IRR')),
    transaction_type        VARCHAR(20) NOT NULL CHECK (transaction_type IN ('RETENTION', 'RELEASE')),
    amount                  DECIMAL(18,4) NOT NULL,
    balance_before          DECIMAL(18,4) NOT NULL,
    balance_after           DECIMAL(18,4) NOT NULL,
    trigger_reason          TEXT,
    per_transaction_id      BIGINT,
    irr_transaction_id      BIGINT,
    journal_ref             VARCHAR(50),
    amount_before_reserve   DECIMAL(18,4),
    amount_after_reserve    DECIMAL(18,4),
    effective_rate_before   DECIMAL(8,4),
    effective_rate_after    DECIMAL(8,4),
    processed_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_by            VARCHAR(100),
    tenant_id               BIGINT
);

CREATE INDEX IF NOT EXISTS idx_dist_reserve_txn_run_id
    ON distribution_reserve_transaction (distribution_run_id);
CREATE INDEX IF NOT EXISTS idx_dist_reserve_txn_reserve_type
    ON distribution_reserve_transaction (reserve_type);

-- --------------------------------------------------------------------------
-- 7. distribution_run_step_log — detailed step log
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS distribution_run_step_log (
    id                      BIGSERIAL PRIMARY KEY,
    distribution_run_id     BIGINT NOT NULL REFERENCES profit_distribution_run(id),
    step_number             INT NOT NULL,
    step_name               VARCHAR(100) NOT NULL,
    step_status             VARCHAR(20) NOT NULL DEFAULT 'STARTED' CHECK (step_status IN (
                                'STARTED', 'COMPLETED', 'FAILED', 'SKIPPED')),
    started_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMP,
    duration_ms             BIGINT,
    input_data              JSONB,
    output_data             JSONB,
    error_message           TEXT,
    error_stack_trace       TEXT,
    journal_ref             VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_dist_run_step_log_run_id
    ON distribution_run_step_log (distribution_run_id);

-- ============================================================================
-- Seed posting rules for profit distribution
-- ============================================================================

INSERT INTO islamic_posting_rule (rule_code, name, contract_type_code, transaction_type, description, entries, priority, enabled, effective_from, created_at, updated_at)
VALUES
('PDR-PROFIT-DIST', 'Profit Distribution to Depositors', 'ALL', 'PROFIT_DISTRIBUTION',
 'Credits depositor accounts with their profit share',
 '[{"entryType":"DEBIT","accountResolution":"BY_POOL","accountCategory":"UNRESTRICTED_INVESTMENT_ACCOUNT","amountExpression":"PROFIT","narrationTemplate":"Profit distribution for period {{periodFrom}} to {{periodTo}}"},{"entryType":"CREDIT","accountResolution":"BY_PARAMETER","accountParameter":"customerAccountGl","amountExpression":"PROFIT","narrationTemplate":"Profit share credited for period {{periodFrom}} to {{periodTo}}"}]',
 100, true, CURRENT_DATE, NOW(), NOW()),

('PDR-LOSS-ALLOC', 'Loss Allocation to Depositors', 'ALL', 'LOSS_ALLOCATION',
 'Debits depositor accounts for capital losses',
 '[{"entryType":"DEBIT","accountResolution":"BY_PARAMETER","accountParameter":"customerAccountGl","amountExpression":"FULL_AMOUNT","narrationTemplate":"Pool loss allocation for period {{periodFrom}} to {{periodTo}}"},{"entryType":"CREDIT","accountResolution":"BY_POOL","accountCategory":"UNRESTRICTED_INVESTMENT_ACCOUNT","amountExpression":"FULL_AMOUNT","narrationTemplate":"Pool loss charged for period {{periodFrom}} to {{periodTo}}"}]',
 100, true, CURRENT_DATE, NOW(), NOW()),

('PDR-BANK-MUDARIB', 'Bank Mudarib Fee', 'ALL', 'MUDARIB_FEE',
 'Records bank management share from pool profit',
 '[{"entryType":"DEBIT","accountResolution":"BY_POOL","accountCategory":"UNRESTRICTED_INVESTMENT_ACCOUNT","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarib fee for period {{periodFrom}} to {{periodTo}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"4200-MDR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarib income from pool {{poolCode}}"}]',
 100, true, CURRENT_DATE, NOW(), NOW())
ON CONFLICT (rule_code) DO NOTHING;
