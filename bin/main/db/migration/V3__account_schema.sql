-- V3__account_schema.sql
-- Core Account Module — Global, multi-currency, configurable products

SET search_path TO cbs;

-- ============================================================
-- CURRENCY REFERENCE (ISO 4217)
-- ============================================================

CREATE TABLE currency (
    code        VARCHAR(3) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    symbol      VARCHAR(5),
    decimals    INT NOT NULL DEFAULT 2,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Top 20 global currencies — operators enable/disable per deployment
INSERT INTO currency (code, name, symbol, decimals) VALUES
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('GBP', 'British Pound', '£', 2),
    ('JPY', 'Japanese Yen', '¥', 0),
    ('CHF', 'Swiss Franc', 'CHF', 2),
    ('CAD', 'Canadian Dollar', 'C$', 2),
    ('AUD', 'Australian Dollar', 'A$', 2),
    ('CNY', 'Chinese Yuan', '¥', 2),
    ('INR', 'Indian Rupee', '₹', 2),
    ('SGD', 'Singapore Dollar', 'S$', 2),
    ('AED', 'UAE Dirham', 'د.إ', 2),
    ('SAR', 'Saudi Riyal', '﷼', 2),
    ('ZAR', 'South African Rand', 'R', 2),
    ('NGN', 'Nigerian Naira', '₦', 2),
    ('KES', 'Kenyan Shilling', 'KSh', 2),
    ('GHS', 'Ghanaian Cedi', '₵', 2),
    ('BRL', 'Brazilian Real', 'R$', 2),
    ('MXN', 'Mexican Peso', '$', 2),
    ('TRY', 'Turkish Lira', '₺', 2),
    ('KRW', 'South Korean Won', '₩', 0);

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

CREATE TABLE product (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(20) NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    product_category    VARCHAR(30) NOT NULL CHECK (product_category IN (
                            'CURRENT','SAVINGS','FIXED_DEPOSIT','RECURRING_DEPOSIT',
                            'MONEY_MARKET','ESCROW','NOSTRO','VOSTRO','GOAL_SAVINGS')),
    currency_code       VARCHAR(3) NOT NULL REFERENCES currency(code),
    min_opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    min_operating_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    max_balance         NUMERIC(18,2),
    allows_overdraft    BOOLEAN NOT NULL DEFAULT FALSE,
    max_overdraft_limit NUMERIC(18,2) DEFAULT 0,
    allows_cheque_book  BOOLEAN NOT NULL DEFAULT FALSE,
    allows_debit_card   BOOLEAN NOT NULL DEFAULT FALSE,
    allows_mobile       BOOLEAN NOT NULL DEFAULT TRUE,
    allows_internet     BOOLEAN NOT NULL DEFAULT TRUE,
    allows_sweep        BOOLEAN NOT NULL DEFAULT FALSE,
    dormancy_days       INT NOT NULL DEFAULT 365,
    -- Interest
    interest_bearing    BOOLEAN NOT NULL DEFAULT FALSE,
    base_interest_rate  NUMERIC(8,4) DEFAULT 0,
    interest_calc_method VARCHAR(20) DEFAULT 'DAILY_BALANCE'
                            CHECK (interest_calc_method IN ('DAILY_BALANCE','MINIMUM_BALANCE','AVERAGE_BALANCE')),
    interest_posting_frequency VARCHAR(20) DEFAULT 'MONTHLY'
                            CHECK (interest_posting_frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY','AT_MATURITY')),
    interest_accrual_method VARCHAR(20) DEFAULT 'SIMPLE'
                            CHECK (interest_accrual_method IN ('SIMPLE','COMPOUND')),
    -- Fees
    monthly_maintenance_fee NUMERIC(18,2) DEFAULT 0,
    sms_alert_fee       NUMERIC(18,2) DEFAULT 0,
    -- GL
    gl_account_code     VARCHAR(20),
    gl_interest_expense_code VARCHAR(20),
    gl_interest_payable_code VARCHAR(20),
    gl_fee_income_code  VARCHAR(20),
    -- Status
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,
    -- Audit
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_category ON product(product_category);

-- ============================================================
-- INTEREST TIERS (for tiered savings / money market)
-- ============================================================

CREATE TABLE interest_tier (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    tier_name       VARCHAR(50) NOT NULL,
    min_balance     NUMERIC(18,2) NOT NULL,
    max_balance     NUMERIC(18,2),
    interest_rate   NUMERIC(8,4) NOT NULL,
    effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to    DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(product_id, tier_name)
);

CREATE INDEX idx_interest_tier_product ON interest_tier(product_id);

-- ============================================================
-- ACCOUNT
-- ============================================================

CREATE TABLE account (
    id                  BIGSERIAL PRIMARY KEY,
    account_number      VARCHAR(34) NOT NULL UNIQUE,  -- 34 = max IBAN length
    account_name        VARCHAR(200) NOT NULL,
    customer_id         BIGINT NOT NULL REFERENCES customer(id),
    product_id          BIGINT NOT NULL REFERENCES product(id),
    currency_code       VARCHAR(3) NOT NULL REFERENCES currency(code),
    account_type        VARCHAR(30) NOT NULL CHECK (account_type IN (
                            'INDIVIDUAL','JOINT','MINOR','TRUST','ESCROW',
                            'NOSTRO','VOSTRO','POOLED','OMNIBUS','CORPORATE','SME')),
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PENDING_ACTIVATION','ACTIVE','DORMANT','FROZEN',
                                              'PND_DEBIT','PND_CREDIT','CLOSED','ESCHEAT')),
    -- Balances
    book_balance        NUMERIC(18,2) NOT NULL DEFAULT 0,
    available_balance   NUMERIC(18,2) NOT NULL DEFAULT 0,
    lien_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    overdraft_limit     NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Interest
    accrued_interest    NUMERIC(18,4) NOT NULL DEFAULT 0,
    last_interest_calc_date DATE,
    last_interest_post_date DATE,
    applicable_interest_rate NUMERIC(8,4) DEFAULT 0,
    -- Lifecycle dates
    opened_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    activated_date      DATE,
    last_transaction_date DATE,
    dormancy_date       DATE,
    closed_date         DATE,
    maturity_date       DATE,
    -- Operational
    branch_code         VARCHAR(20),
    relationship_manager VARCHAR(100),
    statement_frequency VARCHAR(20) DEFAULT 'MONTHLY',
    allow_debit         BOOLEAN NOT NULL DEFAULT TRUE,
    allow_credit        BOOLEAN NOT NULL DEFAULT TRUE,
    requires_mandate    BOOLEAN NOT NULL DEFAULT FALSE,
    metadata            JSONB DEFAULT '{}',
    -- Audit
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_account_customer ON account(customer_id);
CREATE INDEX idx_account_product ON account(product_id);
CREATE INDEX idx_account_number ON account(account_number);
CREATE INDEX idx_account_status ON account(status);
CREATE INDEX idx_account_branch ON account(branch_code);
CREATE INDEX idx_account_dormancy ON account(status, last_transaction_date) WHERE status = 'ACTIVE';

CREATE TABLE account_signatory (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    customer_id     BIGINT NOT NULL REFERENCES customer(id),
    signatory_type  VARCHAR(20) NOT NULL CHECK (signatory_type IN ('PRIMARY','JOINT','MANDATE','AUTHORISED')),
    signing_rule    VARCHAR(30) DEFAULT 'ANY',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to    DATE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(account_id, customer_id)
);

CREATE INDEX idx_signatory_account ON account_signatory(account_id);
CREATE INDEX idx_signatory_customer ON account_signatory(customer_id);

-- ============================================================
-- TRANSACTION JOURNAL
-- ============================================================

CREATE TABLE transaction_journal (
    id                  BIGSERIAL PRIMARY KEY,
    transaction_ref     VARCHAR(40) NOT NULL UNIQUE,
    account_id          BIGINT NOT NULL REFERENCES account(id),
    transaction_type    VARCHAR(20) NOT NULL CHECK (transaction_type IN (
                            'CREDIT','DEBIT','REVERSAL','INTEREST_POSTING',
                            'FEE_DEBIT','TRANSFER_IN','TRANSFER_OUT',
                            'OPENING_BALANCE','ADJUSTMENT','LIEN_PLACEMENT','LIEN_RELEASE')),
    amount              NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency_code       VARCHAR(3) NOT NULL REFERENCES currency(code),
    running_balance     NUMERIC(18,2) NOT NULL,
    narration           VARCHAR(500) NOT NULL,
    value_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    posting_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    contra_account_id   BIGINT REFERENCES account(id),
    contra_account_number VARCHAR(34),
    channel             VARCHAR(20) DEFAULT 'SYSTEM',
    external_ref        VARCHAR(100),
    batch_id            VARCHAR(30),
    instrument_number   VARCHAR(20),
    status              VARCHAR(20) NOT NULL DEFAULT 'POSTED',
    reversal_ref        VARCHAR(40),
    is_reversed         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_txn_account ON transaction_journal(account_id);
CREATE INDEX idx_txn_ref ON transaction_journal(transaction_ref);
CREATE INDEX idx_txn_date ON transaction_journal(posting_date);
CREATE INDEX idx_txn_account_date ON transaction_journal(account_id, posting_date DESC);
CREATE INDEX idx_txn_status ON transaction_journal(status);

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE account_number_seq START WITH 1000000001 INCREMENT BY 1;
CREATE SEQUENCE transaction_ref_seq START WITH 1 INCREMENT BY 1;

-- ============================================================
-- STARTER PRODUCTS (currency-neutral templates — clone per deployment)
-- Products reference USD as default; operators change per deployment.
-- ============================================================

INSERT INTO product (code, name, product_category, currency_code, min_opening_balance,
    min_operating_balance, allows_overdraft, allows_cheque_book, allows_debit_card,
    interest_bearing, base_interest_rate, dormancy_days, monthly_maintenance_fee) VALUES
    ('CA-STD', 'Standard Current Account', 'CURRENT', 'USD', 100, 25, FALSE, TRUE, TRUE, FALSE, 0, 365, 5),
    ('CA-CORP', 'Corporate Current Account', 'CURRENT', 'USD', 1000, 200, TRUE, TRUE, TRUE, FALSE, 0, 365, 25),
    ('SA-STD', 'Standard Savings Account', 'SAVINGS', 'USD', 50, 10, FALSE, FALSE, TRUE, TRUE, 2.50, 365, 0),
    ('SA-PREM', 'Premium Savings Account', 'SAVINGS', 'USD', 5000, 1000, FALSE, FALSE, TRUE, TRUE, 4.00, 365, 0),
    ('SA-TIER', 'Tiered Savings Account', 'SAVINGS', 'USD', 25, 10, FALSE, FALSE, TRUE, TRUE, 0, 365, 0);

INSERT INTO interest_tier (product_id, tier_name, min_balance, max_balance, interest_rate)
SELECT p.id, t.tier_name, t.min_bal, t.max_bal, t.rate
FROM product p
CROSS JOIN (VALUES
    ('Tier 1 - Basic',       0.00,     999.99,   1.00),
    ('Tier 2 - Standard',    1000.00,  9999.99,  2.50),
    ('Tier 3 - Premium',     10000.00, 99999.99, 4.00),
    ('Tier 4 - High Value',  100000.00, NULL,    5.50)
) AS t(tier_name, min_bal, max_bal, rate)
WHERE p.code = 'SA-TIER';
