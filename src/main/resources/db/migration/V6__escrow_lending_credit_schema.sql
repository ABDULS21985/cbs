-- V6__escrow_lending_credit_schema.sql
-- Capabilities 16-20: Escrow, Retail/Corporate Lending, Islamic Finance, Credit Decisioning

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 16: ESCROW & TRUST ACCOUNTS
-- ============================================================

CREATE TABLE escrow_mandate (
    id                      BIGSERIAL PRIMARY KEY,
    mandate_number          VARCHAR(30) NOT NULL UNIQUE,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    escrow_type             VARCHAR(20) NOT NULL CHECK (escrow_type IN ('ESCROW','TRUST','RETENTION','COLLATERAL_CASH')),
    purpose                 TEXT NOT NULL,
    -- Parties
    depositor_customer_id   BIGINT REFERENCES customer(id),
    beneficiary_customer_id BIGINT REFERENCES customer(id),
    -- Conditions
    release_conditions      JSONB NOT NULL DEFAULT '[]',
    requires_multi_sign     BOOLEAN NOT NULL DEFAULT FALSE,
    required_signatories    INT DEFAULT 1,
    -- Amounts
    mandated_amount         NUMERIC(18,2) NOT NULL CHECK (mandated_amount > 0),
    released_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    remaining_amount        NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Dates
    effective_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date             DATE,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('DRAFT','ACTIVE','PARTIALLY_RELEASED','FULLY_RELEASED','EXPIRED','CANCELLED')),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_escrow_account ON escrow_mandate(account_id);
CREATE INDEX idx_escrow_customer ON escrow_mandate(customer_id);
CREATE INDEX idx_escrow_status ON escrow_mandate(status);

