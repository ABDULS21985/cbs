-- V11__multicurrency_treasury_cheque_vault_eod.sql
-- Capabilities 41-45: Multi-Currency, Treasury, Cheque, Vault/Cash, EOD

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 41: MULTI-CURRENCY ACCOUNT SUPPORT
-- ============================================================

CREATE TABLE currency_wallet (
    id                      BIGSERIAL PRIMARY KEY,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    book_balance            NUMERIC(18,2) NOT NULL DEFAULT 0,
    available_balance       NUMERIC(18,2) NOT NULL DEFAULT 0,
    lien_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
    is_primary              BOOLEAN NOT NULL DEFAULT FALSE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','FROZEN','CLOSED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(account_id, currency_code)
);

CREATE INDEX idx_wallet_account ON currency_wallet(account_id);

-- ============================================================
-- CAPABILITY 42: TREASURY & MONEY MARKET OPERATIONS
-- ============================================================

CREATE TABLE treasury_deal (
    id                      BIGSERIAL PRIMARY KEY,
    deal_number             VARCHAR(30) NOT NULL UNIQUE,
    deal_type               VARCHAR(30) NOT NULL CHECK (deal_type IN (
                                'FX_SPOT','FX_FORWARD','FX_SWAP','MONEY_MARKET_PLACEMENT',
                                'MONEY_MARKET_BORROWING','BOND_PURCHASE','BOND_SALE',
                                'REPO','REVERSE_REPO','TBILL_PURCHASE','TBILL_DISCOUNT')),
    counterparty_id         BIGINT REFERENCES correspondent_bank(id),
    counterparty_name       VARCHAR(200),
    -- Leg 1 (buy/place/lend)
    leg1_currency           VARCHAR(3) NOT NULL REFERENCES currency(code),
    leg1_amount             NUMERIC(18,2) NOT NULL,
    leg1_account_id         BIGINT REFERENCES account(id),
    leg1_value_date         DATE NOT NULL,
    -- Leg 2 (sell/receive/borrow)
    leg2_currency           VARCHAR(3) REFERENCES currency(code),
    leg2_amount             NUMERIC(18,2),
    leg2_account_id         BIGINT REFERENCES account(id),
    leg2_value_date         DATE,
    -- Rate
    deal_rate               NUMERIC(18,8),
    yield_rate              NUMERIC(8,4),
    spread                  NUMERIC(8,4),
    -- Tenor
    tenor_days              INT,
    maturity_date           DATE,
    -- P&L
    realized_pnl            NUMERIC(18,2) DEFAULT 0,
    unrealized_pnl          NUMERIC(18,2) DEFAULT 0,
    accrued_interest        NUMERIC(18,4) DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','CONFIRMED','SETTLED','MATURED',
                                    'CANCELLED','DEFAULTED')),
    confirmed_by            VARCHAR(100),
    confirmed_at            TIMESTAMP WITH TIME ZONE,
    settled_by              VARCHAR(100),
    settled_at              TIMESTAMP WITH TIME ZONE,
    -- Audit
    dealer                  VARCHAR(100),
    branch_code             VARCHAR(20),
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_treasury_deal_type ON treasury_deal(deal_type);
CREATE INDEX idx_treasury_deal_status ON treasury_deal(status);
CREATE INDEX idx_treasury_deal_maturity ON treasury_deal(maturity_date) WHERE status IN ('CONFIRMED','SETTLED');

CREATE SEQUENCE treasury_deal_seq START WITH 1 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 43: CHEQUE MANAGEMENT & CLEARING
-- ============================================================

CREATE TABLE cheque_book (
    id                      BIGSERIAL PRIMARY KEY,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    series_prefix           VARCHAR(10) NOT NULL,
    start_number            INT NOT NULL,
    end_number              INT NOT NULL,
    total_leaves            INT NOT NULL,
    used_leaves             INT NOT NULL DEFAULT 0,
    spoiled_leaves          INT NOT NULL DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('REQUESTED','ACTIVE','EXHAUSTED','CANCELLED')),
    issued_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_chequebook_account ON cheque_book(account_id);

