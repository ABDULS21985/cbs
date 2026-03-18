SET search_path TO cbs;

-- V38: Risk Models, Market Data & Operational Gaps (FINAL BATCH)

-- ============================================================
-- Business Risk Model
-- ============================================================
CREATE TABLE IF NOT EXISTS business_risk_assessment (
    id                      BIGSERIAL PRIMARY KEY,
    assessment_code         VARCHAR(30)  NOT NULL UNIQUE,
    assessment_name         VARCHAR(200) NOT NULL,
    risk_domain             VARCHAR(25)  NOT NULL CHECK (risk_domain IN ('STRATEGIC','REPUTATIONAL','BUSINESS_MODEL','COMPETITIVE','REGULATORY_CHANGE','TECHNOLOGY','TALENT','ESG','GEOPOLITICAL','PANDEMIC')),
    assessment_date         DATE         NOT NULL,
    assessor                VARCHAR(200),
    inherent_risk_score     INT          NOT NULL CHECK (inherent_risk_score BETWEEN 1 AND 25),
    control_effectiveness   VARCHAR(15)  CHECK (control_effectiveness IN ('STRONG','ADEQUATE','WEAK','INEFFECTIVE')),
    residual_risk_score     INT          NOT NULL CHECK (residual_risk_score BETWEEN 1 AND 25),
    risk_rating             VARCHAR(10)  NOT NULL CHECK (risk_rating IN ('LOW','MODERATE','HIGH','VERY_HIGH','CRITICAL')),
    risk_appetite_status    VARCHAR(15)  CHECK (risk_appetite_status IN ('WITHIN','APPROACHING','EXCEEDED')),
    description             TEXT,
    key_risk_indicators     JSONB,
    risk_drivers            JSONB,
    mitigation_actions      JSONB,
    impact_assessment       JSONB,
    next_review_date        DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','COMPLETED','REVIEWED','ACCEPTED','ESCALATED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_bizrisk_domain ON business_risk_assessment(risk_domain, assessment_date DESC);

-- ============================================================
-- Model Risk / Production
-- ============================================================
CREATE TABLE IF NOT EXISTS model_lifecycle_event (
    id                      BIGSERIAL PRIMARY KEY,
    event_code              VARCHAR(30)  NOT NULL UNIQUE,
    model_code              VARCHAR(30)  NOT NULL,
    model_name              VARCHAR(200) NOT NULL,
    event_type              VARCHAR(25)  NOT NULL CHECK (event_type IN ('DEVELOPMENT_START','DEVELOPMENT_COMPLETE','VALIDATION_REQUEST','VALIDATION_PASS','VALIDATION_FAIL','APPROVAL','DEPLOYMENT','MONITORING_ALERT','PERFORMANCE_REVIEW','RECALIBRATION','PARAMETER_UPDATE','ISSUE_RAISED','ISSUE_RESOLVED','RETIREMENT','SUSPENSION')),
    event_date              DATE         NOT NULL,
    performed_by            VARCHAR(200),
    description             TEXT,
    findings                JSONB,
    metrics_snapshot        JSONB,
    approval_committee      VARCHAR(100),
    risk_tier_change        VARCHAR(30),
    regulatory_notification BOOLEAN      DEFAULT FALSE,
    documentation_ref       VARCHAR(200),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'RECORDED' CHECK (status IN ('RECORDED','REVIEWED','ACTIONED','CLOSED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_modelops_model ON model_lifecycle_event(model_code, event_date DESC);

-- ============================================================
-- Credit and Margin Management
-- ============================================================
CREATE TABLE IF NOT EXISTS margin_call (
    id                      BIGSERIAL PRIMARY KEY,
    call_ref                VARCHAR(30)  NOT NULL UNIQUE,
    call_direction          VARCHAR(10)  NOT NULL CHECK (call_direction IN ('ISSUED','RECEIVED')),
    counterparty_code       VARCHAR(30)  NOT NULL,
    counterparty_name       VARCHAR(200) NOT NULL,
    call_type               VARCHAR(15)  NOT NULL CHECK (call_type IN ('INITIAL_MARGIN','VARIATION_MARGIN','ADDITIONAL_MARGIN','RETURN')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    call_amount             NUMERIC(20,4) NOT NULL,
    portfolio_mtm           NUMERIC(20,4),
    threshold_amount        NUMERIC(20,4),
    minimum_transfer        NUMERIC(20,4),
    independent_amount      NUMERIC(20,4),
    agreed_amount           NUMERIC(20,4),
    dispute_amount          NUMERIC(20,4) DEFAULT 0,
    dispute_reason          TEXT,
    collateral_type         VARCHAR(20)  CHECK (collateral_type IN ('CASH','GOVERNMENT_BOND','CORPORATE_BOND','EQUITY','LETTER_OF_CREDIT','MIXED')),
    settled_amount          NUMERIC(20,4) DEFAULT 0,
    settlement_date         DATE,
    call_date               DATE         NOT NULL,
    response_deadline       DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','ACKNOWLEDGED','AGREED','DISPUTED','PARTIALLY_SETTLED','SETTLED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_margincall_cp ON margin_call(counterparty_code, status);

CREATE TABLE IF NOT EXISTS collateral_position (
    id                      BIGSERIAL PRIMARY KEY,
    position_code           VARCHAR(30)  NOT NULL UNIQUE,
    counterparty_code       VARCHAR(30)  NOT NULL,
    counterparty_name       VARCHAR(200) NOT NULL,
    direction               VARCHAR(10)  NOT NULL CHECK (direction IN ('HELD','POSTED')),
    collateral_type         VARCHAR(20)  NOT NULL CHECK (collateral_type IN ('CASH','GOVERNMENT_BOND','CORPORATE_BOND','EQUITY','LETTER_OF_CREDIT','PROPERTY','RECEIVABLES','INVENTORY','MIXED')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    market_value            NUMERIC(20,4) NOT NULL,
    haircut_pct             NUMERIC(5,2) DEFAULT 0,
    adjusted_value          NUMERIC(20,4),
    eligible                BOOLEAN      NOT NULL DEFAULT TRUE,
    concentration_limit_pct NUMERIC(5,2),
    maturity_date           DATE,
    revaluation_date        DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUBSTITUTED','RELEASED','DEFAULTED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Contribution Risk Model
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_contribution (
    id                      BIGSERIAL PRIMARY KEY,
    contribution_code       VARCHAR(30)  NOT NULL UNIQUE,
    calc_date               DATE         NOT NULL,
    portfolio_code          VARCHAR(30)  NOT NULL,
    business_unit           VARCHAR(60),
    position_identifier     VARCHAR(80),
    position_name           VARCHAR(200),
    risk_measure            VARCHAR(20)  NOT NULL CHECK (risk_measure IN ('VAR','EXPECTED_SHORTFALL','STRESS_LOSS','CREDIT_VAR','ECONOMIC_CAPITAL')),
    standalone_risk         NUMERIC(20,4),
    marginal_contribution   NUMERIC(20,4) NOT NULL,
    incremental_contribution NUMERIC(20,4),
    component_contribution  NUMERIC(20,4),
    contribution_pct        NUMERIC(8,4),
    diversification_benefit NUMERIC(20,4),
    correlation_to_portfolio NUMERIC(8,4),
    total_portfolio_risk    NUMERIC(20,4),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('CALCULATED','REVIEWED','APPROVED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_riskcontrib_date ON risk_contribution(calc_date, portfolio_code);

-- ============================================================
-- Market Information Management
-- ============================================================
CREATE TABLE IF NOT EXISTS market_data_feed (
    id                      BIGSERIAL PRIMARY KEY,
    feed_code               VARCHAR(30)  NOT NULL UNIQUE,
    feed_name               VARCHAR(200) NOT NULL,
    provider                VARCHAR(60)  NOT NULL,
    feed_type               VARCHAR(20)  NOT NULL CHECK (feed_type IN ('REAL_TIME','DELAYED','END_OF_DAY','INTRADAY','TICK_BY_TICK','SNAPSHOT')),
    data_category           VARCHAR(20)  NOT NULL CHECK (data_category IN ('FX_RATES','INTEREST_RATES','EQUITY_PRICES','BOND_PRICES','COMMODITY','INDEX','CREDIT_SPREAD','VOLATILITY','ECONOMIC_INDICATOR')),
    instruments_covered     JSONB,
    update_frequency_sec    INT,
    connection_protocol     VARCHAR(20)  CHECK (connection_protocol IN ('FIX','REST_API','WEBSOCKET','FTP','SFTP','PROPRIETARY')),
    endpoint_url            VARCHAR(500),
    last_update_at          TIMESTAMP,
    records_today           INT          DEFAULT 0,
    error_count_today       INT          DEFAULT 0,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DEGRADED','DISCONNECTED','MAINTENANCE','DECOMMISSIONED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE TABLE IF NOT EXISTS market_price (
    id                      BIGSERIAL PRIMARY KEY,
    instrument_code         VARCHAR(30)  NOT NULL,
    price_type              VARCHAR(15)  NOT NULL CHECK (price_type IN ('BID','ASK','MID','LAST','CLOSE','OPEN','HIGH','LOW','VWAP','SETTLEMENT')),
    price                   NUMERIC(20,8) NOT NULL,
    currency                VARCHAR(3)   NOT NULL,
    source                  VARCHAR(30)  NOT NULL,
    price_date              DATE         NOT NULL,
    price_time              TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE(instrument_code, price_type, price_date, source)
);

CREATE INDEX idx_mktprice_instr ON market_price(instrument_code, price_date DESC);

-- ============================================================
-- Financial Market Analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS market_signal (
    id                      BIGSERIAL PRIMARY KEY,
    signal_code             VARCHAR(30)  NOT NULL UNIQUE,
    instrument_code         VARCHAR(30)  NOT NULL,
    instrument_name         VARCHAR(300),
    signal_type             VARCHAR(20)  NOT NULL CHECK (signal_type IN ('TECHNICAL','FUNDAMENTAL','SENTIMENT','QUANT','COMPOSITE','MOMENTUM','MEAN_REVERSION','BREAKOUT')),
    signal_direction        VARCHAR(10)  NOT NULL CHECK (signal_direction IN ('BUY','SELL','HOLD','STRONG_BUY','STRONG_SELL')),
    confidence_pct          NUMERIC(5,2),
    signal_strength         VARCHAR(10)  CHECK (signal_strength IN ('STRONG','MODERATE','WEAK')),
    indicators_used         JSONB,
    analysis_summary        TEXT,
    target_price            NUMERIC(20,8),
    stop_loss               NUMERIC(20,8),
    time_horizon            VARCHAR(15)  CHECK (time_horizon IN ('INTRADAY','SHORT_TERM','MEDIUM_TERM','LONG_TERM')),
    signal_date             DATE         NOT NULL,
    expires_at              DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','TRIGGERED','EXPIRED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Financial Market Research
-- ============================================================
CREATE TABLE IF NOT EXISTS research_publication (
    id                      BIGSERIAL PRIMARY KEY,
    publication_code        VARCHAR(30)  NOT NULL UNIQUE,
    title                   VARCHAR(300) NOT NULL,
    publication_type        VARCHAR(20)  NOT NULL CHECK (publication_type IN ('ANALYST_NOTE','SECTOR_REPORT','ECONOMIC_COMMENTARY','STRATEGY_NOTE','CREDIT_OPINION','MORNING_BRIEF','WEEKLY_REVIEW','MONTHLY_OUTLOOK','SPECIAL_REPORT')),
    author                  VARCHAR(200) NOT NULL,
    sector                  VARCHAR(40),
    region                  VARCHAR(40),
    summary                 TEXT         NOT NULL,
    content_ref             VARCHAR(500),
    tags                    JSONB,
    distribution_list       JSONB,
    compliance_reviewed     BOOLEAN      DEFAULT FALSE,
    disclaimer              TEXT,
    published_at            TIMESTAMP,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','COMPLIANCE_REVIEW','APPROVED','PUBLISHED','RETRACTED','ARCHIVED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Product Deployment
-- ============================================================
CREATE TABLE IF NOT EXISTS product_deployment (
    id                      BIGSERIAL PRIMARY KEY,
    deployment_code         VARCHAR(30)  NOT NULL UNIQUE,
    product_code            VARCHAR(30)  NOT NULL,
    product_name            VARCHAR(200) NOT NULL,
    deployment_type         VARCHAR(15)  NOT NULL CHECK (deployment_type IN ('PILOT','SOFT_LAUNCH','GENERAL_AVAILABILITY','CHANNEL_ACTIVATION','REGION_EXPANSION','FEATURE_TOGGLE','RETIREMENT')),
    target_channels         JSONB,
    target_branches         JSONB,
    target_regions          JSONB,
    planned_date            DATE         NOT NULL,
    actual_date             DATE,
    rollback_plan           TEXT,
    adoption_target         INT,
    adoption_actual         INT          DEFAULT 0,
    issues_count            INT          DEFAULT 0,
    approved_by             VARCHAR(80),
    change_request_ref      VARCHAR(30),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','APPROVED','IN_PROGRESS','COMPLETED','ROLLED_BACK','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Central Cash Handling
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_vault (
    id                      BIGSERIAL PRIMARY KEY,
    vault_code              VARCHAR(30)  NOT NULL UNIQUE,
    vault_name              VARCHAR(200) NOT NULL,
    vault_type              VARCHAR(15)  NOT NULL CHECK (vault_type IN ('BRANCH','REGIONAL','CENTRAL','ATM_RESERVE','AGENCY')),
    branch_id               BIGINT,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'NGN',
    total_balance           NUMERIC(20,4) NOT NULL DEFAULT 0,
    denomination_breakdown  JSONB,
    insurance_limit         NUMERIC(20,4),
    last_counted_at         TIMESTAMP,
    last_reconciled_at      TIMESTAMP,
    custodian_name          VARCHAR(200),
    dual_control            BOOLEAN      NOT NULL DEFAULT TRUE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOCKED','AUDIT','DECOMMISSIONED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cash_movement (
    id                      BIGSERIAL PRIMARY KEY,
    movement_ref            VARCHAR(30)  NOT NULL UNIQUE,
    from_vault_code         VARCHAR(30),
    to_vault_code           VARCHAR(30),
    movement_type           VARCHAR(20)  NOT NULL CHECK (movement_type IN ('BRANCH_SUPPLY','BRANCH_RETURN','ATM_REPLENISHMENT','CIT_PICKUP','CIT_DELIVERY','VAULT_TRANSFER','CB_DEPOSIT','CB_WITHDRAWAL','ADJUSTMENT')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'NGN',
    amount                  NUMERIC(20,4) NOT NULL,
    denomination_detail     JSONB,
    cit_company             VARCHAR(100),
    seal_number             VARCHAR(40),
    escort_count            INT,
    authorized_by           VARCHAR(80),
    received_by             VARCHAR(80),
    scheduled_date          DATE,
    actual_date             DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','IN_TRANSIT','DELIVERED','CONFIRMED','DISCREPANCY','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_cashmove_vault ON cash_movement(from_vault_code, actual_date DESC);

-- ============================================================
-- Branch Network Management
-- ============================================================
CREATE TABLE IF NOT EXISTS branch_network_plan (
    id                      BIGSERIAL PRIMARY KEY,
    plan_code               VARCHAR(30)  NOT NULL UNIQUE,
    plan_name               VARCHAR(200) NOT NULL,
    plan_type               VARCHAR(20)  NOT NULL CHECK (plan_type IN ('NEW_BRANCH','CLOSURE','RELOCATION','RENOVATION','FORMAT_CHANGE','MERGER','DIGITAL_KIOSK','AGENT_NETWORK','ATM_DEPLOYMENT','SEASONAL')),
    region                  VARCHAR(60)  NOT NULL,
    target_location         TEXT,
    latitude                NUMERIC(10,7),
    longitude               NUMERIC(10,7),
    estimated_cost          NUMERIC(15,4),
    estimated_revenue_annual NUMERIC(15,4),
    payback_months          INT,
    target_customers        INT,
    catchment_population    BIGINT,
    competitive_density     INT,
    planned_start           DATE,
    planned_completion      DATE,
    actual_completion       DATE,
    approved_by             VARCHAR(80),
    board_approval_ref      VARCHAR(60),
    regulatory_approval_ref VARCHAR(60),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','FEASIBILITY','APPROVED','IN_PROGRESS','COMPLETED','DEFERRED','REJECTED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Leasing Item Administration
-- ============================================================
CREATE TABLE IF NOT EXISTS leased_asset (
    id                      BIGSERIAL PRIMARY KEY,
    asset_code              VARCHAR(30)  NOT NULL UNIQUE,
    lease_contract_id       BIGINT,
    asset_type              VARCHAR(25)  NOT NULL CHECK (asset_type IN ('VEHICLE','HEAVY_EQUIPMENT','IT_EQUIPMENT','OFFICE_FURNITURE','MEDICAL_EQUIPMENT','INDUSTRIAL_MACHINERY','AIRCRAFT','MARINE_VESSEL','AGRICULTURAL','SOLAR_PANEL')),
    description             VARCHAR(300) NOT NULL,
    manufacturer            VARCHAR(100),
    model                   VARCHAR(100),
    serial_number           VARCHAR(80)  UNIQUE,
    year_of_manufacture     INT,
    original_cost           NUMERIC(15,4) NOT NULL,
    current_book_value      NUMERIC(15,4),
    residual_value          NUMERIC(15,4),
    depreciation_method     VARCHAR(15)  CHECK (depreciation_method IN ('STRAIGHT_LINE','DECLINING_BALANCE','UNITS_OF_PRODUCTION')),
    monthly_depreciation    NUMERIC(12,4),
    current_location        TEXT,
    condition               VARCHAR(10)  DEFAULT 'GOOD' CHECK (condition IN ('EXCELLENT','GOOD','FAIR','POOR','DAMAGED','WRITTEN_OFF')),
    last_inspection_date    DATE,
    next_inspection_due     DATE,
    insurance_policy_ref    VARCHAR(80),
    insurance_expiry        DATE,
    return_condition        VARCHAR(10)  CHECK (return_condition IN ('EXCELLENT','GOOD','FAIR','POOR','DAMAGED')),
    return_inspection_ref   VARCHAR(200),
    returned_at             TIMESTAMP,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ON_ORDER','ACTIVE','MAINTENANCE','RETURNED','DISPOSED','WRITTEN_OFF')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_leasedasset_contract ON leased_asset(lease_contract_id, status);
