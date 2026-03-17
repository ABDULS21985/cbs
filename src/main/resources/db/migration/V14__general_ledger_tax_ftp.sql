-- V14__general_ledger_tax_ftp.sql
-- Capabilities 68-70, 73-74: GL, Sub-Ledger Recon, Accrual, FTP, Tax Engine

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 68: REAL-TIME GENERAL LEDGER
-- ============================================================

CREATE TABLE chart_of_accounts (
    id                      BIGSERIAL PRIMARY KEY,
    gl_code                 VARCHAR(20) NOT NULL UNIQUE,
    gl_name                 VARCHAR(200) NOT NULL,
    gl_category             VARCHAR(20) NOT NULL CHECK (gl_category IN (
                                'ASSET','LIABILITY','EQUITY','INCOME','EXPENSE','CONTINGENT')),
    gl_sub_category         VARCHAR(30),
    parent_gl_code          VARCHAR(20),
    -- Hierarchy
    level_number            INT NOT NULL DEFAULT 1,
    is_header               BOOLEAN NOT NULL DEFAULT FALSE,
    is_postable             BOOLEAN NOT NULL DEFAULT TRUE,
    -- Currency
    currency_code           VARCHAR(3) REFERENCES currency(code),
    is_multi_currency       BOOLEAN NOT NULL DEFAULT FALSE,
    -- Branch
    branch_code             VARCHAR(20),
    is_inter_branch         BOOLEAN NOT NULL DEFAULT FALSE,
    -- Controls
    normal_balance          VARCHAR(6) NOT NULL CHECK (normal_balance IN ('DEBIT','CREDIT')),
    allow_manual_posting    BOOLEAN NOT NULL DEFAULT TRUE,
    requires_cost_centre    BOOLEAN NOT NULL DEFAULT FALSE,
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_coa_category ON chart_of_accounts(gl_category);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_gl_code);