CREATE TABLE escrow_release (
    id                      BIGSERIAL PRIMARY KEY,
    mandate_id              BIGINT NOT NULL REFERENCES escrow_mandate(id) ON DELETE CASCADE,
    release_amount          NUMERIC(18,2) NOT NULL CHECK (release_amount > 0),
    release_to_account_id   BIGINT REFERENCES account(id),
    release_reason          TEXT NOT NULL,
    approved_by             VARCHAR(200),
    approval_date           TIMESTAMP WITH TIME ZONE,
    transaction_ref         VARCHAR(40),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','APPROVED','REJECTED','EXECUTED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_escrow_release_mandate ON escrow_release(mandate_id);

CREATE SEQUENCE escrow_mandate_seq START WITH 400001 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 17-18: LOAN ORIGINATION (Retail + Corporate)
-- ============================================================

CREATE TABLE loan_product (
    id                      BIGSERIAL PRIMARY KEY,
    code                    VARCHAR(20) NOT NULL UNIQUE,
    name                    VARCHAR(100) NOT NULL,
    description             TEXT,
    loan_type               VARCHAR(30) NOT NULL CHECK (loan_type IN (
                                'TERM_LOAN','REVOLVING','OVERDRAFT','MORTGAGE','VEHICLE',
                                'PERSONAL','EDUCATION','AGRICULTURE','TRADE_FINANCE',
                                'MURABAHA','IJARA','MUSHARAKA','MUDARABA','ISTISNA','SALAM')),
    target_segment          VARCHAR(20) NOT NULL CHECK (target_segment IN ('RETAIL','SME','CORPORATE','ALL')),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Rate
    min_interest_rate       NUMERIC(8,4) NOT NULL,
    max_interest_rate       NUMERIC(8,4) NOT NULL,
    default_interest_rate   NUMERIC(8,4) NOT NULL,
    rate_type               VARCHAR(20) NOT NULL DEFAULT 'FIXED' CHECK (rate_type IN ('FIXED','VARIABLE','HYBRID')),
    day_count_convention    VARCHAR(20) NOT NULL DEFAULT 'ACT_365',
    -- Amount
    min_loan_amount         NUMERIC(18,2) NOT NULL,
    max_loan_amount         NUMERIC(18,2) NOT NULL,
    -- Tenure
    min_tenure_months       INT NOT NULL,
    max_tenure_months       INT NOT NULL,
    -- Repayment
    allowed_schedules       VARCHAR(200) DEFAULT 'EQUAL_INSTALLMENT,EQUAL_PRINCIPAL,BULLET,BALLOON',
    repayment_frequency     VARCHAR(20) DEFAULT 'MONTHLY',
    -- Collateral
    requires_collateral     BOOLEAN NOT NULL DEFAULT FALSE,
    min_collateral_coverage NUMERIC(5,2) DEFAULT 100,
    -- Fees
    processing_fee_pct      NUMERIC(5,2) DEFAULT 0,
    processing_fee_flat     NUMERIC(18,2) DEFAULT 0,
    insurance_required      BOOLEAN NOT NULL DEFAULT FALSE,
    -- Islamic finance
    is_islamic              BOOLEAN NOT NULL DEFAULT FALSE,
    profit_sharing_ratio    VARCHAR(20),
    -- Provisioning (IFRS 9)
    stage1_provision_pct    NUMERIC(5,2) DEFAULT 1.00,
    stage2_provision_pct    NUMERIC(5,2) DEFAULT 5.00,
    stage3_provision_pct    NUMERIC(5,2) DEFAULT 20.00,
    -- GL
    gl_loan_asset_code      VARCHAR(20),
    gl_interest_income_code VARCHAR(20),
    gl_provision_code       VARCHAR(20),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE loan_application (
    id                      BIGSERIAL PRIMARY KEY,
    application_number      VARCHAR(30) NOT NULL UNIQUE,
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    loan_product_id         BIGINT NOT NULL REFERENCES loan_product(id),
    -- Request
    requested_amount        NUMERIC(18,2) NOT NULL CHECK (requested_amount > 0),
    approved_amount         NUMERIC(18,2),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    requested_tenure_months INT NOT NULL,
    approved_tenure_months  INT,
    purpose                 TEXT,
    -- Rate
    proposed_rate           NUMERIC(8,4),
    approved_rate           NUMERIC(8,4),
    rate_type               VARCHAR(20) DEFAULT 'FIXED',
    -- Schedule
    repayment_schedule_type VARCHAR(30) DEFAULT 'EQUAL_INSTALLMENT'
                                CHECK (repayment_schedule_type IN (
                                    'EQUAL_INSTALLMENT','EQUAL_PRINCIPAL','BULLET',
                                    'BALLOON','STEP_UP','STEP_DOWN','CUSTOM')),
    repayment_frequency     VARCHAR(20) DEFAULT 'MONTHLY',
    -- Islamic
    is_islamic              BOOLEAN NOT NULL DEFAULT FALSE,
    islamic_structure       VARCHAR(30),
    asset_description       TEXT,
    asset_cost              NUMERIC(18,2),
    profit_rate             NUMERIC(8,4),
    -- Scoring
    credit_score            INT,
    risk_grade              VARCHAR(10),
    debt_to_income_ratio    NUMERIC(5,2),
    decision_engine_result  JSONB,
    -- Workflow
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','CREDIT_CHECK',
                                    'APPROVED','CONDITIONALLY_APPROVED','DECLINED','WITHDRAWN',
                                    'OFFER_ISSUED','OFFER_ACCEPTED','DISBURSED','CANCELLED')),
    submitted_at            TIMESTAMP WITH TIME ZONE,
    reviewed_by             VARCHAR(100),
    reviewed_at             TIMESTAMP WITH TIME ZONE,
    approved_by             VARCHAR(100),
    approved_at             TIMESTAMP WITH TIME ZONE,
    decline_reason          TEXT,
    conditions              JSONB DEFAULT '[]',
    -- Disbursement
    disbursement_account_id BIGINT REFERENCES account(id),
    repayment_account_id    BIGINT REFERENCES account(id),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_loan_app_customer ON loan_application(customer_id);
CREATE INDEX idx_loan_app_status ON loan_application(status);
CREATE INDEX idx_loan_app_product ON loan_application(loan_product_id);
CREATE INDEX idx_loan_app_number ON loan_application(application_number);

CREATE TABLE loan_account (
    id                      BIGSERIAL PRIMARY KEY,
    loan_number             VARCHAR(30) NOT NULL UNIQUE,
    application_id          BIGINT REFERENCES loan_application(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    loan_product_id         BIGINT NOT NULL REFERENCES loan_product(id),
    disbursement_account_id BIGINT REFERENCES account(id),
    repayment_account_id    BIGINT REFERENCES account(id),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Principal
    sanctioned_amount       NUMERIC(18,2) NOT NULL,
    disbursed_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
    outstanding_principal   NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Interest
    interest_rate           NUMERIC(8,4) NOT NULL,
    rate_type               VARCHAR(20) NOT NULL DEFAULT 'FIXED',
    day_count_convention    VARCHAR(20) NOT NULL DEFAULT 'ACT_365',
    accrued_interest        NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_interest_charged  NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_interest_paid     NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Repayment
    repayment_schedule_type VARCHAR(30) NOT NULL DEFAULT 'EQUAL_INSTALLMENT',
    repayment_frequency     VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    tenure_months           INT NOT NULL,
    total_installments      INT NOT NULL,
    paid_installments       INT NOT NULL DEFAULT 0,
    next_due_date           DATE,
    emi_amount              NUMERIC(18,2),
    -- Islamic
    is_islamic              BOOLEAN NOT NULL DEFAULT FALSE,
    islamic_structure       VARCHAR(30),
    total_profit            NUMERIC(18,2) DEFAULT 0,
    profit_paid             NUMERIC(18,2) DEFAULT 0,
    -- Delinquency
    days_past_due           INT NOT NULL DEFAULT 0,
    delinquency_bucket      VARCHAR(10) DEFAULT 'CURRENT'
                                CHECK (delinquency_bucket IN ('CURRENT','1-30','31-60','61-90','91-180','180+')),
    ifrs9_stage             INT NOT NULL DEFAULT 1 CHECK (ifrs9_stage IN (1, 2, 3)),
    provision_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Penalties
    total_penalties         NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_penalties_paid    NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Dates
    disbursement_date       DATE,
    first_repayment_date    DATE,
    maturity_date           DATE,
    last_payment_date       DATE,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING_DISBURSEMENT'
                                CHECK (status IN ('PENDING_DISBURSEMENT','ACTIVE','DELINQUENT',
                                    'DEFAULT','RESTRUCTURED','WRITTEN_OFF','CLOSED','SETTLED')),
    closed_date             DATE,
    -- Metadata
    branch_code             VARCHAR(20),
    relationship_manager    VARCHAR(100),
    metadata                JSONB DEFAULT '{}',
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_loan_acct_customer ON loan_account(customer_id);
CREATE INDEX idx_loan_acct_status ON loan_account(status);
CREATE INDEX idx_loan_acct_number ON loan_account(loan_number);
CREATE INDEX idx_loan_acct_delinquency ON loan_account(days_past_due) WHERE status IN ('ACTIVE','DELINQUENT');
CREATE INDEX idx_loan_acct_ifrs ON loan_account(ifrs9_stage);

CREATE TABLE loan_repayment_schedule (
    id                      BIGSERIAL PRIMARY KEY,
    loan_account_id         BIGINT NOT NULL REFERENCES loan_account(id) ON DELETE CASCADE,
    installment_number      INT NOT NULL,
    due_date                DATE NOT NULL,
    principal_due           NUMERIC(18,2) NOT NULL,
    interest_due            NUMERIC(18,2) NOT NULL,
    total_due               NUMERIC(18,2) NOT NULL,
    principal_paid          NUMERIC(18,2) NOT NULL DEFAULT 0,
    interest_paid           NUMERIC(18,2) NOT NULL DEFAULT 0,
    penalty_due             NUMERIC(18,2) NOT NULL DEFAULT 0,
    penalty_paid            NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_paid              NUMERIC(18,2) NOT NULL DEFAULT 0,
    outstanding             NUMERIC(18,2) NOT NULL,
    paid_date               DATE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED','RESTRUCTURED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_loan_sched_loan ON loan_repayment_schedule(loan_account_id);
CREATE INDEX idx_loan_sched_due ON loan_repayment_schedule(due_date, status);

-- ============================================================
-- COLLATERAL MANAGEMENT
-- ============================================================

CREATE TABLE collateral (
    id                      BIGSERIAL PRIMARY KEY,
    collateral_number       VARCHAR(30) NOT NULL UNIQUE,
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    collateral_type         VARCHAR(30) NOT NULL CHECK (collateral_type IN (
                                'PROPERTY','VEHICLE','EQUIPMENT','INVENTORY','SECURITIES',
                                'CASH_DEPOSIT','GUARANTEE','INSURANCE','RECEIVABLES','OTHER')),
    description             TEXT NOT NULL,
    -- Valuation
    market_value            NUMERIC(18,2) NOT NULL,
    forced_sale_value       NUMERIC(18,2),
    last_valuation_date     DATE,
    next_valuation_date     DATE,
    valuation_source        VARCHAR(100),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Lien
    lien_status             VARCHAR(20) NOT NULL DEFAULT 'FREE'
                                CHECK (lien_status IN ('FREE','LIEN_MARKED','PARTIALLY_RELEASED','RELEASED')),
    lien_amount             NUMERIC(18,2) DEFAULT 0,
    lien_reference          VARCHAR(50),
    -- Insurance
    is_insured              BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_policy_number VARCHAR(50),
    insurance_expiry_date   DATE,
    insurance_value         NUMERIC(18,2),
    -- Location/details
    location                TEXT,
    registration_number     VARCHAR(50),
    registration_authority  VARCHAR(100),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING_VERIFICATION','ACTIVE','EXPIRED','RELEASED','SEIZED')),
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_collateral_customer ON collateral(customer_id);
CREATE INDEX idx_collateral_type ON collateral(collateral_type);
CREATE INDEX idx_collateral_lien ON collateral(lien_status);

CREATE TABLE loan_collateral_link (
    id                      BIGSERIAL PRIMARY KEY,
    loan_account_id         BIGINT NOT NULL REFERENCES loan_account(id) ON DELETE CASCADE,
    collateral_id           BIGINT NOT NULL REFERENCES collateral(id),
    allocated_value         NUMERIC(18,2) NOT NULL,
    coverage_percentage     NUMERIC(5,2),
    is_primary              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(loan_account_id, collateral_id)
);

CREATE INDEX idx_loan_coll_loan ON loan_collateral_link(loan_account_id);
CREATE INDEX idx_loan_coll_coll ON loan_collateral_link(collateral_id);

-- ============================================================
-- CAPABILITY 20: CREDIT DECISIONING
-- ============================================================

CREATE TABLE credit_scoring_model (
    id                      BIGSERIAL PRIMARY KEY,
    model_code              VARCHAR(30) NOT NULL UNIQUE,
    model_name              VARCHAR(100) NOT NULL,
    model_type              VARCHAR(20) NOT NULL CHECK (model_type IN ('SCORECARD','ML_MODEL','RULE_ENGINE','HYBRID')),
    target_segment          VARCHAR(20) NOT NULL,
    min_score               INT NOT NULL DEFAULT 0,
    max_score               INT NOT NULL DEFAULT 1000,
    cutoff_score            INT NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    model_config            JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE credit_decision_log (
    id                      BIGSERIAL PRIMARY KEY,
    application_id          BIGINT NOT NULL REFERENCES loan_application(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    model_code              VARCHAR(30) NOT NULL,
    -- Input
    input_data              JSONB NOT NULL,
    -- Result
    score                   INT,
    risk_grade              VARCHAR(10),
    decision                VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVE','DECLINE','REFER','CONDITIONAL')),
    decision_reasons        JSONB DEFAULT '[]',
    recommended_amount      NUMERIC(18,2),
    recommended_rate        NUMERIC(8,4),
    recommended_tenure      INT,
    -- Overrides
    was_overridden          BOOLEAN NOT NULL DEFAULT FALSE,
    override_decision       VARCHAR(20),
    override_by             VARCHAR(100),
    override_reason         TEXT,
    -- Audit
    executed_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    execution_time_ms       INT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_log_app ON credit_decision_log(application_id);
CREATE INDEX idx_credit_log_customer ON credit_decision_log(customer_id);

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE loan_application_seq START WITH 500001 INCREMENT BY 1;
CREATE SEQUENCE loan_account_seq START WITH 600001 INCREMENT BY 1;
CREATE SEQUENCE collateral_seq START WITH 700001 INCREMENT BY 1;
