-- V16__sanctions_fraud_ecl_oprisk_kyt.sql
-- Capabilities 60-61, 63-64, 66: Sanctions, Fraud, ECL, OpRisk, KYT

SET search_path TO cbs;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- CAPABILITY 60: SANCTIONS & PEP SCREENING
-- ============================================================

CREATE TABLE watchlist (
    id                      BIGSERIAL PRIMARY KEY,
    list_code               VARCHAR(20) NOT NULL,
    list_name               VARCHAR(100) NOT NULL,
    list_source             VARCHAR(30) NOT NULL CHECK (list_source IN (
                                'OFAC_SDN','OFAC_CONS','UN_CONSOLIDATED','EU_CONSOLIDATED',
                                'UK_HMT','LOCAL_REGULATOR','INTERNAL','PEP','ADVERSE_MEDIA')),
    -- Entry
    entry_id                VARCHAR(50) NOT NULL,
    entity_type             VARCHAR(20) NOT NULL CHECK (entity_type IN ('INDIVIDUAL','ENTITY','VESSEL','AIRCRAFT')),
    primary_name            VARCHAR(300) NOT NULL,
    aliases                 JSONB DEFAULT '[]',
    date_of_birth           DATE,
    nationality             VARCHAR(3),
    country_codes           JSONB DEFAULT '[]',
    id_documents            JSONB DEFAULT '[]',
    -- Programme / Reason
    programme               VARCHAR(200),
    remarks                 TEXT,
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    listed_date             DATE,
    delisted_date           DATE,
    last_updated            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(list_code, entry_id)
);

CREATE INDEX idx_watchlist_name ON watchlist USING gin (primary_name gin_trgm_ops);
CREATE INDEX idx_watchlist_source ON watchlist(list_source);
CREATE INDEX idx_watchlist_active ON watchlist(is_active);

CREATE TABLE screening_request (
    id                      BIGSERIAL PRIMARY KEY,
    screening_ref           VARCHAR(30) NOT NULL UNIQUE,
    screening_type          VARCHAR(20) NOT NULL CHECK (screening_type IN (
                                'CUSTOMER_ONBOARDING','TRANSACTION','BENEFICIARY','PERIODIC','AD_HOC')),
    -- Subject
    subject_name            VARCHAR(300) NOT NULL,
    subject_type            VARCHAR(20) NOT NULL,
    subject_dob             DATE,
    subject_nationality     VARCHAR(3),
    subject_id_number       VARCHAR(50),
    customer_id             BIGINT REFERENCES customer(id),
    transaction_ref         VARCHAR(50),
    -- Configuration
    lists_screened          JSONB NOT NULL DEFAULT '["OFAC_SDN","UN_CONSOLIDATED","EU_CONSOLIDATED","PEP"]',
    match_threshold         NUMERIC(5,2) NOT NULL DEFAULT 85.00,
    -- Results
    total_matches           INT NOT NULL DEFAULT 0,
    true_matches            INT NOT NULL DEFAULT 0,
    false_positives         INT NOT NULL DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','SCREENING','CLEAR','POTENTIAL_MATCH',
                                    'CONFIRMED_MATCH','ESCALATED','WHITELISTED')),
    reviewed_by             VARCHAR(100),
    reviewed_at             TIMESTAMP WITH TIME ZONE,
    review_notes            TEXT,
    -- Timing
    screening_time_ms       INT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_screening_customer ON screening_request(customer_id);
CREATE INDEX idx_screening_status ON screening_request(status);