CREATE TABLE journal_entry (
    id                      BIGSERIAL PRIMARY KEY,
    journal_number          VARCHAR(30) NOT NULL UNIQUE,
    journal_type            VARCHAR(20) NOT NULL CHECK (journal_type IN (
                                'SYSTEM','MANUAL','REVERSAL','ADJUSTMENT','ACCRUAL',
                                'REVALUATION','CLOSING','OPENING','INTER_BRANCH')),
    description             VARCHAR(500) NOT NULL,
    -- Source
    source_module           VARCHAR(30),
    source_ref              VARCHAR(50),
    -- Value
    value_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    posting_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','POSTED','REVERSED','FAILED')),
    -- Totals (denormalised for quick validation)
    total_debit             NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_credit            NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Approval
    created_by              VARCHAR(100) NOT NULL,
    approved_by             VARCHAR(100),
    posted_at               TIMESTAMP WITH TIME ZONE,
    reversed_at             TIMESTAMP WITH TIME ZONE,
    reversal_journal_id     BIGINT REFERENCES journal_entry(id),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_journal_date ON journal_entry(posting_date);
CREATE INDEX idx_journal_status ON journal_entry(status);
CREATE INDEX idx_journal_source ON journal_entry(source_module, source_ref);

CREATE TABLE journal_line (
    id                      BIGSERIAL PRIMARY KEY,
    journal_id              BIGINT NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
    line_number             INT NOT NULL,
    gl_code                 VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(gl_code),
    -- Amount
    debit_amount            NUMERIC(18,2) NOT NULL DEFAULT 0,
    credit_amount           NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_code           VARCHAR(3) NOT NULL,
    local_debit             NUMERIC(18,2) NOT NULL DEFAULT 0,
    local_credit            NUMERIC(18,2) NOT NULL DEFAULT 0,
    fx_rate                 NUMERIC(18,8) DEFAULT 1,
    -- Reference
    narration               VARCHAR(300),
    cost_centre             VARCHAR(20),
    branch_code             VARCHAR(20),
    account_id              BIGINT REFERENCES account(id),
    customer_id             BIGINT REFERENCES customer(id),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journal_line_journal ON journal_line(journal_id);
CREATE INDEX idx_journal_line_gl ON journal_line(gl_code);
CREATE INDEX idx_journal_line_account ON journal_line(account_id);

CREATE TABLE gl_balance (
    id                      BIGSERIAL PRIMARY KEY,
    gl_code                 VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(gl_code),
    branch_code             VARCHAR(20) NOT NULL DEFAULT 'HEAD',
    currency_code           VARCHAR(3) NOT NULL,
    balance_date            DATE NOT NULL,
    -- Balances
    opening_balance         NUMERIC(18,2) NOT NULL DEFAULT 0,
    debit_total             NUMERIC(18,2) NOT NULL DEFAULT 0,
    credit_total            NUMERIC(18,2) NOT NULL DEFAULT 0,
    closing_balance         NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Count
    transaction_count       INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(gl_code, branch_code, currency_code, balance_date)
);

CREATE INDEX idx_gl_balance_date ON gl_balance(balance_date);

-- ============================================================
-- CAPABILITY 69: SUB-LEDGER RECONCILIATION
-- ============================================================

CREATE TABLE subledger_recon_run (
    id                      BIGSERIAL PRIMARY KEY,
    recon_date              DATE NOT NULL,
    subledger_type          VARCHAR(20) NOT NULL CHECK (subledger_type IN (
                                'DEPOSITS','LOANS','CARDS','TRADE_FINANCE','FX','FEES')),
    gl_code                 VARCHAR(20) NOT NULL,
    -- Balances
    gl_balance              NUMERIC(18,2) NOT NULL,
    subledger_balance       NUMERIC(18,2) NOT NULL,
    difference              NUMERIC(18,2) NOT NULL,
    -- Status
    is_balanced             BOOLEAN NOT NULL,
    exception_count         INT NOT NULL DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
                                CHECK (status IN ('RUNNING','COMPLETED','EXCEPTIONS','FAILED')),
    resolved_by             VARCHAR(100),
    resolved_at             TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_subledger_recon_date ON subledger_recon_run(recon_date);

-- ============================================================
-- CAPABILITY 73: FUNDS TRANSFER PRICING (FTP)
-- ============================================================

CREATE TABLE ftp_rate_curve (
    id                      BIGSERIAL PRIMARY KEY,
    curve_name              VARCHAR(50) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    effective_date          DATE NOT NULL,
    tenor_days              INT NOT NULL,
    rate                    NUMERIC(8,4) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(curve_name, currency_code, effective_date, tenor_days)
);

CREATE TABLE ftp_allocation (
    id                      BIGSERIAL PRIMARY KEY,
    allocation_date         DATE NOT NULL,
    entity_type             VARCHAR(20) NOT NULL CHECK (entity_type IN ('ACCOUNT','PRODUCT','BRANCH','CUSTOMER')),
    entity_id               BIGINT NOT NULL,
    entity_ref              VARCHAR(50),
    currency_code           VARCHAR(3) NOT NULL,
    -- Balances
    average_balance         NUMERIC(18,2) NOT NULL,
    -- Rates
    actual_rate             NUMERIC(8,4) NOT NULL,
    ftp_rate                NUMERIC(8,4) NOT NULL,
    spread                  NUMERIC(8,4) NOT NULL,
    -- P&L
    interest_income_expense NUMERIC(18,2) NOT NULL DEFAULT 0,
    ftp_charge              NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_margin              NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_ftp_allocation_date ON ftp_allocation(allocation_date);
CREATE INDEX idx_ftp_allocation_entity ON ftp_allocation(entity_type, entity_id);

-- ============================================================
-- CAPABILITY 74: TAX ENGINE
-- ============================================================

CREATE TABLE tax_rule (
    id                      BIGSERIAL PRIMARY KEY,
    tax_code                VARCHAR(20) NOT NULL UNIQUE,
    tax_name                VARCHAR(100) NOT NULL,
    tax_type                VARCHAR(20) NOT NULL CHECK (tax_type IN (
                                'WITHHOLDING_TAX','VAT','STAMP_DUTY','CAPITAL_GAINS',
                                'EDUCATION_TAX','PAYE','CUSTOM_DUTY','OTHER')),
    tax_rate                NUMERIC(8,4) NOT NULL,
    -- Applicability
    applies_to              VARCHAR(30) NOT NULL CHECK (applies_to IN (
                                'INTEREST_INCOME','FEE_INCOME','DIVIDEND','TRANSFER',
                                'CARD_TRANSACTION','TRADE_FINANCE','ALL')),
    threshold_amount        NUMERIC(18,2),
    currency_code           VARCHAR(3),
    -- Exemptions
    exempt_customer_types   VARCHAR(200) DEFAULT '',
    exempt_product_codes    VARCHAR(500) DEFAULT '',
    -- GL
    tax_receivable_gl       VARCHAR(20),
    tax_payable_gl          VARCHAR(20),
    -- Status
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to            DATE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE tax_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    tax_code                VARCHAR(20) NOT NULL,
    tax_type                VARCHAR(20) NOT NULL,
    -- Source
    source_module           VARCHAR(30) NOT NULL,
    source_ref              VARCHAR(50),
    account_id              BIGINT REFERENCES account(id),
    customer_id             BIGINT REFERENCES customer(id),
    -- Amounts
    base_amount             NUMERIC(18,2) NOT NULL,
    tax_rate_applied        NUMERIC(8,4) NOT NULL,
    tax_amount              NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    -- GL posting
    journal_id              BIGINT REFERENCES journal_entry(id),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'CALCULATED'
                                CHECK (status IN ('CALCULATED','DEDUCTED','REMITTED','REVERSED')),
    remittance_ref          VARCHAR(50),
    remittance_date         DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_tax_txn_account ON tax_transaction(account_id);
CREATE INDEX idx_tax_txn_code ON tax_transaction(tax_code);

CREATE SEQUENCE journal_seq START WITH 1 INCREMENT BY 1;
