SET search_path TO cbs;

-- =====================================================
-- V34: Risk Models & Compliance Extensions (Batch 28)
-- =====================================================

-- 1. Financial Statement Assessment
CREATE TABLE IF NOT EXISTS financial_statement (
    id                      BIGSERIAL PRIMARY KEY,
    statement_code          VARCHAR(30)    NOT NULL UNIQUE,
    customer_id             BIGINT         NOT NULL,
    statement_type          VARCHAR(20)    NOT NULL CHECK (statement_type IN ('BALANCE_SHEET','INCOME_STATEMENT','CASH_FLOW','TRIAL_BALANCE','CONSOLIDATED','INTERIM','AUDITED','MANAGEMENT_ACCOUNTS')),
    reporting_period        VARCHAR(10)    NOT NULL CHECK (reporting_period IN ('MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL')),
    period_start_date       DATE           NOT NULL,
    period_end_date         DATE           NOT NULL,
    currency                VARCHAR(3)     NOT NULL DEFAULT 'USD',
    total_assets            NUMERIC(20,4),
    total_liabilities       NUMERIC(20,4),
    total_equity            NUMERIC(20,4),
    current_assets          NUMERIC(20,4),
    current_liabilities     NUMERIC(20,4),
    total_revenue           NUMERIC(20,4),
    cost_of_revenue         NUMERIC(20,4),
    gross_profit            NUMERIC(20,4),
    operating_income        NUMERIC(20,4),
    net_income              NUMERIC(20,4),
    ebitda                  NUMERIC(20,4),
    operating_cash_flow     NUMERIC(20,4),
    investing_cash_flow     NUMERIC(20,4),
    financing_cash_flow     NUMERIC(20,4),
    net_cash_flow           NUMERIC(20,4),
    auditor_name            VARCHAR(200),
    audit_opinion           VARCHAR(20)    CHECK (audit_opinion IN ('UNQUALIFIED','QUALIFIED','ADVERSE','DISCLAIMER','UNAUDITED')),
    source_document_ref     VARCHAR(200),
    notes                   TEXT,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','VERIFIED','APPROVED','REJECTED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_finstmt_customer ON financial_statement(customer_id, period_end_date DESC);

-- 2. Statement Ratio (standalone, immutable)
CREATE TABLE IF NOT EXISTS statement_ratio (
    id                      BIGSERIAL PRIMARY KEY,
    statement_id            BIGINT         NOT NULL REFERENCES financial_statement(id),
    ratio_category          VARCHAR(20)    NOT NULL CHECK (ratio_category IN ('LIQUIDITY','SOLVENCY','PROFITABILITY','EFFICIENCY','LEVERAGE','COVERAGE')),
    ratio_name              VARCHAR(60)    NOT NULL,
    ratio_value             NUMERIC(12,4)  NOT NULL,
    benchmark_value         NUMERIC(12,4),
    rating                  VARCHAR(10)    CHECK (rating IN ('EXCELLENT','GOOD','ADEQUATE','WEAK','CRITICAL')),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    UNIQUE(statement_id, ratio_name)
);

CREATE INDEX idx_stmtratio_stmt ON statement_ratio(statement_id);

-- 3. Compliance Report
CREATE TABLE IF NOT EXISTS compliance_report (
    id                          BIGSERIAL PRIMARY KEY,
    report_code                 VARCHAR(30)    NOT NULL UNIQUE,
    report_name                 VARCHAR(200)   NOT NULL,
    report_type                 VARCHAR(30)    NOT NULL CHECK (report_type IN ('STATUTORY_RETURN','PRUDENTIAL_REPORT','AML_CTF_REPORT','LIQUIDITY_REPORT','CAPITAL_ADEQUACY','LARGE_EXPOSURE','RISK_ASSESSMENT','CONSUMER_COMPLAINT','FRAUD_REPORT','TAX_FILING')),
    regulator                   VARCHAR(30)    NOT NULL CHECK (regulator IN ('CBN','NDIC','SEC','NAICOM','FIRS','NFIU','FRC','PENCOM','CUSTOM')),
    reporting_period            VARCHAR(10)    NOT NULL CHECK (reporting_period IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL','AD_HOC')),
    period_start_date           DATE           NOT NULL,
    period_end_date             DATE           NOT NULL,
    due_date                    DATE           NOT NULL,
    submission_date             DATE,
    report_data                 JSONB,
    file_reference              VARCHAR(200),
    prepared_by                 VARCHAR(80),
    reviewed_by                 VARCHAR(80),
    reviewed_at                 TIMESTAMP,
    submission_reference        VARCHAR(80),
    regulator_acknowledgement   VARCHAR(200),
    status                      VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_PROGRESS','PREPARED','REVIEWED','SUBMITTED','ACCEPTED','REJECTED','OVERDUE')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

CREATE INDEX idx_comprpt_regulator ON compliance_report(regulator, status, due_date);

-- 4. Guideline Assessment
CREATE TABLE IF NOT EXISTS guideline_assessment (
    id                      BIGSERIAL PRIMARY KEY,
    assessment_code         VARCHAR(30)    NOT NULL UNIQUE,
    guideline_name          VARCHAR(300)   NOT NULL,
    guideline_source        VARCHAR(30)    NOT NULL CHECK (guideline_source IN ('CBN','NDIC','BASEL','FATF','ISO_27001','PCI_DSS','NIST','SOX','INTERNAL_POLICY','INDUSTRY_STANDARD')),
    guideline_reference     VARCHAR(100),
    assessment_type         VARCHAR(20)    NOT NULL CHECK (assessment_type IN ('SELF_ASSESSMENT','INTERNAL_AUDIT','EXTERNAL_AUDIT','REGULATOR_EXAM','GAP_ANALYSIS','CONTINUOUS_MONITORING')),
    assessment_date         DATE           NOT NULL,
    assessor                VARCHAR(200),
    total_controls          INT            NOT NULL DEFAULT 0,
    compliant_controls      INT            NOT NULL DEFAULT 0,
    partially_compliant     INT            NOT NULL DEFAULT 0,
    non_compliant           INT            NOT NULL DEFAULT 0,
    not_applicable          INT            NOT NULL DEFAULT 0,
    compliance_score_pct    NUMERIC(5,2),
    overall_rating          VARCHAR(15)    CHECK (overall_rating IN ('FULLY_COMPLIANT','SUBSTANTIALLY_COMPLIANT','PARTIALLY_COMPLIANT','NON_COMPLIANT','NOT_ASSESSED')),
    findings                JSONB,
    remediation_plan        JSONB,
    next_assessment_date    DATE,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','CLOSED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_gdlnassmt_source ON guideline_assessment(guideline_source, assessment_date DESC);

-- 5. Customer Behavior Model
CREATE TABLE IF NOT EXISTS customer_behavior_model (
    id                      BIGSERIAL PRIMARY KEY,
    model_code              VARCHAR(30)    NOT NULL UNIQUE,
    customer_id             BIGINT         NOT NULL,
    model_type              VARCHAR(25)    NOT NULL CHECK (model_type IN ('CHURN_PREDICTION','CROSS_SELL_PROPENSITY','CREDIT_BEHAVIOR','CHANNEL_PREFERENCE','LIFECYCLE_STAGE','CLV_PREDICTION','FRAUD_PROPENSITY','ENGAGEMENT_SCORE','DORMANCY_RISK','PRODUCT_AFFINITY')),
    model_version           VARCHAR(20)    NOT NULL,
    score                   NUMERIC(8,4)   NOT NULL,
    score_band              VARCHAR(20)    CHECK (score_band IN ('VERY_HIGH','HIGH','MEDIUM','LOW','VERY_LOW')),
    confidence_pct          NUMERIC(5,2),
    input_features          JSONB,
    feature_importance      JSONB,
    predicted_outcome       VARCHAR(60),
    predicted_probability   NUMERIC(6,4),
    recommended_action      VARCHAR(200),
    recommended_products    JSONB,
    scored_at               TIMESTAMP      NOT NULL DEFAULT now(),
    valid_until             DATE,
    is_current              BOOLEAN        NOT NULL DEFAULT TRUE,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_custbhvr_customer ON customer_behavior_model(customer_id, model_type, is_current);

-- 6. Market Analysis Report
CREATE TABLE IF NOT EXISTS market_analysis_report (
    id                      BIGSERIAL PRIMARY KEY,
    report_code             VARCHAR(30)    NOT NULL UNIQUE,
    report_name             VARCHAR(300)   NOT NULL,
    analysis_type           VARCHAR(25)    NOT NULL CHECK (analysis_type IN ('INTEREST_RATE','FX_OUTLOOK','MACRO_ECONOMIC','SECTOR_ANALYSIS','CREDIT_MARKET','EQUITY_MARKET','COMMODITY','REAL_ESTATE','REGULATORY_IMPACT','GEOPOLITICAL')),
    region                  VARCHAR(40)    NOT NULL DEFAULT 'NIGERIA',
    analysis_date           DATE           NOT NULL,
    analyst                 VARCHAR(200),
    executive_summary       TEXT           NOT NULL,
    key_findings            JSONB,
    data_points             JSONB,
    forecasts               JSONB,
    risk_factors            JSONB,
    recommendations         JSONB,
    data_sources            JSONB,
    confidence_level        VARCHAR(10)    CHECK (confidence_level IN ('HIGH','MEDIUM','LOW')),
    time_horizon            VARCHAR(15)    CHECK (time_horizon IN ('SHORT_TERM','MEDIUM_TERM','LONG_TERM')),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEWED','PUBLISHED','SUPERSEDED','ARCHIVED')),
    published_at            TIMESTAMP,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_mktanalysis_type ON market_analysis_report(analysis_type, analysis_date DESC);

-- 7. Competitor Profile
CREATE TABLE IF NOT EXISTS competitor_profile (
    id                      BIGSERIAL PRIMARY KEY,
    profile_code            VARCHAR(30)    NOT NULL UNIQUE,
    competitor_name         VARCHAR(200)   NOT NULL,
    competitor_type         VARCHAR(20)    NOT NULL CHECK (competitor_type IN ('COMMERCIAL_BANK','MICROFINANCE','FINTECH','MOBILE_MONEY','DIGITAL_BANK','INSURANCE','PENSION_FUND','NEOBANK','PAYMENT_PROVIDER')),
    country                 VARCHAR(3)     NOT NULL DEFAULT 'NGA',
    total_assets            NUMERIC(20,4),
    total_deposits          NUMERIC(20,4),
    total_loans             NUMERIC(20,4),
    branch_count            INT,
    customer_count          BIGINT,
    market_share_pct        NUMERIC(5,2),
    key_products            JSONB,
    pricing_intelligence    JSONB,
    digital_capabilities    JSONB,
    strengths               JSONB,
    weaknesses              JSONB,
    threat_level            VARCHAR(10)    DEFAULT 'MEDIUM' CHECK (threat_level IN ('HIGH','MEDIUM','LOW')),
    strategic_response      TEXT,
    last_updated_date       DATE,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','MERGED','ACQUIRED','LIQUIDATED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 8. Product Performance Snapshot
CREATE TABLE IF NOT EXISTS product_performance_snapshot (
    id                          BIGSERIAL PRIMARY KEY,
    snapshot_code               VARCHAR(30)    NOT NULL UNIQUE,
    product_code                VARCHAR(30)    NOT NULL,
    product_name                VARCHAR(200)   NOT NULL,
    product_family              VARCHAR(30)    NOT NULL,
    period_type                 VARCHAR(10)    NOT NULL CHECK (period_type IN ('MONTHLY','QUARTERLY','ANNUAL')),
    period_date                 DATE           NOT NULL,
    currency                    VARCHAR(3)     NOT NULL DEFAULT 'USD',
    active_accounts             INT            DEFAULT 0,
    new_accounts_period         INT            DEFAULT 0,
    closed_accounts_period      INT            DEFAULT 0,
    total_balance               NUMERIC(20,4)  DEFAULT 0,
    interest_income             NUMERIC(15,4)  DEFAULT 0,
    fee_income                  NUMERIC(15,4)  DEFAULT 0,
    total_revenue               NUMERIC(15,4)  DEFAULT 0,
    cost_of_funds               NUMERIC(15,4)  DEFAULT 0,
    operating_cost              NUMERIC(15,4)  DEFAULT 0,
    provision_charge            NUMERIC(15,4)  DEFAULT 0,
    net_margin                  NUMERIC(15,4)  DEFAULT 0,
    return_on_product_pct       NUMERIC(8,4),
    cost_to_income_pct          NUMERIC(8,4),
    npl_ratio_pct               NUMERIC(6,2)   DEFAULT 0,
    avg_risk_weight_pct         NUMERIC(6,2),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0,
    UNIQUE(product_code, period_type, period_date)
);

CREATE INDEX idx_prodperf_product ON product_performance_snapshot(product_code, period_date DESC);

-- 9. Quant Model
CREATE TABLE IF NOT EXISTS quant_model (
    id                      BIGSERIAL PRIMARY KEY,
    model_code              VARCHAR(30)    NOT NULL UNIQUE,
    model_name              VARCHAR(200)   NOT NULL,
    model_type              VARCHAR(25)    NOT NULL CHECK (model_type IN ('CREDIT_SCORING','PD_MODEL','LGD_MODEL','EAD_MODEL','VAR_MODEL','PRICING_MODEL','STRESS_TEST','PREPAYMENT','CHURN','FRAUD_DETECTION','AML_SCORING','CLV','SEGMENTATION')),
    model_category          VARCHAR(20)    NOT NULL CHECK (model_category IN ('REGULATORY','INTERNAL','COMMERCIAL','RESEARCH')),
    methodology             VARCHAR(30)    CHECK (methodology IN ('LOGISTIC_REGRESSION','RANDOM_FOREST','GRADIENT_BOOSTING','NEURAL_NETWORK','LINEAR_REGRESSION','TIME_SERIES','MONTE_CARLO','EXPERT_SYSTEM','ENSEMBLE','BAYESIAN')),
    model_version           VARCHAR(20)    NOT NULL,
    description             TEXT,
    developer               VARCHAR(200),
    owner                   VARCHAR(200),
    last_validated_at       TIMESTAMP,
    validation_result       VARCHAR(15)    CHECK (validation_result IN ('APPROVED','CONDITIONALLY_APPROVED','REJECTED','PENDING','EXPIRED')),
    validation_report_ref   VARCHAR(200),
    accuracy_pct            NUMERIC(6,2),
    auc_roc                 NUMERIC(6,4),
    gini_coefficient        NUMERIC(6,4),
    ks_statistic            NUMERIC(6,4),
    r2_score                NUMERIC(6,4),
    mape_pct                NUMERIC(8,4),
    model_risk_tier         VARCHAR(10)    CHECK (model_risk_tier IN ('TIER_1','TIER_2','TIER_3')),
    regulatory_use          BOOLEAN        DEFAULT FALSE,
    next_review_date        DATE,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'DEVELOPMENT' CHECK (status IN ('DEVELOPMENT','VALIDATION','APPROVED','PRODUCTION','RETIRED','SUSPENDED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_quantmodel_type ON quant_model(model_type, status);

-- 10. Model Backtest (standalone, immutable)
CREATE TABLE IF NOT EXISTS model_backtest (
    id                          BIGSERIAL PRIMARY KEY,
    backtest_ref                VARCHAR(30)    NOT NULL UNIQUE,
    model_id                    BIGINT         NOT NULL REFERENCES quant_model(id),
    backtest_type               VARCHAR(20)    NOT NULL CHECK (backtest_type IN ('OUT_OF_SAMPLE','OUT_OF_TIME','STRESS_SCENARIO','BENCHMARK','CHAMPION_CHALLENGER','SENSITIVITY')),
    test_period_start           DATE           NOT NULL,
    test_period_end             DATE           NOT NULL,
    sample_size                 INT            NOT NULL,
    predicted_default_rate      NUMERIC(8,4),
    actual_default_rate         NUMERIC(8,4),
    accuracy_pct                NUMERIC(6,2),
    auc_roc                     NUMERIC(6,4),
    gini_coefficient            NUMERIC(6,4),
    ks_statistic                NUMERIC(6,4),
    var_95_pct                  NUMERIC(15,4),
    var_99_pct                  NUMERIC(15,4),
    breach_count                INT            DEFAULT 0,
    breach_pct                  NUMERIC(6,2)   DEFAULT 0,
    result_status               VARCHAR(15)    NOT NULL CHECK (result_status IN ('PASS','MARGINAL','FAIL','INCONCLUSIVE')),
    findings                    TEXT,
    recommendations             TEXT,
    run_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_backtest_model ON model_backtest(model_id, run_at DESC);
