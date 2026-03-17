-- V23: Intelligence, Governance, Internet Banking (Caps 95-99, 54)
-- Behaviour Analytics, AI Doc Processing, Cash Flow Forecasting, Dashboards, Parameters, Internet Banking

SET search_path TO cbs;

-- ============================================================
-- Cap 95: Behaviour Analytics / Recommendation Engine
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_behaviour_event (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT       NOT NULL,
    event_type          VARCHAR(40)  NOT NULL
                        CHECK (event_type IN ('LOGIN','PAGE_VIEW','PRODUCT_VIEW','TRANSACTION','SEARCH',
                               'APPLICATION_START','APPLICATION_COMPLETE','SUPPORT_CONTACT','COMPLAINT',
                               'FEEDBACK','OFFER_VIEW','OFFER_ACCEPT','OFFER_REJECT','CHURN_SIGNAL')),
    channel             VARCHAR(20)  NOT NULL,
    session_id          VARCHAR(80),
    event_data          JSONB,        -- flexible payload per event type
    device_type         VARCHAR(20),  -- MOBILE, DESKTOP, TABLET, ATM, BRANCH
    geo_location        VARCHAR(100),
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_behaviour_customer ON customer_behaviour_event(customer_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS product_recommendation (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT       NOT NULL,
    recommended_product VARCHAR(80)  NOT NULL,
    recommendation_type VARCHAR(30)  NOT NULL
                        CHECK (recommendation_type IN ('CROSS_SELL','UP_SELL','RETENTION','NEXT_BEST_ACTION',
                               'LIFECYCLE','REACTIVATION','CAMPAIGN')),
    score               NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    reason              TEXT,
    model_version       VARCHAR(30),
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','PRESENTED','ACCEPTED','REJECTED','EXPIRED')),
    presented_at        TIMESTAMP,
    responded_at        TIMESTAMP,
    expires_at          TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendation_customer ON product_recommendation(customer_id, status, score DESC);

-- ============================================================
-- Cap 96: AI Document Processing (OCR / NLP)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_processing_job (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              VARCHAR(80)  NOT NULL UNIQUE,
    document_id         BIGINT,       -- references document table
    document_type       VARCHAR(40)  NOT NULL
                        CHECK (document_type IN ('NATIONAL_ID','PASSPORT','DRIVERS_LICENSE','UTILITY_BILL',
                               'BANK_STATEMENT','PAY_SLIP','TAX_RETURN','BUSINESS_REGISTRATION',
                               'FINANCIAL_STATEMENT','INVOICE','CONTRACT','CHEQUE')),
    processing_type     VARCHAR(30)  NOT NULL
                        CHECK (processing_type IN ('OCR','NLP_EXTRACTION','CLASSIFICATION','VERIFICATION',
                               'FRAUD_CHECK','SENTIMENT_ANALYSIS','SUMMARISATION')),
    input_format        VARCHAR(20)  NOT NULL DEFAULT 'PDF'
                        CHECK (input_format IN ('PDF','JPEG','PNG','TIFF','HEIC','DOCX')),
    extracted_data      JSONB,        -- structured extraction result
    confidence_score    NUMERIC(5,2),  -- 0-100%
    verification_status VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (verification_status IN ('PENDING','PROCESSING','EXTRACTED','VERIFIED',
                               'FAILED','MANUAL_REVIEW')),
    flags               JSONB,        -- tamper detection, quality issues
    processing_time_ms  INT,
    model_used          VARCHAR(60),
    reviewed_by         VARCHAR(80),
    reviewed_at         TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_processing_status ON document_processing_job(verification_status, created_at DESC);

-- ============================================================
-- Cap 97: Cash Flow Forecasting
-- ============================================================
CREATE TABLE IF NOT EXISTS cashflow_forecast (
    id                  BIGSERIAL PRIMARY KEY,
    forecast_id         VARCHAR(80)  NOT NULL UNIQUE,
    entity_type         VARCHAR(20)  NOT NULL
                        CHECK (entity_type IN ('BANK','BRANCH','CUSTOMER','PRODUCT','CURRENCY')),
    entity_id           VARCHAR(80)  NOT NULL,  -- bank-wide, branch code, customer ID, etc.
    forecast_date       DATE         NOT NULL,
    horizon_days        INT          NOT NULL DEFAULT 30,
    currency            VARCHAR(3)   NOT NULL DEFAULT 'USD',
    -- Forecasted components
    projected_inflows   NUMERIC(20,4) NOT NULL DEFAULT 0,
    projected_outflows  NUMERIC(20,4) NOT NULL DEFAULT 0,
    net_position        NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Confidence
    confidence_level    NUMERIC(5,2) DEFAULT 80.00,  -- %
    lower_bound         NUMERIC(20,4),
    upper_bound         NUMERIC(20,4),
    -- Model info
    model_type          VARCHAR(30)  NOT NULL DEFAULT 'ARIMA'
                        CHECK (model_type IN ('ARIMA','EXPONENTIAL_SMOOTHING','PROPHET','LSTM',
                               'ENSEMBLE','RULE_BASED','MONTE_CARLO')),
    model_version       VARCHAR(30),
    feature_importance  JSONB,        -- which factors drove the forecast
    -- Breakdown
    inflow_breakdown    JSONB,        -- {"salary":40000,"transfers":10000,"interest":500}
    outflow_breakdown   JSONB,        -- {"rent":15000,"utilities":3000,"loan_repayment":8000}
    status              VARCHAR(20)  NOT NULL DEFAULT 'GENERATED'
                        CHECK (status IN ('GENERATING','GENERATED','APPROVED','EXPIRED','SUPERSEDED')),
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_cashflow_entity ON cashflow_forecast(entity_type, entity_id, forecast_date DESC);

-- ============================================================
-- Cap 98: Real-Time Dashboards / BI
-- ============================================================
CREATE TABLE IF NOT EXISTS dashboard_definition (
    id                  BIGSERIAL PRIMARY KEY,
    dashboard_code      VARCHAR(80)  NOT NULL UNIQUE,
    dashboard_name      VARCHAR(200) NOT NULL,
    dashboard_type      VARCHAR(30)  NOT NULL
                        CHECK (dashboard_type IN ('EXECUTIVE','OPERATIONS','RISK','COMPLIANCE',
                               'BRANCH','PRODUCT','CUSTOMER','TREASURY','IT','CUSTOM')),
    layout_config       JSONB        NOT NULL,  -- grid layout, widget positions
    refresh_interval_sec INT         NOT NULL DEFAULT 300,
    allowed_roles       JSONB,
    is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by          VARCHAR(80),
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_widget (
    id                  BIGSERIAL PRIMARY KEY,
    dashboard_id        BIGINT       NOT NULL REFERENCES dashboard_definition(id),
    widget_code         VARCHAR(80)  NOT NULL,
    widget_type         VARCHAR(30)  NOT NULL
                        CHECK (widget_type IN ('KPI_CARD','LINE_CHART','BAR_CHART','PIE_CHART',
                               'TABLE','HEATMAP','MAP','GAUGE','FUNNEL','TREEMAP','SCATTER',
                               'ALERT_FEED','TICKER')),
    title               VARCHAR(200) NOT NULL,
    data_source         VARCHAR(80)  NOT NULL,  -- view/query/API endpoint
    query_config        JSONB,        -- filters, groupBy, aggregation
    display_config      JSONB,        -- colors, thresholds, formatting
    position_x          INT          NOT NULL DEFAULT 0,
    position_y          INT          NOT NULL DEFAULT 0,
    width               INT          NOT NULL DEFAULT 4,
    height              INT          NOT NULL DEFAULT 3,
    refresh_override_sec INT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- Cap 99: Parameter Management Store
-- ============================================================
CREATE TABLE IF NOT EXISTS system_parameter (
    id                  BIGSERIAL PRIMARY KEY,
    param_key           VARCHAR(200) NOT NULL,
    param_category      VARCHAR(60)  NOT NULL
                        CHECK (param_category IN ('GENERAL','INTEREST_RATE','FEE','LIMIT','THRESHOLD',
                               'SCHEDULE','NOTIFICATION','COMPLIANCE','INTEGRATION','SECURITY',
                               'DISPLAY','WORKFLOW','TAX','CURRENCY','PRODUCT')),
    param_value         TEXT         NOT NULL,
    value_type          VARCHAR(20)  NOT NULL DEFAULT 'STRING'
                        CHECK (value_type IN ('STRING','INTEGER','DECIMAL','BOOLEAN','JSON','DATE','CRON')),
    description         TEXT,
    effective_from      TIMESTAMP    NOT NULL DEFAULT now(),
    effective_to        TIMESTAMP,
    tenant_id           BIGINT       REFERENCES tenant(id),
    branch_id           BIGINT,
    is_encrypted        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_modified_by    VARCHAR(80),
    approval_status     VARCHAR(20)  NOT NULL DEFAULT 'APPROVED'
                        CHECK (approval_status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED')),
    approved_by         VARCHAR(80),
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (param_key, tenant_id, branch_id, effective_from)
);

CREATE TABLE IF NOT EXISTS parameter_audit (
    id                  BIGSERIAL PRIMARY KEY,
    parameter_id        BIGINT       NOT NULL REFERENCES system_parameter(id),
    old_value           TEXT,
    new_value           TEXT         NOT NULL,
    changed_by          VARCHAR(80)  NOT NULL,
    change_reason       TEXT,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_param_key ON system_parameter(param_key, tenant_id, is_active);
CREATE INDEX idx_param_category ON system_parameter(param_category, is_active);

-- Seed: core system parameters
INSERT INTO system_parameter (param_key, param_category, param_value, value_type, description, last_modified_by)
VALUES
    ('system.currency.base', 'CURRENCY', 'USD', 'STRING', 'Base reporting currency', 'SYSTEM'),
    ('system.timezone', 'GENERAL', 'UTC', 'STRING', 'System timezone', 'SYSTEM'),
    ('system.date.format', 'DISPLAY', 'yyyy-MM-dd', 'STRING', 'Default date format', 'SYSTEM'),
    ('system.password.min_length', 'SECURITY', '12', 'INTEGER', 'Minimum password length', 'SYSTEM'),
    ('system.password.max_age_days', 'SECURITY', '90', 'INTEGER', 'Password expiry in days', 'SYSTEM'),
    ('system.session.timeout_minutes', 'SECURITY', '30', 'INTEGER', 'Session timeout', 'SYSTEM'),
    ('system.mfa.required', 'SECURITY', 'true', 'BOOLEAN', 'MFA required for all users', 'SYSTEM'),
    ('system.eod.schedule', 'SCHEDULE', '0 0 23 * * *', 'CRON', 'End-of-day batch schedule', 'SYSTEM'),
    ('system.audit.retention_days', 'COMPLIANCE', '2555', 'INTEGER', '7 years audit retention', 'SYSTEM'),
    ('limit.single_transfer.default', 'LIMIT', '1000000', 'DECIMAL', 'Default single transfer limit', 'SYSTEM'),
    ('limit.daily_transfer.default', 'LIMIT', '5000000', 'DECIMAL', 'Default daily transfer limit', 'SYSTEM'),
    ('rate.penalty.late_payment', 'INTEREST_RATE', '2.0', 'DECIMAL', 'Late payment penalty rate %', 'SYSTEM'),
    ('fee.below_minimum_balance', 'FEE', '25.00', 'DECIMAL', 'Below minimum balance fee', 'SYSTEM'),
    ('threshold.ecl.significant_increase', 'THRESHOLD', '0.30', 'DECIMAL', 'ECL significant increase in credit risk', 'SYSTEM'),
    ('threshold.fraud.block_score', 'THRESHOLD', '85', 'INTEGER', 'Fraud score threshold for auto-block', 'SYSTEM')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Cap 54: Internet Banking Portal (enhancement)
-- ============================================================
CREATE TABLE IF NOT EXISTS internet_banking_session (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          VARCHAR(80)  NOT NULL UNIQUE,
    customer_id         BIGINT       NOT NULL,
    device_fingerprint  VARCHAR(200),
    ip_address          VARCHAR(50),
    user_agent          TEXT,
    login_method        VARCHAR(20)  NOT NULL
                        CHECK (login_method IN ('PASSWORD','BIOMETRIC','SSO','SOCIAL','FIDO2','PASSWORDLESS')),
    mfa_completed       BOOLEAN      NOT NULL DEFAULT FALSE,
    session_status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (session_status IN ('ACTIVE','IDLE','EXPIRED','TERMINATED','LOCKED')),
    last_activity_at    TIMESTAMP    NOT NULL DEFAULT now(),
    idle_timeout_min    INT          NOT NULL DEFAULT 15,
    absolute_timeout_min INT         NOT NULL DEFAULT 480,
    login_at            TIMESTAMP    NOT NULL DEFAULT now(),
    logout_at           TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internet_banking_feature (
    id                  BIGSERIAL PRIMARY KEY,
    feature_code        VARCHAR(80)  NOT NULL UNIQUE,
    feature_name        VARCHAR(200) NOT NULL,
    feature_category    VARCHAR(30)  NOT NULL
                        CHECK (feature_category IN ('ACCOUNTS','PAYMENTS','TRANSFERS','CARDS',
                               'LOANS','INVESTMENTS','BILLS','SETTINGS','SUPPORT','ANALYTICS')),
    description         TEXT,
    requires_mfa        BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_sca        BOOLEAN      NOT NULL DEFAULT FALSE,
    daily_limit         NUMERIC(20,4),
    is_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
    allowed_segments    JSONB,        -- customer segments that can access this feature
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_ib_session_customer ON internet_banking_session(customer_id, session_status);

-- Seed: internet banking features
INSERT INTO internet_banking_feature (feature_code, feature_name, feature_category, requires_mfa, requires_sca, is_enabled)
VALUES
    ('IB-ACCT-VIEW',      'View Account Summary',      'ACCOUNTS',    FALSE, FALSE, TRUE),
    ('IB-ACCT-STMT',      'Download Statement',        'ACCOUNTS',    FALSE, FALSE, TRUE),
    ('IB-PAY-DOMESTIC',   'Domestic Payment',           'PAYMENTS',    TRUE,  TRUE,  TRUE),
    ('IB-PAY-INTL',       'International Transfer',     'PAYMENTS',    TRUE,  TRUE,  TRUE),
    ('IB-PAY-BILL',       'Bill Payment',               'BILLS',       TRUE,  FALSE, TRUE),
    ('IB-PAY-STANDING',   'Standing Order Management',  'PAYMENTS',    TRUE,  FALSE, TRUE),
    ('IB-CARD-VIEW',      'View Card Details',          'CARDS',       FALSE, FALSE, TRUE),
    ('IB-CARD-FREEZE',    'Freeze/Unfreeze Card',       'CARDS',       TRUE,  FALSE, TRUE),
    ('IB-CARD-PIN',       'Change PIN',                 'CARDS',       TRUE,  TRUE,  TRUE),
    ('IB-CARD-LIMIT',     'Adjust Card Limits',         'CARDS',       TRUE,  FALSE, TRUE),
    ('IB-LOAN-APPLY',     'Apply for Loan',             'LOANS',       TRUE,  FALSE, TRUE),
    ('IB-LOAN-REPAY',     'Early Loan Repayment',       'LOANS',       TRUE,  TRUE,  TRUE),
    ('IB-INV-VIEW',       'View Investments',           'INVESTMENTS', FALSE, FALSE, TRUE),
    ('IB-INV-TRADE',      'Trade Securities',           'INVESTMENTS', TRUE,  TRUE,  TRUE),
    ('IB-SET-PROFILE',    'Update Profile',             'SETTINGS',    FALSE, FALSE, TRUE),
    ('IB-SET-PASSWORD',   'Change Password',            'SETTINGS',    TRUE,  FALSE, TRUE),
    ('IB-SET-MFA',        'MFA Enrollment',             'SETTINGS',    TRUE,  FALSE, TRUE),
    ('IB-SET-NOTIF',      'Notification Preferences',   'SETTINGS',    FALSE, FALSE, TRUE),
    ('IB-SUPPORT-CHAT',   'Live Chat Support',          'SUPPORT',     FALSE, FALSE, TRUE),
    ('IB-ANALYTICS-PFM',  'Personal Finance Manager',   'ANALYTICS',   FALSE, FALSE, TRUE)
ON CONFLICT (feature_code) DO NOTHING;
