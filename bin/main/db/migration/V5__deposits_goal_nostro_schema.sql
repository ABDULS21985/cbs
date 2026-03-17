-- V5__deposits_goal_nostro_schema.sql
-- Capabilities 11-15: Fixed Deposits, Recurring Deposits, Goal Savings, Money Market, Nostro/Vostro

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 11: FIXED / TERM DEPOSITS
-- ============================================================

CREATE TABLE fixed_deposit (
    id                      BIGSERIAL PRIMARY KEY,
    deposit_number          VARCHAR(30) NOT NULL UNIQUE,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    product_id              BIGINT NOT NULL REFERENCES product(id),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Principal
    principal_amount        NUMERIC(18,2) NOT NULL CHECK (principal_amount > 0),
    current_value           NUMERIC(18,2) NOT NULL,
    accrued_interest        NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_interest_earned   NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Rate
    interest_rate           NUMERIC(8,4) NOT NULL,
    effective_rate          NUMERIC(8,4),           -- after compounding adjustment
    day_count_convention    VARCHAR(20) NOT NULL DEFAULT 'ACT_365',
    compounding_frequency   VARCHAR(20) NOT NULL DEFAULT 'NONE'
                                CHECK (compounding_frequency IN ('NONE','MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY')),
    -- Tenure
    tenure_days             INT NOT NULL,
    tenure_months           INT,
    start_date              DATE NOT NULL,
    maturity_date           DATE NOT NULL,
    -- Maturity instructions
    maturity_action         VARCHAR(30) NOT NULL DEFAULT 'CREDIT_ACCOUNT'
                                CHECK (maturity_action IN (
                                    'CREDIT_ACCOUNT','ROLLOVER_PRINCIPAL','ROLLOVER_PRINCIPAL_INTEREST',
                                    'ROLLOVER_CUSTOM','HOLD')),
    rollover_count          INT NOT NULL DEFAULT 0,
    max_rollovers           INT,
    rollover_product_id     BIGINT REFERENCES product(id),
    payout_account_id       BIGINT REFERENCES account(id),
    -- Early termination
    allows_early_termination BOOLEAN NOT NULL DEFAULT TRUE,
    early_termination_penalty_type VARCHAR(20) DEFAULT 'RATE_REDUCTION'
                                CHECK (early_termination_penalty_type IN ('RATE_REDUCTION','FLAT_FEE','PERCENTAGE','NONE')),
    early_termination_penalty_value NUMERIC(18,4) DEFAULT 0,
    -- Partial liquidation
    allows_partial_liquidation BOOLEAN NOT NULL DEFAULT FALSE,
    min_partial_amount      NUMERIC(18,2),
    min_remaining_balance   NUMERIC(18,2),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING','ACTIVE','MATURED','BROKEN','ROLLED_OVER','CLOSED')),
    broken_date             DATE,
    closed_date             DATE,
    -- Funding
    funding_account_id      BIGINT REFERENCES account(id),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_fd_account ON fixed_deposit(account_id);
CREATE INDEX idx_fd_customer ON fixed_deposit(customer_id);
CREATE INDEX idx_fd_status ON fixed_deposit(status);
CREATE INDEX idx_fd_maturity ON fixed_deposit(maturity_date) WHERE status = 'ACTIVE';
CREATE INDEX idx_fd_number ON fixed_deposit(deposit_number);

CREATE SEQUENCE fixed_deposit_seq START WITH 100001 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 12: RECURRING DEPOSITS
-- ============================================================

CREATE TABLE recurring_deposit (
    id                      BIGSERIAL PRIMARY KEY,
    deposit_number          VARCHAR(30) NOT NULL UNIQUE,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    product_id              BIGINT NOT NULL REFERENCES product(id),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Schedule
    installment_amount      NUMERIC(18,2) NOT NULL CHECK (installment_amount > 0),
    frequency               VARCHAR(20) NOT NULL CHECK (frequency IN ('WEEKLY','BI_WEEKLY','MONTHLY','QUARTERLY')),
    total_installments      INT NOT NULL,
    completed_installments  INT NOT NULL DEFAULT 0,
    missed_installments     INT NOT NULL DEFAULT 0,
    next_due_date           DATE NOT NULL,
    -- Balances
    total_deposited         NUMERIC(18,2) NOT NULL DEFAULT 0,
    accrued_interest        NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_interest_earned   NUMERIC(18,2) NOT NULL DEFAULT 0,
    current_value           NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Rate
    interest_rate           NUMERIC(8,4) NOT NULL,
    day_count_convention    VARCHAR(20) NOT NULL DEFAULT 'ACT_365',
    -- Tenure
    start_date              DATE NOT NULL,
    maturity_date           DATE NOT NULL,
    -- Penalty
    penalty_free            BOOLEAN NOT NULL DEFAULT FALSE,
    missed_penalty_rate     NUMERIC(8,4) DEFAULT 0,
    total_penalties         NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Maturity
    maturity_action         VARCHAR(30) NOT NULL DEFAULT 'CREDIT_ACCOUNT'
                                CHECK (maturity_action IN ('CREDIT_ACCOUNT','ROLLOVER','HOLD')),
    payout_account_id       BIGINT REFERENCES account(id),
    -- Funding
    debit_account_id        BIGINT REFERENCES account(id),
    auto_debit              BOOLEAN NOT NULL DEFAULT TRUE,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING','ACTIVE','MATURED','BROKEN','CLOSED','SUSPENDED')),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_rd_customer ON recurring_deposit(customer_id);
CREATE INDEX idx_rd_status ON recurring_deposit(status);
CREATE INDEX idx_rd_next_due ON recurring_deposit(next_due_date) WHERE status = 'ACTIVE';

CREATE TABLE recurring_deposit_installment (
    id                      BIGSERIAL PRIMARY KEY,
    recurring_deposit_id    BIGINT NOT NULL REFERENCES recurring_deposit(id) ON DELETE CASCADE,
    installment_number      INT NOT NULL,
    due_date                DATE NOT NULL,
    paid_date               DATE,
    amount_due              NUMERIC(18,2) NOT NULL,
    amount_paid             NUMERIC(18,2) DEFAULT 0,
    penalty_amount          NUMERIC(18,2) DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','PAID','MISSED','LATE_PAID','WAIVED')),
    transaction_ref         VARCHAR(40),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_rdi_deposit ON recurring_deposit_installment(recurring_deposit_id);
CREATE INDEX idx_rdi_due ON recurring_deposit_installment(due_date, status);

CREATE SEQUENCE recurring_deposit_seq START WITH 200001 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 13: GOAL-BASED SAVINGS
-- ============================================================

CREATE TABLE savings_goal (
    id                      BIGSERIAL PRIMARY KEY,
    goal_number             VARCHAR(30) NOT NULL UNIQUE,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    -- Goal definition
    goal_name               VARCHAR(100) NOT NULL,
    goal_description        TEXT,
    goal_icon               VARCHAR(50),
    target_amount           NUMERIC(18,2) NOT NULL CHECK (target_amount > 0),
    target_date             DATE,
    -- Progress
    current_amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
    progress_percentage     NUMERIC(5,2) NOT NULL DEFAULT 0,
    -- Auto-debit schedule
    auto_debit_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    auto_debit_amount       NUMERIC(18,2),
    auto_debit_frequency    VARCHAR(20) CHECK (auto_debit_frequency IN ('DAILY','WEEKLY','BI_WEEKLY','MONTHLY')),
    auto_debit_account_id   BIGINT REFERENCES account(id),
    next_auto_debit_date    DATE,
    -- Interest
    interest_bearing        BOOLEAN NOT NULL DEFAULT FALSE,
    interest_rate           NUMERIC(8,4) DEFAULT 0,
    accrued_interest        NUMERIC(18,4) NOT NULL DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED','EXPIRED','WITHDRAWN')),
    completed_date          DATE,
    -- Lock
    is_locked               BOOLEAN NOT NULL DEFAULT FALSE,
    allow_withdrawal_before_target BOOLEAN NOT NULL DEFAULT TRUE,
    -- Metadata
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    metadata                JSONB DEFAULT '{}',
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_goal_customer ON savings_goal(customer_id);
CREATE INDEX idx_goal_account ON savings_goal(account_id);
CREATE INDEX idx_goal_status ON savings_goal(status);
CREATE INDEX idx_goal_auto_debit ON savings_goal(next_auto_debit_date) WHERE auto_debit_enabled = TRUE AND status = 'ACTIVE';

CREATE TABLE savings_goal_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    savings_goal_id         BIGINT NOT NULL REFERENCES savings_goal(id) ON DELETE CASCADE,
    transaction_type        VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DEPOSIT','WITHDRAWAL','INTEREST','PENALTY','REVERSAL')),
    amount                  NUMERIC(18,2) NOT NULL,
    running_balance         NUMERIC(18,2) NOT NULL,
    narration               VARCHAR(300),
    source_account_id       BIGINT REFERENCES account(id),
    transaction_ref         VARCHAR(40),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100)
);

CREATE INDEX idx_goal_txn_goal ON savings_goal_transaction(savings_goal_id);

CREATE SEQUENCE savings_goal_seq START WITH 300001 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 15: NOSTRO / VOSTRO ACCOUNT MANAGEMENT
-- ============================================================

CREATE TABLE correspondent_bank (
    id                      BIGSERIAL PRIMARY KEY,
    bank_code               VARCHAR(20) NOT NULL UNIQUE,
    bank_name               VARCHAR(200) NOT NULL,
    swift_bic               VARCHAR(11),
    country                 VARCHAR(3) NOT NULL,
    city                    VARCHAR(100),
    relationship_type       VARCHAR(20) NOT NULL CHECK (relationship_type IN ('NOSTRO','VOSTRO','BOTH')),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    contact_name            VARCHAR(100),
    contact_email           VARCHAR(150),
    contact_phone           VARCHAR(20),
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE nostro_vostro_position (
    id                      BIGSERIAL PRIMARY KEY,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    correspondent_bank_id   BIGINT NOT NULL REFERENCES correspondent_bank(id),
    position_type           VARCHAR(10) NOT NULL CHECK (position_type IN ('NOSTRO','VOSTRO')),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Balances
    book_balance            NUMERIC(18,2) NOT NULL DEFAULT 0,
    statement_balance       NUMERIC(18,2) NOT NULL DEFAULT 0,
    unreconciled_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Reconciliation
    last_statement_date     DATE,
    last_reconciled_date    DATE,
    reconciliation_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (reconciliation_status IN ('PENDING','IN_PROGRESS','RECONCILED','DISCREPANCY')),
    outstanding_items_count INT NOT NULL DEFAULT 0,
    -- Limits
    credit_limit            NUMERIC(18,2),
    debit_limit             NUMERIC(18,2),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(account_id, correspondent_bank_id)
);

CREATE INDEX idx_nv_account ON nostro_vostro_position(account_id);
CREATE INDEX idx_nv_correspondent ON nostro_vostro_position(correspondent_bank_id);
CREATE INDEX idx_nv_recon ON nostro_vostro_position(reconciliation_status);

CREATE TABLE nostro_reconciliation_item (
    id                      BIGSERIAL PRIMARY KEY,
    position_id             BIGINT NOT NULL REFERENCES nostro_vostro_position(id) ON DELETE CASCADE,
    item_type               VARCHAR(20) NOT NULL CHECK (item_type IN (
                                'DEBIT_OUR_BOOKS','CREDIT_OUR_BOOKS',
                                'DEBIT_THEIR_BOOKS','CREDIT_THEIR_BOOKS',
                                'UNMATCHED_OURS','UNMATCHED_THEIRS')),
    reference               VARCHAR(100) NOT NULL,
    amount                  NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    value_date              DATE NOT NULL,
    narration               VARCHAR(300),
    match_reference         VARCHAR(100),
    match_status            VARCHAR(20) NOT NULL DEFAULT 'UNMATCHED'
                                CHECK (match_status IN ('MATCHED','UNMATCHED','PARTIAL','DISPUTED','WRITTEN_OFF')),
    resolved_date           DATE,
    resolved_by             VARCHAR(100),
    notes                   TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_recon_position ON nostro_reconciliation_item(position_id);
CREATE INDEX idx_recon_match ON nostro_reconciliation_item(match_status);
CREATE INDEX idx_recon_date ON nostro_reconciliation_item(value_date);