CREATE TABLE screening_match (
    id                      BIGSERIAL PRIMARY KEY,
    screening_id            BIGINT NOT NULL REFERENCES screening_request(id) ON DELETE CASCADE,
    watchlist_id            BIGINT NOT NULL REFERENCES watchlist(id),
    match_score             NUMERIC(5,2) NOT NULL,
    matched_fields          JSONB NOT NULL DEFAULT '[]',
    match_type              VARCHAR(20) NOT NULL CHECK (match_type IN ('EXACT','FUZZY','ALIAS','PARTIAL')),
    disposition             VARCHAR(20) DEFAULT 'PENDING'
                                CHECK (disposition IN ('PENDING','TRUE_MATCH','FALSE_POSITIVE','WHITELISTED')),
    disposed_by             VARCHAR(100),
    disposed_at             TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screening_match ON screening_match(screening_id);

-- ============================================================
-- CAPABILITY 61: FRAUD DETECTION & PREVENTION
-- ============================================================

CREATE TABLE fraud_rule (
    id                      BIGSERIAL PRIMARY KEY,
    rule_code               VARCHAR(30) NOT NULL UNIQUE,
    rule_name               VARCHAR(200) NOT NULL,
    rule_category           VARCHAR(30) NOT NULL CHECK (rule_category IN (
                                'VELOCITY','AMOUNT_ANOMALY','GEO_ANOMALY','DEVICE_ANOMALY',
                                'BEHAVIOURAL','ACCOUNT_TAKEOVER','CARD_FRAUD','PAYMENT_FRAUD',
                                'IDENTITY_FRAUD','MERCHANT_FRAUD','CUSTOM')),
    description             TEXT,
    rule_config             JSONB NOT NULL DEFAULT '{}',
    severity                VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    score_weight            INT NOT NULL DEFAULT 10,
    applicable_channels     VARCHAR(200) DEFAULT 'ALL',
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE fraud_alert (
    id                      BIGSERIAL PRIMARY KEY,
    alert_ref               VARCHAR(30) NOT NULL UNIQUE,
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    account_id              BIGINT REFERENCES account(id),
    transaction_ref         VARCHAR(50),
    -- Score
    risk_score              INT NOT NULL,
    max_score               INT NOT NULL DEFAULT 100,
    triggered_rules         JSONB NOT NULL DEFAULT '[]',
    -- Details
    channel                 VARCHAR(20),
    device_id               VARCHAR(100),
    ip_address              VARCHAR(45),
    geo_location            VARCHAR(100),
    description             TEXT NOT NULL,
    -- Action
    action_taken            VARCHAR(20) CHECK (action_taken IN (
                                'NONE','BLOCK_TRANSACTION','BLOCK_CARD','BLOCK_ACCOUNT',
                                'STEP_UP_AUTH','ALERT_CUSTOMER','REVIEW')),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'NEW'
                                CHECK (status IN ('NEW','INVESTIGATING','CONFIRMED_FRAUD',
                                    'FALSE_POSITIVE','CLOSED')),
    assigned_to             VARCHAR(100),
    resolution_notes        TEXT,
    resolved_by             VARCHAR(100),
    resolved_at             TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_fraud_alert_customer ON fraud_alert(customer_id);
CREATE INDEX idx_fraud_alert_status ON fraud_alert(status);
CREATE INDEX idx_fraud_alert_score ON fraud_alert(risk_score DESC);

CREATE SEQUENCE fraud_alert_seq START WITH 1 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 63: IFRS 9 EXPECTED CREDIT LOSS (ECL)
-- ============================================================

CREATE TABLE ecl_model_parameter (
    id                      BIGSERIAL PRIMARY KEY,
    parameter_name          VARCHAR(50) NOT NULL,
    segment                 VARCHAR(30) NOT NULL,
    stage                   INT NOT NULL CHECK (stage IN (1, 2, 3)),
    -- PD
    pd_12_month             NUMERIC(8,6),
    pd_lifetime             NUMERIC(8,6),
    -- LGD
    lgd_rate                NUMERIC(8,6),
    -- EAD
    ead_ccf                 NUMERIC(8,6) DEFAULT 1.0,
    -- Macro overlay
    macro_scenario          VARCHAR(20) CHECK (macro_scenario IN ('BASE','OPTIMISTIC','PESSIMISTIC')),
    scenario_weight         NUMERIC(5,4) DEFAULT 0.50,
    macro_adjustment        NUMERIC(8,6) DEFAULT 0,
    -- Effective
    effective_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(parameter_name, segment, stage, macro_scenario, effective_date)
);

CREATE TABLE ecl_calculation (
    id                      BIGSERIAL PRIMARY KEY,
    calculation_date        DATE NOT NULL,
    loan_account_id         BIGINT NOT NULL,
    customer_id             BIGINT NOT NULL,
    -- Staging
    current_stage           INT NOT NULL CHECK (current_stage IN (1, 2, 3)),
    previous_stage          INT,
    stage_reason            VARCHAR(200),
    -- Exposure
    ead                     NUMERIC(18,2) NOT NULL,
    -- PD
    pd_used                 NUMERIC(8,6) NOT NULL,
    -- LGD
    lgd_used                NUMERIC(8,6) NOT NULL,
    -- ECL
    ecl_base                NUMERIC(18,2) NOT NULL,
    ecl_optimistic          NUMERIC(18,2),
    ecl_pessimistic         NUMERIC(18,2),
    ecl_weighted            NUMERIC(18,2) NOT NULL,
    -- Movement
    previous_ecl            NUMERIC(18,2) DEFAULT 0,
    ecl_movement            NUMERIC(18,2) DEFAULT 0,
    -- Metadata
    segment                 VARCHAR(30),
    product_code            VARCHAR(20),
    days_past_due           INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_ecl_calc_date ON ecl_calculation(calculation_date);
CREATE INDEX idx_ecl_calc_loan ON ecl_calculation(loan_account_id);
CREATE INDEX idx_ecl_calc_stage ON ecl_calculation(current_stage);

-- ============================================================
-- CAPABILITY 64: OPERATIONAL RISK MANAGEMENT
-- ============================================================

CREATE TABLE oprisk_loss_event (
    id                      BIGSERIAL PRIMARY KEY,
    event_ref               VARCHAR(30) NOT NULL UNIQUE,
    event_category          VARCHAR(30) NOT NULL CHECK (event_category IN (
                                'INTERNAL_FRAUD','EXTERNAL_FRAUD','EMPLOYMENT_PRACTICES',
                                'CLIENTS_PRODUCTS','PHYSICAL_ASSETS','BUSINESS_DISRUPTION',
                                'EXECUTION_DELIVERY')),
    event_type              VARCHAR(50) NOT NULL,
    description             TEXT NOT NULL,
    -- Financial
    gross_loss              NUMERIC(18,2) NOT NULL,
    recovery_amount         NUMERIC(18,2) DEFAULT 0,
    net_loss                NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL DEFAULT 'USD',
    -- Context
    business_line           VARCHAR(50),
    department              VARCHAR(100),
    branch_code             VARCHAR(20),
    -- Dates
    event_date              DATE NOT NULL,
    discovery_date          DATE NOT NULL,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'REPORTED'
                                CHECK (status IN ('REPORTED','INVESTIGATING','ASSESSED','MITIGATED','CLOSED')),
    root_cause              TEXT,
    remediation_plan        TEXT,
    assigned_to             VARCHAR(100),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_oprisk_category ON oprisk_loss_event(event_category);
CREATE INDEX idx_oprisk_status ON oprisk_loss_event(status);

CREATE TABLE oprisk_kri (
    id                      BIGSERIAL PRIMARY KEY,
    kri_code                VARCHAR(20) NOT NULL UNIQUE,
    kri_name                VARCHAR(200) NOT NULL,
    kri_category            VARCHAR(30) NOT NULL,
    measurement_unit        VARCHAR(30) NOT NULL,
    threshold_amber         NUMERIC(18,4),
    threshold_red           NUMERIC(18,4),
    frequency               VARCHAR(20) NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY')),
    owner                   VARCHAR(100),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE oprisk_kri_reading (
    id                      BIGSERIAL PRIMARY KEY,
    kri_id                  BIGINT NOT NULL REFERENCES oprisk_kri(id),
    reading_date            DATE NOT NULL,
    value                   NUMERIC(18,4) NOT NULL,
    rag_status              VARCHAR(10) NOT NULL CHECK (rag_status IN ('GREEN','AMBER','RED')),
    commentary              TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(kri_id, reading_date)
);

CREATE INDEX idx_kri_reading_date ON oprisk_kri_reading(reading_date);
