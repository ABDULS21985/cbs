SET search_path TO cbs;

-- =====================================================
-- V46: Partial Gap Closure Wave 2 (Batch 37)
-- 9 BIAN SDs: Case RCA, Corporate Lease, Factoring,
-- Securities Fails, Gap Analysis, Contribution Analysis,
-- Branch Portfolio, Provider Admin, TD Framework
-- =====================================================

-- case_root_cause_analysis
CREATE TABLE IF NOT EXISTS case_root_cause_analysis (
    id                          BIGSERIAL PRIMARY KEY,
    rca_code                    VARCHAR(30) NOT NULL UNIQUE,
    case_id                     BIGINT NOT NULL,
    analysis_method             VARCHAR(15) NOT NULL
        CHECK (analysis_method IN ('FIVE_WHYS','FISHBONE','PARETO','FAULT_TREE','TIMELINE','FAILURE_MODE')),
    analysis_date               DATE,
    analyst_name                VARCHAR(200),
    problem_statement           TEXT,
    root_cause_category         VARCHAR(15)
        CHECK (root_cause_category IN ('PROCESS','SYSTEM','PEOPLE','POLICY','THIRD_PARTY','DATA','INFRASTRUCTURE')),
    root_cause_sub_category     VARCHAR(60),
    root_cause_description      TEXT,
    contributing_factors        JSONB,
    evidence_references         JSONB,
    customers_affected          INT,
    financial_impact            NUMERIC(20,4),
    reputational_impact         VARCHAR(10),
    regulatory_implication      BOOLEAN DEFAULT FALSE,
    corrective_actions          JSONB,
    preventive_actions          JSONB,
    lessons_learned             TEXT,
    linked_knowledge_article_id BIGINT,
    status                      VARCHAR(15) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN ('IN_PROGRESS','COMPLETED','VALIDATED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- case_pattern_insight
CREATE TABLE IF NOT EXISTS case_pattern_insight (
    id                          BIGSERIAL PRIMARY KEY,
    pattern_type                VARCHAR(25) NOT NULL
        CHECK (pattern_type IN ('RECURRING_ROOT_CAUSE','PRODUCT_CLUSTER','CHANNEL_CLUSTER','TIME_CLUSTER','CUSTOMER_SEGMENT_CLUSTER','GEOGRAPHIC_CLUSTER')),
    pattern_description         TEXT,
    case_count                  INT,
    date_range_start            DATE,
    date_range_end              DATE,
    affected_products           JSONB,
    affected_channels           JSONB,
    root_cause_category         VARCHAR(15),
    trend_direction             VARCHAR(10)
        CHECK (trend_direction IN ('INCREASING','STABLE','DECREASING')),
    recommended_action          TEXT,
    priority                    VARCHAR(10),
    assigned_to                 VARCHAR(80),
    status                      VARCHAR(15) NOT NULL DEFAULT 'IDENTIFIED'
        CHECK (status IN ('IDENTIFIED','UNDER_REVIEW','ACTIONED','RESOLVED','MONITORING')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- corporate_lease_portfolio
CREATE TABLE IF NOT EXISTS corporate_lease_portfolio (
    id                          BIGSERIAL PRIMARY KEY,
    corporate_customer_id       BIGINT NOT NULL,
    total_leases                INT DEFAULT 0,
    active_leases               INT DEFAULT 0,
    total_rou_asset_value       NUMERIC(20,4),
    total_lease_liability       NUMERIC(20,4),
    weighted_avg_term           NUMERIC(8,2),
    weighted_avg_rate           NUMERIC(8,4),
    annual_lease_expense        NUMERIC(20,4),
    expiring_next_90_days       INT DEFAULT 0,
    expiring_next_180_days      INT DEFAULT 0,
    as_of_date                  DATE NOT NULL,
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- factoring_facility
CREATE TABLE IF NOT EXISTS factoring_facility (
    id                          BIGSERIAL PRIMARY KEY,
    facility_code               VARCHAR(30) NOT NULL UNIQUE,
    facility_type               VARCHAR(25) NOT NULL
        CHECK (facility_type IN ('RECOURSE_FACTORING','NON_RECOURSE_FACTORING','REVERSE_FACTORING','INVOICE_DISCOUNTING','FORFAITING','RECEIVABLES_PURCHASE')),
    seller_customer_id          BIGINT,
    seller_name                 VARCHAR(200),
    buyer_customer_ids          JSONB,
    currency                    VARCHAR(3),
    facility_limit              NUMERIC(20,4),
    utilized_amount             NUMERIC(20,4) DEFAULT 0,
    available_amount            NUMERIC(20,4),
    advance_rate_pct            NUMERIC(5,2),
    discount_rate_pct           NUMERIC(8,4),
    service_fee_rate_pct        NUMERIC(6,4),
    collection_period_days      INT,
    dilution_reserve_pct        NUMERIC(5,2),
    max_invoice_age             INT,
    max_concentration_pct       NUMERIC(5,2),
    credit_insurance_provider   VARCHAR(200),
    credit_insurance_policy_ref VARCHAR(80),
    notification_required       BOOLEAN DEFAULT TRUE,
    effective_from              DATE,
    effective_to                DATE,
    status                      VARCHAR(15) NOT NULL DEFAULT 'APPROVED'
        CHECK (status IN ('APPROVED','ACTIVE','SUSPENDED','MATURED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- factoring_transaction
CREATE TABLE IF NOT EXISTS factoring_transaction (
    id                          BIGSERIAL PRIMARY KEY,
    facility_id                 BIGINT NOT NULL REFERENCES factoring_facility(id),
    invoice_ref                 VARCHAR(40),
    invoice_date                DATE,
    invoice_amount              NUMERIC(20,4),
    buyer_name                  VARCHAR(200),
    buyer_id                    BIGINT,
    advance_amount              NUMERIC(20,4),
    discount_amount             NUMERIC(15,4),
    net_proceeds_to_seller      NUMERIC(20,4),
    collection_due_date         DATE,
    actual_collection_date      DATE,
    collected_amount            NUMERIC(20,4),
    dilution_amount             NUMERIC(15,4) DEFAULT 0,
    recourse_exercised          BOOLEAN DEFAULT FALSE,
    recourse_amount             NUMERIC(15,4),
    service_fee_charged         NUMERIC(15,4),
    status                      VARCHAR(15) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('SUBMITTED','APPROVED','FUNDED','PARTIALLY_COLLECTED','COLLECTED','DEFAULTED','RECOURSE')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- securities_fail
CREATE TABLE IF NOT EXISTS securities_fail (
    id                          BIGSERIAL PRIMARY KEY,
    fail_ref                    VARCHAR(30) NOT NULL UNIQUE,
    settlement_instruction_id   BIGINT,
    instrument_code             VARCHAR(30),
    instrument_name             VARCHAR(300),
    isin                        VARCHAR(12),
    fail_type                   VARCHAR(20) NOT NULL
        CHECK (fail_type IN ('DELIVERY_FAIL','RECEIPT_FAIL','CASH_SHORTFALL','SECURITIES_SHORTFALL','COUNTERPARTY_FAIL','DEPOSITORY_ISSUE','MISMATCH','REGULATORY_HOLD')),
    counterparty_code           VARCHAR(30),
    counterparty_name           VARCHAR(200),
    original_settlement_date    DATE,
    current_expected_date       DATE,
    fail_start_date             DATE NOT NULL,
    aging_days                  INT DEFAULT 0,
    aging_bucket                VARCHAR(15)
        CHECK (aging_bucket IN ('SAME_DAY','1_TO_3_DAYS','4_TO_7_DAYS','8_TO_14_DAYS','15_TO_30_DAYS','OVER_30')),
    quantity                    NUMERIC(20,6),
    amount                      NUMERIC(20,4),
    currency                    VARCHAR(3),
    penalty_accrued             NUMERIC(15,4) DEFAULT 0,
    buy_in_eligible             BOOLEAN DEFAULT FALSE,
    buy_in_deadline             DATE,
    escalation_level            VARCHAR(20)
        CHECK (escalation_level IN ('OPERATIONS','DESK_HEAD','COMPLIANCE','SENIOR_MANAGEMENT')),
    resolution_action           VARCHAR(20)
        CHECK (resolution_action IN ('RESUBMIT','PARTIAL_SETTLEMENT','COUNTERPARTY_CHASE','BUY_IN','SHAPE_INSTRUCTION','CANCEL_REISSUE','MANUAL_OVERRIDE')),
    resolution_notes            TEXT,
    resolved_at                 TIMESTAMP,
    status                      VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','INVESTIGATING','ESCALATED','BUY_IN_INITIATED','RESOLVED','WRITTEN_OFF')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- compliance_gap_analysis
CREATE TABLE IF NOT EXISTS compliance_gap_analysis (
    id                          BIGSERIAL PRIMARY KEY,
    analysis_code               VARCHAR(30) NOT NULL UNIQUE,
    assessment_id               BIGINT,
    requirement_ref             VARCHAR(80),
    requirement_description     TEXT,
    regulatory_source           VARCHAR(60),
    clause_reference            VARCHAR(80),
    current_state               TEXT,
    target_state                TEXT,
    gap_description             TEXT,
    gap_severity                VARCHAR(12)
        CHECK (gap_severity IN ('CRITICAL','MAJOR','MINOR','OBSERVATION')),
    gap_category                VARCHAR(15)
        CHECK (gap_category IN ('POLICY','PROCESS','TECHNOLOGY','PEOPLE','DATA','DOCUMENTATION')),
    risk_if_unaddressed         VARCHAR(10)
        CHECK (risk_if_unaddressed IN ('HIGH','MEDIUM','LOW')),
    remediation_owner           VARCHAR(200),
    remediation_description     TEXT,
    remediation_cost            NUMERIC(15,4),
    remediation_start_date      DATE,
    remediation_target_date     DATE,
    remediation_actual_date     DATE,
    remediation_milestones      JSONB,
    evidence_refs               JSONB,
    verified_by                 VARCHAR(80),
    verified_at                 TIMESTAMP,
    status                      VARCHAR(20) NOT NULL DEFAULT 'IDENTIFIED'
        CHECK (status IN ('IDENTIFIED','REMEDIATION_PLANNED','IN_PROGRESS','REMEDIATED','VERIFIED','ACCEPTED_RISK')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- business_contribution
CREATE TABLE IF NOT EXISTS business_contribution (
    id                          BIGSERIAL PRIMARY KEY,
    report_code                 VARCHAR(30) NOT NULL UNIQUE,
    period_type                 VARCHAR(10) NOT NULL
        CHECK (period_type IN ('MONTHLY','QUARTERLY','ANNUAL')),
    period_date                 DATE NOT NULL,
    business_unit               VARCHAR(60),
    business_unit_name          VARCHAR(200),
    product_family              VARCHAR(30),
    region                      VARCHAR(60),
    branch_id                   BIGINT,
    currency                    VARCHAR(3) DEFAULT 'USD',
    interest_income             NUMERIC(20,4),
    fee_income                  NUMERIC(20,4),
    trading_income              NUMERIC(20,4),
    other_income                NUMERIC(20,4),
    total_revenue               NUMERIC(20,4),
    revenue_contribution_pct    NUMERIC(8,4),
    cost_of_funds               NUMERIC(20,4),
    operating_expense           NUMERIC(20,4),
    provision_expense           NUMERIC(20,4),
    total_cost                  NUMERIC(20,4),
    cost_contribution_pct       NUMERIC(8,4),
    gross_margin                NUMERIC(20,4),
    operating_profit            NUMERIC(20,4),
    net_profit                  NUMERIC(20,4),
    profit_contribution_pct     NUMERIC(8,4),
    return_on_equity            NUMERIC(8,4),
    return_on_assets            NUMERIC(8,4),
    cost_to_income_ratio        NUMERIC(8,4),
    avg_assets                  NUMERIC(20,4),
    avg_deposits                NUMERIC(20,4),
    avg_loans                   NUMERIC(20,4),
    customer_count              BIGINT,
    transaction_count           BIGINT,
    rwa_amount                  NUMERIC(20,4),
    capital_allocated           NUMERIC(20,4),
    return_on_rwa               NUMERIC(8,4),
    benchmark                   JSONB,
    status                      VARCHAR(15) NOT NULL DEFAULT 'CALCULATED'
        CHECK (status IN ('CALCULATED','REVIEWED','PUBLISHED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- branch_performance
CREATE TABLE IF NOT EXISTS branch_performance (
    id                          BIGSERIAL PRIMARY KEY,
    branch_id                   BIGINT NOT NULL,
    period_type                 VARCHAR(10) NOT NULL
        CHECK (period_type IN ('MONTHLY','QUARTERLY')),
    period_date                 DATE NOT NULL,
    total_deposits              NUMERIC(20,4),
    total_loans                 NUMERIC(20,4),
    total_assets                NUMERIC(20,4),
    deposit_growth_pct          NUMERIC(8,4),
    loan_growth_pct             NUMERIC(8,4),
    interest_income             NUMERIC(15,4),
    fee_income                  NUMERIC(15,4),
    total_revenue               NUMERIC(15,4),
    operating_cost              NUMERIC(15,4),
    net_profit                  NUMERIC(15,4),
    cost_to_income_ratio        NUMERIC(8,4),
    return_on_assets            NUMERIC(8,4),
    total_customers             INT,
    new_customers               INT,
    closed_customers            INT,
    active_customers            INT,
    dormant_customers           INT,
    customer_retention_pct      NUMERIC(5,2),
    avg_revenue_per_customer    NUMERIC(12,4),
    total_transactions          INT,
    digital_adoption_pct        NUMERIC(5,2),
    avg_queue_wait_minutes      NUMERIC(8,2),
    customer_satisfaction_score NUMERIC(5,2),
    staff_count                 INT,
    revenue_per_staff           NUMERIC(12,4),
    facility_utilization_pct    NUMERIC(5,2),
    npl_ratio_pct               NUMERIC(6,2),
    overdue_accounts_pct        NUMERIC(5,2),
    fraud_incident_count        INT,
    compliance_findings_count   INT,
    ranking                     INT,
    status                      VARCHAR(15) NOT NULL DEFAULT 'CALCULATED'
        CHECK (status IN ('CALCULATED','REVIEWED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0,
    UNIQUE(branch_id, period_type, period_date)
);

-- service_provider
CREATE TABLE IF NOT EXISTS service_provider (
    id                          BIGSERIAL PRIMARY KEY,
    provider_code               VARCHAR(30) NOT NULL UNIQUE,
    provider_name               VARCHAR(200) NOT NULL,
    provider_type               VARCHAR(25) NOT NULL
        CHECK (provider_type IN ('KYC_PROVIDER','CREDIT_BUREAU','PAYMENT_GATEWAY','CARD_PROCESSOR','SMS_GATEWAY','EMAIL_SERVICE','SWIFT','MARKET_DATA','FRAUD_SCREENING','AML_SCREENING','DOCUMENT_VERIFICATION','BIOMETRIC','IDENTITY_VERIFICATION','INSURANCE','RATING_AGENCY','CIT_COMPANY','PRINTING_SERVICE')),
    integration_method          VARCHAR(15)
        CHECK (integration_method IN ('REST_API','SOAP','SFTP','MQ','WEBSOCKET','SDK','BATCH_FILE')),
    base_url                    VARCHAR(500),
    api_version                 VARCHAR(20),
    auth_type                   VARCHAR(15)
        CHECK (auth_type IN ('API_KEY','OAUTH2','CERTIFICATE','BASIC','NONE')),
    contract_reference          VARCHAR(80),
    sla_response_time_ms        INT,
    sla_uptime_pct              NUMERIC(5,2),
    actual_avg_response_time_ms INT,
    actual_uptime_pct           NUMERIC(5,2),
    monthly_volume_limit        INT,
    current_month_volume        INT DEFAULT 0,
    cost_model                  VARCHAR(15)
        CHECK (cost_model IN ('PER_CALL','MONTHLY_FLAT','TIERED','FREE')),
    cost_per_call               NUMERIC(12,4),
    monthly_cost                NUMERIC(12,4),
    primary_contact_name        VARCHAR(200),
    primary_contact_email       VARCHAR(200),
    primary_contact_phone       VARCHAR(30),
    escalation_contact_name     VARCHAR(200),
    escalation_contact_email    VARCHAR(200),
    last_health_check_at        TIMESTAMP,
    health_status               VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN'
        CHECK (health_status IN ('HEALTHY','DEGRADED','DOWN','UNKNOWN')),
    failover_provider_id        BIGINT,
    status                      VARCHAR(20) NOT NULL DEFAULT 'ONBOARDING'
        CHECK (status IN ('ONBOARDING','ACTIVE','SUSPENDED','DECOMMISSIONED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- provider_health_log (standalone, immutable)
CREATE TABLE IF NOT EXISTS provider_health_log (
    id                          BIGSERIAL PRIMARY KEY,
    provider_id                 BIGINT NOT NULL,
    check_timestamp             TIMESTAMP NOT NULL DEFAULT now(),
    response_time_ms            INT,
    http_status_code            INT,
    is_healthy                  BOOLEAN,
    error_message               TEXT,
    request_count               INT,
    error_count                 INT,
    error_rate_pct              NUMERIC(5,2),
    created_at                  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prvhlog_provider ON provider_health_log(provider_id, check_timestamp DESC);

-- provider_transaction_log (standalone, immutable)
CREATE TABLE IF NOT EXISTS provider_transaction_log (
    id                          BIGSERIAL PRIMARY KEY,
    provider_id                 BIGINT NOT NULL,
    transaction_ref             VARCHAR(40),
    operation_type              VARCHAR(25),
    request_timestamp           TIMESTAMP,
    response_timestamp          TIMESTAMP,
    response_time_ms            INT,
    request_payload_ref         VARCHAR(200),
    response_code               VARCHAR(20),
    response_status             VARCHAR(10)
        CHECK (response_status IN ('SUCCESS','FAILURE','TIMEOUT','PARTIAL')),
    cost_charged                NUMERIC(12,4),
    retry_count                 INT DEFAULT 0,
    error_code                  VARCHAR(30),
    error_message               TEXT,
    created_at                  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prvtlog_provider ON provider_transaction_log(provider_id, request_timestamp DESC);

-- td_framework_summary
CREATE TABLE IF NOT EXISTS td_framework_summary (
    id                          BIGSERIAL PRIMARY KEY,
    agreement_id                BIGINT NOT NULL,
    snapshot_date               DATE NOT NULL,
    active_deposits             INT DEFAULT 0,
    total_principal             NUMERIC(20,4),
    total_accrued_interest      NUMERIC(20,4),
    weighted_avg_rate           NUMERIC(8,4),
    weighted_avg_tenor_days     INT,
    maturing_next_30_days       NUMERIC(20,4),
    maturing_next_60_days       NUMERIC(20,4),
    maturing_next_90_days       NUMERIC(20,4),
    expected_rollover_pct       NUMERIC(5,2),
    concentration_pct           NUMERIC(5,2),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0,
    UNIQUE(agreement_id, snapshot_date)
);
