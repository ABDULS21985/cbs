-- V10__card_regulatory_aml_schema.sql
-- Capabilities 36-40: Card Management, Card Transactions, ATM/POS, Regulatory Reporting, AML/CFT

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 36-38: CARD MANAGEMENT & TRANSACTIONS
-- ============================================================

CREATE TABLE card (
    id                      BIGSERIAL PRIMARY KEY,
    card_number_hash        VARCHAR(64) NOT NULL,
    card_number_masked      VARCHAR(20) NOT NULL,
    card_reference          VARCHAR(30) NOT NULL UNIQUE,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    card_type               VARCHAR(20) NOT NULL CHECK (card_type IN ('DEBIT','CREDIT','PREPAID','VIRTUAL')),
    card_scheme             VARCHAR(20) NOT NULL CHECK (card_scheme IN ('VISA','MASTERCARD','VERVE','AMEX','UNIONPAY','LOCAL')),
    card_tier               VARCHAR(20) NOT NULL DEFAULT 'CLASSIC' CHECK (card_tier IN ('CLASSIC','GOLD','PLATINUM','INFINITE','BUSINESS')),
    -- Holder
    cardholder_name         VARCHAR(100) NOT NULL,
    -- Dates
    issue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date             DATE NOT NULL,
    last_used_date          DATE,
    -- Limits
    daily_pos_limit         NUMERIC(18,2),
    daily_atm_limit         NUMERIC(18,2),
    daily_online_limit      NUMERIC(18,2),
    single_txn_limit        NUMERIC(18,2),
    monthly_limit           NUMERIC(18,2),
    -- Credit card specific
    credit_limit            NUMERIC(18,2),
    available_credit        NUMERIC(18,2),
    outstanding_balance     NUMERIC(18,2) DEFAULT 0,
    minimum_payment         NUMERIC(18,2),
    payment_due_date        DATE,
    interest_rate           NUMERIC(8,4),
    -- Controls
    is_contactless_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    is_online_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    is_international_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_atm_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
    is_pos_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
    pin_retries_remaining   INT NOT NULL DEFAULT 3,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING_ACTIVATION','ACTIVE','BLOCKED','HOT_LISTED',
                                    'EXPIRED','REPLACED','CANCELLED','LOST','STOLEN')),
    block_reason            VARCHAR(200),
    replacement_card_id     BIGINT REFERENCES card(id),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    branch_code             VARCHAR(20),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_card_account ON card(account_id);
CREATE INDEX idx_card_customer ON card(customer_id);
CREATE INDEX idx_card_ref ON card(card_reference);
CREATE INDEX idx_card_status ON card(status);

CREATE TABLE card_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    transaction_ref         VARCHAR(40) NOT NULL UNIQUE,
    card_id                 BIGINT NOT NULL REFERENCES card(id),
    account_id              BIGINT NOT NULL REFERENCES account(id),
    -- Transaction
    transaction_type        VARCHAR(20) NOT NULL CHECK (transaction_type IN (
                                'PURCHASE','CASH_WITHDRAWAL','CASH_ADVANCE','REFUND',
                                'REVERSAL','PRE_AUTH','PRE_AUTH_COMPLETION','BALANCE_INQUIRY')),
    channel                 VARCHAR(20) NOT NULL CHECK (channel IN ('POS','ATM','ONLINE','CONTACTLESS','MOTO')),
    -- Amount
    amount                  NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    billing_amount          NUMERIC(18,2),
    billing_currency        VARCHAR(3),
    fx_rate                 NUMERIC(18,8),
    -- Merchant
    merchant_name           VARCHAR(200),
    merchant_id             VARCHAR(30),
    merchant_category_code  VARCHAR(4),
    terminal_id             VARCHAR(20),
    -- Location
    merchant_city           VARCHAR(100),
    merchant_country        VARCHAR(3),
    is_international        BOOLEAN NOT NULL DEFAULT FALSE,
    -- Authorization
    auth_code               VARCHAR(10),
    response_code           VARCHAR(4),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','AUTHORIZED','SETTLED','DECLINED',
                                    'REVERSED','DISPUTED','FRAUD_FLAGGED')),
    decline_reason          VARCHAR(200),
    -- Dispute
    is_disputed             BOOLEAN NOT NULL DEFAULT FALSE,
    dispute_reason          VARCHAR(300),
    dispute_date            DATE,
    -- Audit
    transaction_date        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    settlement_date         DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_card_txn_card ON card_transaction(card_id);
CREATE INDEX idx_card_txn_account ON card_transaction(account_id);
CREATE INDEX idx_card_txn_date ON card_transaction(transaction_date);
CREATE INDEX idx_card_txn_status ON card_transaction(status);

-- ============================================================
-- CAPABILITY 39: REGULATORY REPORTING
-- ============================================================

