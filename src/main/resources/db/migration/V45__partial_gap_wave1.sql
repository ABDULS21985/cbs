SET search_path TO cbs;

-- =====================================================
-- V45: Partial Gap Closure Wave 1 — Critical Revenue & Operations (Batch 36)
-- 22 tables across 7 modules: branch, contactcenter, workbench, fees, custody, secposition, merchant
-- =====================================================

-- =============================================================
-- 4.1 Branch Operations (4 tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS branch_facility (
    id                      BIGSERIAL PRIMARY KEY,
    branch_id               BIGINT         NOT NULL,
    facility_type           VARCHAR(20)    NOT NULL CHECK (facility_type IN ('BUILDING','ATM_LOBBY','PARKING','SAFE_ROOM','SERVER_ROOM','GENERATOR','VAULT_ROOM','MEETING_ROOM')),
    condition               VARCHAR(15)    DEFAULT 'GOOD' CHECK (condition IN ('EXCELLENT','GOOD','FAIR','POOR','UNDER_REPAIR')),
    last_inspection_date    DATE,
    next_inspection_due     DATE,
    maintenance_contract_ref VARCHAR(80),
    maintenance_vendor      VARCHAR(200),
    insurance_policy_ref    VARCHAR(80),
    insurance_expiry        DATE,
    square_footage          NUMERIC(10,2),
    capacity                INT,
    accessibility_compliant BOOLEAN        DEFAULT FALSE,
    fire_exit_count         INT,
    cctv_camera_count       INT,
    facility_notes          JSONB,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL','UNDER_MAINTENANCE','DECOMMISSIONED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_brfac_branch ON branch_facility(branch_id, status);

CREATE TABLE IF NOT EXISTS branch_staff_schedule (
    id                      BIGSERIAL PRIMARY KEY,
    branch_id               BIGINT         NOT NULL,
    employee_id             VARCHAR(80)    NOT NULL,
    employee_name           VARCHAR(200)   NOT NULL,
    role                    VARCHAR(20)    NOT NULL CHECK (role IN ('TELLER','CSO','MANAGER','SECURITY','GREETER')),
    shift_type              VARCHAR(15)    NOT NULL CHECK (shift_type IN ('MORNING','AFTERNOON','FULL_DAY','SPLIT','WEEKEND')),
    scheduled_date          DATE           NOT NULL,
    start_time              TIME,
    end_time                TIME,
    is_overtime             BOOLEAN        DEFAULT FALSE,
    substitute_employee_id  VARCHAR(80),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','CHECKED_IN','CHECKED_OUT','ABSENT','ON_LEAVE')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_brsched_branch ON branch_staff_schedule(branch_id, scheduled_date);

CREATE TABLE IF NOT EXISTS branch_queue_ticket (
    id                      BIGSERIAL PRIMARY KEY,
    branch_id               BIGINT         NOT NULL,
    ticket_number           VARCHAR(10)    NOT NULL,
    service_type            VARCHAR(20)    NOT NULL CHECK (service_type IN ('CASH_DEPOSIT','CASH_WITHDRAWAL','ACCOUNT_OPENING','ENQUIRY','FOREX','LOAN','CARD_SERVICE','GENERAL')),
    customer_id             BIGINT,
    priority                VARCHAR(10)    DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','PRIORITY','VIP')),
    counter_number          VARCHAR(10),
    serving_employee_id     VARCHAR(80),
    issued_at               TIMESTAMP      NOT NULL DEFAULT now(),
    called_at               TIMESTAMP,
    serving_started_at      TIMESTAMP,
    completed_at            TIMESTAMP,
    wait_time_seconds       INT,
    service_time_seconds    INT,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','CALLED','SERVING','COMPLETED','NO_SHOW','CANCELLED')),
    created_at              TIMESTAMP      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brqtkt_branch ON branch_queue_ticket(branch_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS branch_service_plan (
    id                              BIGSERIAL PRIMARY KEY,
    branch_id                       BIGINT         NOT NULL,
    plan_period                     VARCHAR(10)    NOT NULL CHECK (plan_period IN ('MONTHLY','QUARTERLY','ANNUAL')),
    period_start                    DATE           NOT NULL,
    period_end                      DATE           NOT NULL,
    target_transaction_volume       INT,
    actual_transaction_volume       INT            DEFAULT 0,
    target_new_accounts             INT,
    actual_new_accounts             INT            DEFAULT 0,
    target_cross_sell               INT,
    actual_cross_sell               INT            DEFAULT 0,
    customer_satisfaction_target    NUMERIC(5,2),
    customer_satisfaction_actual    NUMERIC(5,2),
    avg_wait_time_target            INT,
    avg_wait_time_actual            INT,
    avg_service_time_target         INT,
    avg_service_time_actual         INT,
    staffing_plan                   JSONB,
    operating_cost_budget           NUMERIC(15,4),
    operating_cost_actual           NUMERIC(15,4)  DEFAULT 0,
    revenue_target                  NUMERIC(15,4),
    revenue_actual                  NUMERIC(15,4)  DEFAULT 0,
    status                          VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ACTIVE','CLOSED')),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    created_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    version                         BIGINT         DEFAULT 0
);

-- =============================================================
-- 4.2 Contact Routing (4 tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS routing_rule (
    id                          BIGSERIAL PRIMARY KEY,
    rule_name                   VARCHAR(200)   NOT NULL,
    rule_type                   VARCHAR(20)    NOT NULL CHECK (rule_type IN ('SKILL_BASED','PRIORITY','ROUND_ROBIN','LEAST_OCCUPIED','PREFERRED_AGENT','LANGUAGE','VIP','OVERFLOW')),
    priority                    INT            NOT NULL,
    conditions                  JSONB          NOT NULL,
    target_queue                VARCHAR(60),
    target_skill_group          VARCHAR(60),
    target_agent_id             VARCHAR(80),
    fallback_rule_id            BIGINT,
    max_wait_before_fallback    INT,
    is_active                   BOOLEAN        NOT NULL DEFAULT TRUE,
    effective_from              DATE,
    effective_to                DATE,
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_state (
    id                              BIGSERIAL PRIMARY KEY,
    agent_id                        VARCHAR(80)    NOT NULL,
    agent_name                      VARCHAR(200)   NOT NULL,
    center_id                       BIGINT,
    skill_groups                    JSONB,
    languages                       JSONB,
    current_state                   VARCHAR(15)    NOT NULL DEFAULT 'OFFLINE' CHECK (current_state IN ('AVAILABLE','ON_CALL','WRAP_UP','BREAK','LUNCH','TRAINING','OFFLINE')),
    state_changed_at                TIMESTAMP,
    current_interaction_id          BIGINT,
    daily_handled                   INT            DEFAULT 0,
    daily_avg_handle_time           INT            DEFAULT 0,
    daily_first_contact_resolution  NUMERIC(5,2)   DEFAULT 0,
    quality_score                   NUMERIC(5,2),
    max_concurrent_chats            INT            DEFAULT 1,
    active_chat_count               INT            DEFAULT 0,
    shift_start                     TIME,
    shift_end                       TIME,
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    created_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    version                         BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agstate_state ON agent_state(current_state, center_id);

CREATE TABLE IF NOT EXISTS contact_queue (
    id                      BIGSERIAL PRIMARY KEY,
    queue_name              VARCHAR(100)   NOT NULL,
    center_id               BIGINT,
    queue_type              VARCHAR(20)    NOT NULL CHECK (queue_type IN ('INBOUND_CALL','OUTBOUND_CALL','CHAT','EMAIL','SOCIAL','ESCALATION','CALLBACK')),
    skill_required          JSONB,
    current_waiting         INT            DEFAULT 0,
    longest_wait_seconds    INT            DEFAULT 0,
    sla_target_seconds      INT,
    sla_achievement_pct     NUMERIC(5,2),
    max_capacity            INT,
    overflow_queue_id       BIGINT,
    priority_level          VARCHAR(10)    DEFAULT 'NORMAL' CHECK (priority_level IN ('LOW','NORMAL','HIGH','CRITICAL')),
    agents_assigned         INT            DEFAULT 0,
    agents_available        INT            DEFAULT 0,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','OVERFLOW','FULL','CLOSED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE TABLE IF NOT EXISTS callback_request (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT,
    callback_number         VARCHAR(20),
    preferred_time          TIMESTAMP,
    preferred_language      VARCHAR(10),
    contact_reason          VARCHAR(60),
    urgency                 VARCHAR(10)    DEFAULT 'NORMAL' CHECK (urgency IN ('LOW','NORMAL','HIGH','URGENT')),
    assigned_agent_id       VARCHAR(80),
    attempt_count           INT            DEFAULT 0,
    max_attempts            INT            DEFAULT 3,
    last_attempt_at         TIMESTAMP,
    last_outcome            VARCHAR(15)    CHECK (last_outcome IN ('ANSWERED','NO_ANSWER','BUSY','VOICEMAIL')),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- =============================================================
-- 4.3 Customer Workbench (3 tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS workbench_widget (
    id                          BIGSERIAL PRIMARY KEY,
    widget_code                 VARCHAR(30)    NOT NULL UNIQUE,
    widget_name                 VARCHAR(200)   NOT NULL,
    widget_type                 VARCHAR(25)    NOT NULL CHECK (widget_type IN ('CUSTOMER_PROFILE','ACCOUNT_SUMMARY','TRANSACTION_HISTORY','RECENT_INTERACTIONS','ALERTS','CROSS_SELL','COMPLIANCE_FLAGS','CASE_TRACKER','DOCUMENT_VIEWER','QUICK_ACTIONS','PERFORMANCE_DASHBOARD','APPROVAL_QUEUE')),
    applicable_workbench_types  JSONB,
    display_order               INT,
    default_expanded            BOOLEAN        DEFAULT TRUE,
    data_source_endpoint        VARCHAR(300),
    refresh_interval_seconds    INT            DEFAULT 60,
    is_required                 BOOLEAN        DEFAULT FALSE,
    status                      VARCHAR(10)    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workbench_quick_action (
    id                          BIGSERIAL PRIMARY KEY,
    action_code                 VARCHAR(30)    NOT NULL UNIQUE,
    action_name                 VARCHAR(200)   NOT NULL,
    action_category             VARCHAR(15)    NOT NULL CHECK (action_category IN ('TRANSACTION','ENQUIRY','SERVICE_REQUEST','APPROVAL','ESCALATION')),
    applicable_workbench_types  JSONB,
    target_endpoint             VARCHAR(300),
    required_fields             JSONB,
    authorization_level         VARCHAR(15)    DEFAULT 'SELF' CHECK (authorization_level IN ('SELF','SUPERVISOR','DUAL_CONTROL')),
    display_order               INT,
    hotkey                      VARCHAR(10),
    is_active                   BOOLEAN        DEFAULT TRUE,
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workbench_alert (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              BIGINT,
    alert_type              VARCHAR(25)    NOT NULL CHECK (alert_type IN ('KYC_EXPIRY','FRAUD_FLAG','DELINQUENT','VIP_CUSTOMER','COMPLIANCE_HOLD','DORMANT_ACCOUNT','SANCTION_MATCH','DECEASED','PEP_FLAG','PRODUCT_RECOMMENDATION')),
    severity                VARCHAR(10)    NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
    message                 TEXT           NOT NULL,
    details_json            JSONB,
    acknowledged            BOOLEAN        DEFAULT FALSE,
    acknowledged_at         TIMESTAMP,
    action_taken            TEXT,
    created_at              TIMESTAMP      NOT NULL DEFAULT now()
);

-- =============================================================
-- 4.4 Discount Pricing (2 tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS discount_scheme (
    id                              BIGSERIAL PRIMARY KEY,
    scheme_code                     VARCHAR(30)    NOT NULL UNIQUE,
    scheme_name                     VARCHAR(200)   NOT NULL,
    scheme_type                     VARCHAR(20)    NOT NULL CHECK (scheme_type IN ('PROMOTIONAL','LOYALTY_TIER','VOLUME_BASED','RELATIONSHIP_BASED','SEASONAL','STAFF','BUNDLED_PRODUCT','EARLY_BIRD','REFERRAL','CORPORATE')),
    discount_basis                  VARCHAR(20)    NOT NULL CHECK (discount_basis IN ('PERCENTAGE_OFF','FLAT_REDUCTION','FEE_WAIVER','RATE_REDUCTION','CASHBACK','BONUS_INTEREST')),
    discount_value                  NUMERIC(12,4),
    applicable_fee_ids              JSONB,
    applicable_products             JSONB,
    applicable_segments             JSONB,
    min_relationship_value          NUMERIC(20,4),
    min_transaction_volume          INT,
    loyalty_tier_required           VARCHAR(10)    CHECK (loyalty_tier_required IN ('BRONZE','SILVER','GOLD','PLATINUM','NONE')),
    max_discount_amount             NUMERIC(12,4),
    max_usage_per_customer          INT,
    max_total_budget                NUMERIC(15,4),
    current_utilization             NUMERIC(15,4)  DEFAULT 0,
    combinable_with_other_discounts BOOLEAN        DEFAULT FALSE,
    priority_order                  INT,
    effective_from                  DATE           NOT NULL,
    effective_to                    DATE,
    approved_by                     VARCHAR(80),
    approval_date                   DATE,
    status                          VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ACTIVE','EXHAUSTED','EXPIRED','SUSPENDED')),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    created_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    version                         BIGINT         DEFAULT 0
);

CREATE TABLE IF NOT EXISTS special_pricing_agreement (
    id                              BIGSERIAL PRIMARY KEY,
    agreement_code                  VARCHAR(30)    NOT NULL UNIQUE,
    customer_id                     BIGINT         NOT NULL,
    customer_name                   VARCHAR(200),
    agreement_type                  VARCHAR(25)    NOT NULL CHECK (agreement_type IN ('RELATIONSHIP_PRICING','CORPORATE_PACKAGE','HIGH_NET_WORTH','GOVERNMENT','NGO','STAFF','NEGOTIATED')),
    negotiated_by                   VARCHAR(80),
    approved_by                     VARCHAR(80),
    approval_level                  VARCHAR(20),
    fee_overrides                   JSONB,
    rate_overrides                  JSONB,
    fx_margin_override              NUMERIC(8,4),
    free_transaction_allowance      INT,
    waived_fees                     JSONB,
    conditions                      TEXT,
    review_frequency                VARCHAR(15)    CHECK (review_frequency IN ('QUARTERLY','SEMI_ANNUAL','ANNUAL')),
    next_review_date                DATE,
    relationship_value_at_approval  NUMERIC(20,4),
    current_relationship_value      NUMERIC(20,4),
    effective_from                  DATE           NOT NULL,
    effective_to                    DATE,
    status                          VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ACTIVE','UNDER_REVIEW','EXPIRED','TERMINATED')),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    created_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    version                         BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_specprc_customer ON special_pricing_agreement(customer_id, status);

-- =============================================================
-- 4.5 Trade Settlement (2 tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS settlement_instruction (
    id                          BIGSERIAL PRIMARY KEY,
    instruction_ref             VARCHAR(30)    NOT NULL UNIQUE,
    custody_account_id          BIGINT,
    trade_ref                   VARCHAR(30),
    instruction_type            VARCHAR(25)    NOT NULL CHECK (instruction_type IN ('DVP','FOP','RECEIVE_VS_PAYMENT','DELIVERY_VS_PAYMENT','RECEIVE_FREE','DELIVERY_FREE','INTERNAL_TRANSFER')),
    settlement_cycle            VARCHAR(5)     CHECK (settlement_cycle IN ('T0','T1','T2','T3')),
    instrument_code             VARCHAR(30),
    instrument_name             VARCHAR(300),
    isin                        VARCHAR(12),
    quantity                    NUMERIC(20,6),
    settlement_amount           NUMERIC(20,4),
    currency                    VARCHAR(3)     NOT NULL,
    counterparty_code           VARCHAR(30),
    counterparty_name           VARCHAR(200),
    counterparty_bic            VARCHAR(11),
    counterparty_account_ref    VARCHAR(80),
    depository_code             VARCHAR(30),
    place_of_settlement         VARCHAR(60),
    intended_settlement_date    DATE           NOT NULL,
    actual_settlement_date      DATE,
    match_status                VARCHAR(15)    DEFAULT 'UNMATCHED' CHECK (match_status IN ('UNMATCHED','MATCHED','ALLEGED','DISPUTED')),
    matched_at                  TIMESTAMP,
    priority_flag               BOOLEAN        DEFAULT FALSE,
    hold_reason                 TEXT,
    fail_reason                 TEXT,
    failed_since                DATE,
    penalty_amount              NUMERIC(15,4)  DEFAULT 0,
    status                      VARCHAR(20)    NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','MATCHED','SETTLING','SETTLED','PARTIALLY_SETTLED','FAILED','CANCELLED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_setinst_status ON settlement_instruction(status, intended_settlement_date);

CREATE TABLE IF NOT EXISTS settlement_batch (
    id                      BIGSERIAL PRIMARY KEY,
    batch_ref               VARCHAR(30)    NOT NULL UNIQUE,
    depository_code         VARCHAR(30),
    settlement_date         DATE           NOT NULL,
    total_instructions      INT            DEFAULT 0,
    settled_count           INT            DEFAULT 0,
    failed_count            INT            DEFAULT 0,
    pending_count           INT            DEFAULT 0,
    total_debit_amount      NUMERIC(20,4),
    total_credit_amount     NUMERIC(20,4),
    net_amount              NUMERIC(20,4),
    currency                VARCHAR(3),
    cutoff_time             TIME,
    submitted_at            TIMESTAMP,
    completed_at            TIMESTAMP,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'PREPARING' CHECK (status IN ('PREPARING','SUBMITTED','IN_PROGRESS','COMPLETED','PARTIALLY_COMPLETED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- =============================================================
-- 4.6 FI Valuation Models (3 tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS valuation_model (
    id                              BIGSERIAL PRIMARY KEY,
    model_code                      VARCHAR(30)    NOT NULL UNIQUE,
    model_name                      VARCHAR(200)   NOT NULL,
    instrument_type                 VARCHAR(25)    NOT NULL CHECK (instrument_type IN ('BOND','EQUITY','FX_FORWARD','IRS','OPTION','STRUCTURED_PRODUCT','MUTUAL_FUND','PRIVATE_EQUITY','REAL_ESTATE','COMMODITY')),
    valuation_methodology           VARCHAR(25)    NOT NULL CHECK (valuation_methodology IN ('DISCOUNTED_CASH_FLOW','COMPARABLE_MARKET','BINOMIAL_TREE','BLACK_SCHOLES','MONTE_CARLO','NAV_BASED','MARK_TO_MARKET','MARK_TO_MODEL','DEALER_QUOTE')),
    fair_value_hierarchy            VARCHAR(10)    NOT NULL CHECK (fair_value_hierarchy IN ('LEVEL_1','LEVEL_2','LEVEL_3')),
    input_parameters                JSONB,
    calibration_frequency           VARCHAR(10)    CHECK (calibration_frequency IN ('DAILY','WEEKLY','MONTHLY')),
    last_calibrated_at              TIMESTAMP,
    independent_price_verification  BOOLEAN        DEFAULT FALSE,
    ipv_frequency                   VARCHAR(10),
    last_ipv_date                   DATE,
    ipv_threshold_pct               NUMERIC(5,2),
    model_owner                     VARCHAR(200),
    validated_by                    VARCHAR(200),
    regulatory_approval             BOOLEAN        DEFAULT FALSE,
    status                          VARCHAR(15)    NOT NULL DEFAULT 'DEVELOPMENT' CHECK (status IN ('DEVELOPMENT','VALIDATED','PRODUCTION','RETIRED')),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    created_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    version                         BIGINT         DEFAULT 0
);

CREATE TABLE IF NOT EXISTS valuation_run (
    id                          BIGSERIAL PRIMARY KEY,
    run_ref                     VARCHAR(30)    NOT NULL UNIQUE,
    valuation_date              DATE           NOT NULL,
    model_id                    BIGINT         REFERENCES valuation_model(id),
    run_type                    VARCHAR(15)    NOT NULL CHECK (run_type IN ('END_OF_DAY','INTRADAY','AD_HOC','STRESS_TEST')),
    instruments_valued          INT            DEFAULT 0,
    total_market_value          NUMERIC(20,4),
    currency                    VARCHAR(3)     DEFAULT 'USD',
    unrealized_gain_loss        NUMERIC(20,4),
    fair_value_level1_total     NUMERIC(20,4),
    fair_value_level2_total     NUMERIC(20,4),
    fair_value_level3_total     NUMERIC(20,4),
    ipv_breach_count            INT            DEFAULT 0,
    pricing_exceptions          JSONB,
    run_started_at              TIMESTAMP,
    run_completed_at            TIMESTAMP,
    status                      VARCHAR(30)    NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','COMPLETED','COMPLETED_WITH_EXCEPTIONS','FAILED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

CREATE TABLE IF NOT EXISTS instrument_valuation (
    id                      BIGSERIAL PRIMARY KEY,
    run_id                  BIGINT         NOT NULL REFERENCES valuation_run(id),
    instrument_code         VARCHAR(30)    NOT NULL,
    isin                    VARCHAR(12),
    model_used              VARCHAR(30),
    fair_value_level        VARCHAR(10)    CHECK (fair_value_level IN ('LEVEL_1','LEVEL_2','LEVEL_3')),
    model_price             NUMERIC(20,8),
    market_price            NUMERIC(20,8),
    price_deviation         NUMERIC(12,6),
    deviation_breached      BOOLEAN        DEFAULT FALSE,
    inputs_used             JSONB,
    sensitivity_delta       NUMERIC(15,6),
    sensitivity_gamma       NUMERIC(15,6),
    sensitivity_vega        NUMERIC(15,6),
    duration                NUMERIC(10,6),
    modified_duration       NUMERIC(10,6),
    convexity               NUMERIC(10,6),
    yield_to_maturity       NUMERIC(8,4),
    spread_to_benchmark     NUMERIC(8,4),
    day_count_convention    VARCHAR(20),
    accrual_days            INT,
    accrued_amount          NUMERIC(15,4),
    clean_price             NUMERIC(20,8),
    dirty_price             NUMERIC(20,8),
    previous_valuation      NUMERIC(20,8),
    valuation_change        NUMERIC(20,8),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'PRICED' CHECK (status IN ('PRICED','ESTIMATED','STALE','EXCEPTION')),
    created_at              TIMESTAMP      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_instrval_run ON instrument_valuation(run_id);

-- =============================================================
-- 4.7 Merchant Acquiring (3 tables)
-- =============================================================

CREATE TABLE IF NOT EXISTS acquiring_facility (
    id                          BIGSERIAL PRIMARY KEY,
    merchant_id                 BIGINT         NOT NULL,
    facility_type               VARCHAR(20)    NOT NULL CHECK (facility_type IN ('CARD_PRESENT','CARD_NOT_PRESENT','ECOMMERCE','MPOS','QR','RECURRING')),
    processor_connection        VARCHAR(15)    NOT NULL CHECK (processor_connection IN ('VISA','MASTERCARD','VERVE','AMEX','UNION_PAY')),
    terminal_id_prefix          VARCHAR(20),
    settlement_currency         VARCHAR(3)     DEFAULT 'NGN',
    settlement_cycle            VARCHAR(3)     CHECK (settlement_cycle IN ('T0','T1','T2')),
    mdr_rate_pct                NUMERIC(5,4),
    daily_transaction_limit     NUMERIC(20,4),
    monthly_volume_limit        NUMERIC(20,4),
    chargeback_limit_pct        NUMERIC(5,2),
    reserve_hold_pct            NUMERIC(5,2),
    reserve_balance             NUMERIC(15,4)  DEFAULT 0,
    pci_compliance_status       VARCHAR(20)    DEFAULT 'PENDING_SAQ' CHECK (pci_compliance_status IN ('COMPLIANT','NON_COMPLIANT','PENDING_SAQ','PENDING_ASV')),
    pci_compliance_date         DATE,
    fraud_screening_enabled     BOOLEAN        DEFAULT TRUE,
    three_d_secure_enabled      BOOLEAN        DEFAULT FALSE,
    status                      VARCHAR(15)    NOT NULL DEFAULT 'SETUP' CHECK (status IN ('SETUP','ACTIVE','SUSPENDED','TERMINATED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_acqfac_merchant ON acquiring_facility(merchant_id, status);

CREATE TABLE IF NOT EXISTS merchant_settlement (
    id                          BIGSERIAL PRIMARY KEY,
    merchant_id                 BIGINT         NOT NULL,
    facility_id                 BIGINT         REFERENCES acquiring_facility(id),
    settlement_date             DATE           NOT NULL,
    gross_transaction_amount    NUMERIC(20,4),
    transaction_count           INT            DEFAULT 0,
    mdr_deducted                NUMERIC(15,4)  DEFAULT 0,
    other_fees_deducted         NUMERIC(15,4)  DEFAULT 0,
    chargeback_deductions       NUMERIC(15,4)  DEFAULT 0,
    refund_deductions           NUMERIC(15,4)  DEFAULT 0,
    reserve_held                NUMERIC(15,4)  DEFAULT 0,
    net_settlement_amount       NUMERIC(20,4),
    settlement_account_id       BIGINT,
    settlement_reference        VARCHAR(80),
    settled_at                  TIMESTAMP,
    status                      VARCHAR(15)    NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('CALCULATED','APPROVED','SETTLED','DISPUTE')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mchsetl_merchant ON merchant_settlement(merchant_id, settlement_date DESC);

CREATE TABLE IF NOT EXISTS merchant_chargeback (
    id                          BIGSERIAL PRIMARY KEY,
    merchant_id                 BIGINT         NOT NULL,
    original_transaction_ref    VARCHAR(40),
    transaction_date            DATE,
    transaction_amount          NUMERIC(15,4),
    card_network                VARCHAR(15),
    reason_code                 VARCHAR(10),
    reason_description          VARCHAR(200),
    chargeback_amount           NUMERIC(15,4),
    currency                    VARCHAR(3)     DEFAULT 'NGN',
    evidence_deadline           DATE,
    merchant_response_ref       VARCHAR(80),
    merchant_evidence           JSONB,
    representment_submitted     BOOLEAN        DEFAULT FALSE,
    arbitration_required        BOOLEAN        DEFAULT FALSE,
    outcome                     VARCHAR(15)    CHECK (outcome IN ('MERCHANT_WIN','MERCHANT_LOSS','SPLIT','PENDING')),
    financial_impact            NUMERIC(15,4),
    status                      VARCHAR(20)    NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','NOTIFIED','EVIDENCE_REQUESTED','REPRESENTMENT','ARBITRATION','CLOSED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);
