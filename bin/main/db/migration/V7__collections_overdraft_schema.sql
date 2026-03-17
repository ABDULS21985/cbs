-- V7__collections_overdraft_schema.sql
-- Capabilities 21-25: Collateral valuation, Dynamic scheduling, Restructuring, Collections, Overdraft/LOC

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 21: COLLATERAL VALUATION HISTORY
-- ============================================================

CREATE TABLE collateral_valuation (
    id                      BIGSERIAL PRIMARY KEY,
    collateral_id           BIGINT NOT NULL REFERENCES collateral(id) ON DELETE CASCADE,
    valuation_date          DATE NOT NULL,
    market_value            NUMERIC(18,2) NOT NULL,
    forced_sale_value       NUMERIC(18,2),
    valuation_method        VARCHAR(30) NOT NULL CHECK (valuation_method IN (
                                'MARKET_COMPARISON','INCOME_APPROACH','COST_APPROACH',
                                'DESKTOP','PHYSICAL_INSPECTION','AUTOMATED')),
    valuer_name             VARCHAR(100),
    valuer_organisation     VARCHAR(200),
    valuer_license_number   VARCHAR(50),
    report_reference        VARCHAR(100),
    report_url              VARCHAR(500),
    notes                   TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
                                CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','DISPUTED','EXPIRED')),
    next_valuation_date     DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_coll_val_collateral ON collateral_valuation(collateral_id);
CREATE INDEX idx_coll_val_date ON collateral_valuation(valuation_date DESC);

-- ============================================================
-- CAPABILITY 23: LOAN RESTRUCTURING LOG
-- ============================================================

CREATE TABLE loan_restructure_log (
    id                      BIGSERIAL PRIMARY KEY,
    loan_account_id         BIGINT NOT NULL REFERENCES loan_account(id),
    restructure_type        VARCHAR(30) NOT NULL CHECK (restructure_type IN (
                                'RESCHEDULE','TENURE_EXTENSION','RATE_CHANGE',
                                'MORATORIUM','PARTIAL_WRITE_OFF','CONSOLIDATION','NPL_MIGRATION')),
    -- Before
    old_interest_rate       NUMERIC(8,4),
    old_tenure_months       INT,
    old_emi_amount          NUMERIC(18,2),
    old_outstanding         NUMERIC(18,2),
    old_next_due_date       DATE,
    old_schedule_type       VARCHAR(30),
    -- After
    new_interest_rate       NUMERIC(8,4),
    new_tenure_months       INT,
    new_emi_amount          NUMERIC(18,2),
    new_outstanding         NUMERIC(18,2),
    new_next_due_date       DATE,
    new_schedule_type       VARCHAR(30),
    -- Moratorium
    moratorium_months       INT,
    moratorium_end_date     DATE,
    interest_during_moratorium VARCHAR(20) CHECK (interest_during_moratorium IN ('CAPITALIZE','WAIVE','DEFER')),
    -- Approval
    reason                  TEXT NOT NULL,
    approved_by             VARCHAR(100),
    approved_at             TIMESTAMP WITH TIME ZONE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','APPROVED','EXECUTED','REJECTED')),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_restructure_loan ON loan_restructure_log(loan_account_id);

-- ============================================================
-- CAPABILITY 24: COLLECTIONS & RECOVERY
-- ============================================================

CREATE TABLE collection_case (
    id                      BIGSERIAL PRIMARY KEY,
    case_number             VARCHAR(30) NOT NULL UNIQUE,
    loan_account_id         BIGINT NOT NULL REFERENCES loan_account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    -- Assignment
    assigned_to             VARCHAR(100),
    assigned_team           VARCHAR(50),
    priority                VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                                CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    -- Delinquency snapshot
    days_past_due           INT NOT NULL,
    overdue_amount          NUMERIC(18,2) NOT NULL,
    total_outstanding       NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    delinquency_bucket      VARCHAR(10) NOT NULL,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                                CHECK (status IN ('OPEN','IN_PROGRESS','PROMISE_TO_PAY','ESCALATED',
                                    'LEGAL','WRITE_OFF_PROPOSED','WRITTEN_OFF','RECOVERED','CLOSED')),
    escalation_level        INT NOT NULL DEFAULT 0,
    -- Resolution
    resolution_type         VARCHAR(30),
    resolution_amount       NUMERIC(18,2),
    resolved_date           DATE,
    -- Metadata
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_collection_loan ON collection_case(loan_account_id);
CREATE INDEX idx_collection_customer ON collection_case(customer_id);
CREATE INDEX idx_collection_status ON collection_case(status);
CREATE INDEX idx_collection_priority ON collection_case(priority);
CREATE INDEX idx_collection_assigned ON collection_case(assigned_to);

CREATE TABLE collection_action (
    id                      BIGSERIAL PRIMARY KEY,
    case_id                 BIGINT NOT NULL REFERENCES collection_case(id) ON DELETE CASCADE,
    action_type             VARCHAR(30) NOT NULL CHECK (action_type IN (
                                'PHONE_CALL','SMS','EMAIL','LETTER','FIELD_VISIT',
                                'PROMISE_TO_PAY','PAYMENT_RECEIVED','ESCALATION',
                                'LEGAL_NOTICE','LEGAL_FILING','WRITE_OFF','NOTE')),
    action_date             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description             TEXT NOT NULL,
    outcome                 VARCHAR(50),
    -- Promise to pay
    promised_amount         NUMERIC(18,2),
    promised_date           DATE,
    promise_kept            BOOLEAN,
    -- Contact
    contact_number          VARCHAR(20),
    contact_person          VARCHAR(100),
    -- Field visit
    visit_latitude          NUMERIC(10,7),
    visit_longitude         NUMERIC(10,7),
    visit_photo_url         VARCHAR(500),
    -- Next action
    next_action_date        DATE,
    next_action_type        VARCHAR(30),
    -- Audit
    performed_by            VARCHAR(100) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_coll_action_case ON collection_action(case_id);
CREATE INDEX idx_coll_action_date ON collection_action(action_date);
CREATE INDEX idx_coll_action_next ON collection_action(next_action_date) WHERE next_action_date IS NOT NULL;

CREATE TABLE dunning_template (
    id                      BIGSERIAL PRIMARY KEY,
    template_code           VARCHAR(30) NOT NULL UNIQUE,
    template_name           VARCHAR(100) NOT NULL,
    channel                 VARCHAR(20) NOT NULL CHECK (channel IN ('SMS','EMAIL','LETTER','PUSH')),
    days_past_due_trigger   INT NOT NULL,
    subject                 VARCHAR(200),
    body_template           TEXT NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE SEQUENCE collection_case_seq START WITH 800001 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 25: OVERDRAFT / LINE OF CREDIT
-- ============================================================

CREATE TABLE credit_facility (
    id                      BIGSERIAL PRIMARY KEY,
    facility_number         VARCHAR(30) NOT NULL UNIQUE,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    facility_type           VARCHAR(20) NOT NULL CHECK (facility_type IN ('OVERDRAFT','LINE_OF_CREDIT','REVOLVING')),
    -- Limits
    sanctioned_limit        NUMERIC(18,2) NOT NULL,
    available_limit         NUMERIC(18,2) NOT NULL,
    utilized_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Rate
    interest_rate           NUMERIC(8,4) NOT NULL,
    penalty_rate            NUMERIC(8,4) DEFAULT 0,
    day_count_convention    VARCHAR(20) NOT NULL DEFAULT 'ACT_365',
    -- Interest
    accrued_interest        NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_interest_charged  NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_interest_paid     NUMERIC(18,2) NOT NULL DEFAULT 0,
    interest_posting_day    INT DEFAULT 1,
    -- Dates
    effective_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date             DATE NOT NULL,
    last_review_date        DATE,
    next_review_date        DATE,
    -- Renewal
    auto_renewal            BOOLEAN NOT NULL DEFAULT FALSE,
    renewal_count           INT NOT NULL DEFAULT 0,
    max_renewals            INT,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING','ACTIVE','FROZEN','EXPIRED','CANCELLED','CLOSED')),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_facility_account ON credit_facility(account_id);
CREATE INDEX idx_facility_customer ON credit_facility(customer_id);
CREATE INDEX idx_facility_status ON credit_facility(status);
CREATE INDEX idx_facility_expiry ON credit_facility(expiry_date) WHERE status = 'ACTIVE';

CREATE TABLE facility_utilization_log (
    id                      BIGSERIAL PRIMARY KEY,
    facility_id             BIGINT NOT NULL REFERENCES credit_facility(id) ON DELETE CASCADE,
    transaction_type        VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DRAWDOWN','REPAYMENT','INTEREST_CHARGE','FEE')),
    amount                  NUMERIC(18,2) NOT NULL,
    running_utilized        NUMERIC(18,2) NOT NULL,
    running_available       NUMERIC(18,2) NOT NULL,
    narration               VARCHAR(300),
    transaction_ref         VARCHAR(40),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100)
);

CREATE INDEX idx_util_log_facility ON facility_utilization_log(facility_id);

CREATE SEQUENCE credit_facility_seq START WITH 900001 INCREMENT BY 1;