CREATE TABLE regulatory_report_definition (
    id                      BIGSERIAL PRIMARY KEY,
    report_code             VARCHAR(30) NOT NULL UNIQUE,
    report_name             VARCHAR(200) NOT NULL,
    regulator               VARCHAR(50) NOT NULL,
    frequency               VARCHAR(20) NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUALLY','AD_HOC')),
    -- Template
    report_category         VARCHAR(30) NOT NULL CHECK (report_category IN (
                                'PRUDENTIAL','STATISTICAL','AML_CFT','RISK','LIQUIDITY',
                                'CAPITAL_ADEQUACY','CREDIT','MARKET_RISK','OPERATIONAL','OTHER')),
    data_query              TEXT,
    template_config         JSONB DEFAULT '{}',
    output_format           VARCHAR(10) DEFAULT 'XLSX' CHECK (output_format IN ('XLSX','CSV','XML','JSON','PDF')),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE regulatory_report_run (
    id                      BIGSERIAL PRIMARY KEY,
    report_code             VARCHAR(30) NOT NULL,
    reporting_period_start  DATE NOT NULL,
    reporting_period_end    DATE NOT NULL,
    -- Execution
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','GENERATING','COMPLETED','FAILED',
                                    'SUBMITTED','ACKNOWLEDGED','REJECTED')),
    -- Results
    record_count            INT,
    file_path               VARCHAR(500),
    file_size_bytes         BIGINT,
    generation_time_ms      INT,
    error_message           TEXT,
    -- Submission
    submitted_by            VARCHAR(100),
    submitted_at            TIMESTAMP WITH TIME ZONE,
    submission_ref          VARCHAR(50),
    regulator_ack_ref       VARCHAR(50),
    -- Audit
    generated_by            VARCHAR(100),
    generated_at            TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_reg_run_code ON regulatory_report_run(report_code);
CREATE INDEX idx_reg_run_period ON regulatory_report_run(reporting_period_start, reporting_period_end);
CREATE INDEX idx_reg_run_status ON regulatory_report_run(status);

-- ============================================================
-- CAPABILITY 40: AML/CFT TRANSACTION MONITORING
-- ============================================================

CREATE TABLE aml_rule (
    id                      BIGSERIAL PRIMARY KEY,
    rule_code               VARCHAR(30) NOT NULL UNIQUE,
    rule_name               VARCHAR(200) NOT NULL,
    rule_category           VARCHAR(30) NOT NULL CHECK (rule_category IN (
                                'STRUCTURING','VELOCITY','LARGE_CASH','ROUND_AMOUNT',
                                'HIGH_RISK_COUNTRY','PEP','DORMANT_REACTIVATION',
                                'UNUSUAL_PATTERN','LAYERING','RAPID_MOVEMENT','CUSTOM')),
    description             TEXT,
    -- Thresholds
    threshold_amount        NUMERIC(18,2),
    threshold_count         INT,
    threshold_period_hours  INT,
    currency_code           VARCHAR(3),
    -- Configuration
    rule_config             JSONB NOT NULL DEFAULT '{}',
    severity                VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                                CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    -- Applicability
    applicable_customer_types VARCHAR(200) DEFAULT 'ALL',
    applicable_channels     VARCHAR(200) DEFAULT 'ALL',
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE aml_alert (
    id                      BIGSERIAL PRIMARY KEY,
    alert_ref               VARCHAR(30) NOT NULL UNIQUE,
    rule_id                 BIGINT NOT NULL REFERENCES aml_rule(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    account_id              BIGINT REFERENCES account(id),
    -- Alert details
    alert_type              VARCHAR(30) NOT NULL,
    severity                VARCHAR(10) NOT NULL,
    description             TEXT NOT NULL,
    -- Trigger data
    trigger_amount          NUMERIC(18,2),
    trigger_count           INT,
    trigger_period          VARCHAR(50),
    trigger_transactions    JSONB DEFAULT '[]',
    -- Investigation
    status                  VARCHAR(20) NOT NULL DEFAULT 'NEW'
                                CHECK (status IN ('NEW','UNDER_REVIEW','ESCALATED','SAR_FILED',
                                    'FALSE_POSITIVE','CLOSED','ARCHIVED')),
    assigned_to             VARCHAR(100),
    priority                VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    -- Resolution
    resolution_notes        TEXT,
    resolved_by             VARCHAR(100),
    resolved_at             TIMESTAMP WITH TIME ZONE,
    sar_reference           VARCHAR(50),
    sar_filed_date          DATE,
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_aml_alert_customer ON aml_alert(customer_id);
CREATE INDEX idx_aml_alert_status ON aml_alert(status);
CREATE INDEX idx_aml_alert_severity ON aml_alert(severity);
CREATE INDEX idx_aml_alert_rule ON aml_alert(rule_id);

CREATE SEQUENCE aml_alert_seq START WITH 1 INCREMENT BY 1;