CREATE TABLE cheque_leaf (
    id                      BIGSERIAL PRIMARY KEY,
    cheque_book_id          BIGINT NOT NULL REFERENCES cheque_book(id) ON DELETE CASCADE,
    cheque_number           VARCHAR(20) NOT NULL,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    -- Cheque details
    payee_name              VARCHAR(200),
    amount                  NUMERIC(18,2),
    currency_code           VARCHAR(3) REFERENCES currency(code),
    cheque_date             DATE,
    -- Clearing
    presented_date          DATE,
    clearing_date           DATE,
    presenting_bank_code    VARCHAR(20),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'UNUSED'
                                CHECK (status IN ('UNUSED','ISSUED','PRESENTED','CLEARING',
                                    'CLEARED','RETURNED','STOPPED','SPOILED','STALE')),
    return_reason           VARCHAR(200),
    stop_reason             VARCHAR(200),
    stopped_by              VARCHAR(100),
    stopped_at              TIMESTAMP WITH TIME ZONE,
    -- MICR
    micr_code               VARCHAR(30),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(account_id, cheque_number)
);

CREATE INDEX idx_cheque_leaf_book ON cheque_leaf(cheque_book_id);
CREATE INDEX idx_cheque_leaf_account ON cheque_leaf(account_id);
CREATE INDEX idx_cheque_leaf_status ON cheque_leaf(status);
CREATE INDEX idx_cheque_leaf_number ON cheque_leaf(cheque_number);

-- ============================================================
-- CAPABILITY 44: VAULT & CASH MANAGEMENT
-- ============================================================

CREATE TABLE vault (
    id                      BIGSERIAL PRIMARY KEY,
    vault_code              VARCHAR(20) NOT NULL UNIQUE,
    vault_name              VARCHAR(100) NOT NULL,
    branch_code             VARCHAR(20) NOT NULL,
    vault_type              VARCHAR(20) NOT NULL CHECK (vault_type IN ('MAIN','SUBSIDIARY','ATM','TELLER')),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    current_balance         NUMERIC(18,2) NOT NULL DEFAULT 0,
    minimum_balance         NUMERIC(18,2) DEFAULT 0,
    maximum_balance         NUMERIC(18,2),
    insurance_limit         NUMERIC(18,2),
    custodian               VARCHAR(100),
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','CLOSED','UNDER_AUDIT')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE vault_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    vault_id                BIGINT NOT NULL REFERENCES vault(id),
    transaction_type        VARCHAR(20) NOT NULL CHECK (transaction_type IN (
                                'CASH_IN','CASH_OUT','VAULT_TRANSFER','ATM_LOAD',
                                'ATM_UNLOAD','TELLER_ISSUE','TELLER_RETURN','ADJUSTMENT')),
    amount                  NUMERIC(18,2) NOT NULL,
    running_balance         NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    -- Transfer
    counterparty_vault_id   BIGINT REFERENCES vault(id),
    -- Reference
    reference               VARCHAR(50),
    narration               VARCHAR(300),
    performed_by            VARCHAR(100) NOT NULL,
    approved_by             VARCHAR(100),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_vault_txn_vault ON vault_transaction(vault_id);

-- ============================================================
-- CAPABILITY 45: END-OF-DAY / PERIOD CLOSE
-- ============================================================

CREATE TABLE eod_run (
    id                      BIGSERIAL PRIMARY KEY,
    business_date           DATE NOT NULL,
    run_type                VARCHAR(20) NOT NULL CHECK (run_type IN ('EOD','EOM','EOQ','EOY')),
    -- Steps
    total_steps             INT NOT NULL DEFAULT 0,
    completed_steps         INT NOT NULL DEFAULT 0,
    failed_steps            INT NOT NULL DEFAULT 0,
    -- Timing
    started_at              TIMESTAMP WITH TIME ZONE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    duration_seconds        INT,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED','ROLLED_BACK')),
    error_message           TEXT,
    -- Audit
    initiated_by            VARCHAR(100),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(business_date, run_type)
);

CREATE TABLE eod_step (
    id                      BIGSERIAL PRIMARY KEY,
    eod_run_id              BIGINT NOT NULL REFERENCES eod_run(id) ON DELETE CASCADE,
    step_order              INT NOT NULL,
    step_name               VARCHAR(100) NOT NULL,
    step_description        VARCHAR(300),
    -- Execution
    started_at              TIMESTAMP WITH TIME ZONE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    duration_ms             INT,
    records_processed       INT DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED','SKIPPED')),
    error_message           TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_eod_step_run ON eod_step(eod_run_id);
CREATE INDEX idx_eod_run_date ON eod_run(business_date);
