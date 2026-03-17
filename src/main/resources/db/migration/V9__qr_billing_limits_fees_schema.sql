-- V9__qr_billing_limits_fees_schema.sql
-- Capabilities 31-35: QR Payments, Mobile Money, Bill Payments, Transaction Limits, Fee Engine

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 31-32: QR PAYMENTS & MOBILE MONEY
-- ============================================================

CREATE TABLE qr_code (
    id                      BIGSERIAL PRIMARY KEY,
    qr_reference            VARCHAR(40) NOT NULL UNIQUE,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    qr_type                 VARCHAR(20) NOT NULL CHECK (qr_type IN ('STATIC','DYNAMIC','ONE_TIME')),
    -- Amount
    amount                  NUMERIC(18,2),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    min_amount              NUMERIC(18,2),
    max_amount              NUMERIC(18,2),
    -- Payload
    merchant_name           VARCHAR(200),
    merchant_category_code  VARCHAR(4),
    payload_data            TEXT NOT NULL,
    -- Validity
    valid_from              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_until             TIMESTAMP WITH TIME ZONE,
    max_uses                INT,
    current_uses            INT NOT NULL DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED','CONSUMED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_qr_account ON qr_code(account_id);
CREATE INDEX idx_qr_ref ON qr_code(qr_reference);

CREATE TABLE mobile_money_link (
    id                      BIGSERIAL PRIMARY KEY,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    provider                VARCHAR(30) NOT NULL CHECK (provider IN (
                                'MPESA','MTN_MOMO','AIRTEL_MONEY','ORANGE_MONEY',
                                'GLOCASH','OPAY','PALMPAY','CUSTOM')),
    mobile_number           VARCHAR(20) NOT NULL,
    wallet_id               VARCHAR(50),
    display_name            VARCHAR(100),
    is_default              BOOLEAN NOT NULL DEFAULT FALSE,
    daily_limit             NUMERIC(18,2),
    monthly_limit           NUMERIC(18,2),
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','DELINKED')),
    linked_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_at             TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(account_id, provider, mobile_number)
);

CREATE INDEX idx_momo_account ON mobile_money_link(account_id);
CREATE INDEX idx_momo_mobile ON mobile_money_link(mobile_number);

-- ============================================================
-- CAPABILITY 33: BILL PAYMENTS & BILLER MANAGEMENT
-- ============================================================

CREATE TABLE biller (
    id                      BIGSERIAL PRIMARY KEY,
    biller_code             VARCHAR(20) NOT NULL UNIQUE,
    biller_name             VARCHAR(200) NOT NULL,
    biller_category         VARCHAR(30) NOT NULL CHECK (biller_category IN (
                                'UTILITY','TELECOM','INSURANCE','GOVERNMENT','EDUCATION',
                                'CABLE_TV','INTERNET','WATER','TAX','SUBSCRIPTION','OTHER')),
    -- Settlement
    settlement_account_id   BIGINT REFERENCES account(id),
    settlement_bank_code    VARCHAR(20),
    settlement_account_number VARCHAR(34),
    -- Validation
    customer_id_label       VARCHAR(50) DEFAULT 'Account Number',
    customer_id_regex       VARCHAR(100),
    min_amount              NUMERIC(18,2),
    max_amount              NUMERIC(18,2),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Fees
    flat_fee                NUMERIC(18,2) DEFAULT 0,
    percentage_fee          NUMERIC(5,2) DEFAULT 0,
    fee_cap                 NUMERIC(18,2),
    fee_bearer              VARCHAR(10) DEFAULT 'CUSTOMER' CHECK (fee_bearer IN ('CUSTOMER','BILLER','SPLIT')),
    -- Contact
    contact_email           VARCHAR(100),
    contact_phone           VARCHAR(20),
    logo_url                VARCHAR(500),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_biller_category ON biller(biller_category);

CREATE TABLE bill_payment (
    id                      BIGSERIAL PRIMARY KEY,
    payment_ref             VARCHAR(40) NOT NULL UNIQUE,
    biller_id               BIGINT NOT NULL REFERENCES biller(id),
    debit_account_id        BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    -- Biller reference
    biller_customer_id      VARCHAR(50) NOT NULL,
    biller_customer_name    VARCHAR(200),
    -- Amount
    bill_amount             NUMERIC(18,2) NOT NULL CHECK (bill_amount > 0),
    fee_amount              NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_amount            NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','VALIDATED','PROCESSING','COMPLETED',
                                    'FAILED','REVERSED','CANCELLED')),
    failure_reason          VARCHAR(300),
    biller_confirmation_ref VARCHAR(50),
    payment_instruction_id  BIGINT REFERENCES payment_instruction(id),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_bill_biller ON bill_payment(biller_id);
CREATE INDEX idx_bill_account ON bill_payment(debit_account_id);
CREATE INDEX idx_bill_customer ON bill_payment(customer_id);

-- ============================================================
-- CAPABILITY 34: TRANSACTION LIMITS & CONTROLS
-- ============================================================

CREATE TABLE transaction_limit (
    id                      BIGSERIAL PRIMARY KEY,
    limit_type              VARCHAR(30) NOT NULL CHECK (limit_type IN (
                                'DAILY_DEBIT','DAILY_CREDIT','SINGLE_TRANSACTION',
                                'DAILY_TRANSFER','MONTHLY_TRANSFER','DAILY_WITHDRAWAL',
                                'DAILY_POS','DAILY_ONLINE','DAILY_INTERNATIONAL')),
    -- Scope (hierarchical: global < product < account < customer override)
    scope                   VARCHAR(20) NOT NULL CHECK (scope IN ('GLOBAL','PRODUCT','ACCOUNT','CUSTOMER')),
    scope_ref_id            BIGINT,
    product_code            VARCHAR(20),
    -- Limits
    max_amount              NUMERIC(18,2) NOT NULL,
    max_count               INT,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Applicability
    applies_to_channels     VARCHAR(200) DEFAULT 'ALL',
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to            DATE,
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_txn_limit_scope ON transaction_limit(scope, scope_ref_id);
CREATE INDEX idx_txn_limit_type ON transaction_limit(limit_type);

CREATE TABLE transaction_limit_usage (
    id                      BIGSERIAL PRIMARY KEY,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    limit_type              VARCHAR(30) NOT NULL,
    usage_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount            NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_count             INT NOT NULL DEFAULT 0,
    currency_code           VARCHAR(3) NOT NULL,
    last_updated            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, limit_type, usage_date)
);

CREATE INDEX idx_limit_usage_account ON transaction_limit_usage(account_id, usage_date);

-- ============================================================
-- CAPABILITY 35: FEE & COMMISSION ENGINE
-- ============================================================

CREATE TABLE fee_definition (
    id                      BIGSERIAL PRIMARY KEY,
    fee_code                VARCHAR(30) NOT NULL UNIQUE,
    fee_name                VARCHAR(100) NOT NULL,
    fee_category            VARCHAR(30) NOT NULL CHECK (fee_category IN (
                                'ACCOUNT_MAINTENANCE','TRANSACTION','CARD','LOAN_PROCESSING',
                                'STATEMENT','CHEQUE','SWIFT','ATM','POS','ONLINE',
                                'PENALTY','COMMISSION','SERVICE_CHARGE','OTHER')),
    -- Trigger
    trigger_event           VARCHAR(50) NOT NULL,
    -- Calculation
    calculation_type        VARCHAR(20) NOT NULL CHECK (calculation_type IN (
                                'FLAT','PERCENTAGE','TIERED','SLAB','MIN_OF','MAX_OF')),
    flat_amount             NUMERIC(18,2),
    percentage              NUMERIC(8,4),
    min_fee                 NUMERIC(18,2),
    max_fee                 NUMERIC(18,2),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Tiers (for tiered/slab calculation)
    tier_config             JSONB DEFAULT '[]',
    -- Applicability
    applicable_products     VARCHAR(200),
    applicable_channels     VARCHAR(200) DEFAULT 'ALL',
    applicable_customer_types VARCHAR(200) DEFAULT 'ALL',
    -- Tax
    tax_applicable          BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate                NUMERIC(5,2) DEFAULT 0,
    tax_code                VARCHAR(20),
    -- GL
    fee_income_gl_code      VARCHAR(20),
    tax_gl_code             VARCHAR(20),
    -- Waiver
    waivable                BOOLEAN NOT NULL DEFAULT TRUE,
    waiver_authority_level  VARCHAR(20) DEFAULT 'OFFICER',
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to            DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_fee_trigger ON fee_definition(trigger_event);
CREATE INDEX idx_fee_category ON fee_definition(fee_category);

CREATE TABLE fee_charge_log (
    id                      BIGSERIAL PRIMARY KEY,
    fee_code                VARCHAR(30) NOT NULL,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    -- Amounts
    base_amount             NUMERIC(18,2) NOT NULL,
    fee_amount              NUMERIC(18,2) NOT NULL,
    tax_amount              NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_amount            NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    -- Trigger context
    trigger_event           VARCHAR(50) NOT NULL,
    trigger_ref             VARCHAR(50),
    trigger_amount          NUMERIC(18,2),
    -- Waiver
    was_waived              BOOLEAN NOT NULL DEFAULT FALSE,
    waived_by               VARCHAR(100),
    waiver_reason           VARCHAR(300),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'CHARGED'
                                CHECK (status IN ('CHARGED','WAIVED','REVERSED','PENDING')),
    charged_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_log_account ON fee_charge_log(account_id);
CREATE INDEX idx_fee_log_code ON fee_charge_log(fee_code);
CREATE INDEX idx_fee_log_date ON fee_charge_log(charged_at);
