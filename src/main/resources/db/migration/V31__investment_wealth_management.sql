SET search_path TO cbs;

-- V31: Investment & Wealth Management (BIAN Gap Remediation Batch 26)
-- Investment Portfolio, Wealth Management, Trust Services, Custody, Fund Management, Investment Planning

-- ============================================================
-- BIAN SD: Investment Portfolio Management + Planning
-- ============================================================
-- investment_portfolio already exists from V18; add missing columns for BIAN upgrade
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS customer_id BIGINT;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS portfolio_type VARCHAR(20);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS risk_profile VARCHAR(20);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS investment_objective VARCHAR(30);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS initial_investment NUMERIC(20,4);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS current_value NUMERIC(20,4) DEFAULT 0;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS total_contributions NUMERIC(20,4) DEFAULT 0;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS total_withdrawals NUMERIC(20,4) DEFAULT 0;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS unrealized_gain_loss NUMERIC(20,4) DEFAULT 0;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS realized_gain_loss_ytd NUMERIC(20,4) DEFAULT 0;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS target_allocation JSONB;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS current_allocation JSONB;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS rebalance_threshold_pct NUMERIC(5,2) DEFAULT 5.00;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS last_rebalanced_at TIMESTAMP;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS return_mtd_pct NUMERIC(8,4);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS return_ytd_pct NUMERIC(8,4);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS return_since_inception NUMERIC(8,4);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS benchmark_code VARCHAR(40);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS benchmark_return_ytd NUMERIC(8,4);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS management_fee_pct NUMERIC(6,4);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS performance_fee_pct NUMERIC(6,4);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS fees_charged_ytd NUMERIC(15,4) DEFAULT 0;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS portfolio_manager_id VARCHAR(80);
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS status VARCHAR(15) DEFAULT 'ACTIVE';
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
ALTER TABLE investment_portfolio ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_inv_portfolio_customer ON investment_portfolio(customer_id, status);

CREATE TABLE IF NOT EXISTS portfolio_holding (
    id                      BIGSERIAL PRIMARY KEY,
    portfolio_id            BIGINT       NOT NULL REFERENCES investment_portfolio(id),
    instrument_id           BIGINT,     -- FK to financial_instrument
    instrument_code         VARCHAR(30)  NOT NULL,
    instrument_name         VARCHAR(300) NOT NULL,
    asset_class             VARCHAR(20)  NOT NULL,
    quantity                NUMERIC(20,6) NOT NULL,
    avg_cost_price          NUMERIC(20,6) NOT NULL,
    current_price           NUMERIC(20,6),
    market_value            NUMERIC(20,4),
    cost_basis              NUMERIC(20,4),
    unrealized_gain_loss    NUMERIC(20,4),
    weight_pct              NUMERIC(6,2),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    last_priced_at          TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_holding_portfolio ON portfolio_holding(portfolio_id);

-- ============================================================
-- BIAN SD: Wealth Management (Customer Investment Portfolio Mgmt)
-- ============================================================
CREATE TABLE IF NOT EXISTS wealth_management_plan (
    id                      BIGSERIAL PRIMARY KEY,
    plan_code               VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    plan_type               VARCHAR(20)  NOT NULL
                            CHECK (plan_type IN ('COMPREHENSIVE','RETIREMENT','ESTATE','TAX',
                                   'EDUCATION','SUCCESSION','PHILANTHROPY')),
    advisor_id              VARCHAR(80),
    -- Financial profile
    total_net_worth         NUMERIC(20,4),
    total_investable_assets NUMERIC(20,4),
    annual_income           NUMERIC(20,4),
    tax_bracket_pct         NUMERIC(5,2),
    retirement_target_age   INT,
    retirement_income_goal  NUMERIC(20,4),
    -- Goals
    financial_goals         JSONB,      -- [{"goal":"Retirement","target":2000000,"horizon_years":20}]
    -- Strategy
    recommended_allocation  JSONB,
    insurance_needs         JSONB,
    estate_plan_summary     TEXT,
    tax_strategy            TEXT,
    -- Status
    next_review_date        DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','ACTIVE','UNDER_REVIEW','SUSPENDED','CLOSED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_wealth_plan_customer ON wealth_management_plan(customer_id, status);

-- ============================================================
-- BIAN SD: Trust Services
-- ============================================================
CREATE TABLE IF NOT EXISTS trust_account (
    id                      BIGSERIAL PRIMARY KEY,
    trust_code              VARCHAR(30)  NOT NULL UNIQUE,
    trust_name              VARCHAR(200) NOT NULL,
    trust_type              VARCHAR(20)  NOT NULL
                            CHECK (trust_type IN ('REVOCABLE','IRREVOCABLE','TESTAMENTARY','CHARITABLE',
                                   'SPECIAL_NEEDS','SPENDTHRIFT','CONSTRUCTIVE','PENSION_TRUST')),
    grantor_customer_id     BIGINT       NOT NULL,
    trustee_type            VARCHAR(20)  NOT NULL
                            CHECK (trustee_type IN ('BANK_SOLE','BANK_CO','INDIVIDUAL','CORPORATE')),
    trustee_name            VARCHAR(200) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    corpus_value            NUMERIC(20,4) NOT NULL DEFAULT 0,
    income_ytd              NUMERIC(20,4) DEFAULT 0,
    distributions_ytd       NUMERIC(20,4) DEFAULT 0,
    -- Beneficiaries
    beneficiaries           JSONB,      -- [{"name":"John Doe","type":"PRIMARY","share_pct":50}]
    distribution_rules      JSONB,      -- {"frequency":"QUARTERLY","type":"INCOME_ONLY"}
    -- Governance
    investment_policy       TEXT,
    annual_fee_pct          NUMERIC(6,4),
    tax_id                  VARCHAR(40),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED','REVOKED')),
    inception_date          DATE         NOT NULL,
    termination_date        DATE,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- BIAN SD: Custody Services (Securities Safekeeping)
-- ============================================================
CREATE TABLE IF NOT EXISTS custody_account (
    id                      BIGSERIAL PRIMARY KEY,
    account_code            VARCHAR(30)  NOT NULL UNIQUE,
    account_name            VARCHAR(200) NOT NULL,
    customer_id             BIGINT       NOT NULL,
    account_type            VARCHAR(20)  NOT NULL
                            CHECK (account_type IN ('GLOBAL_CUSTODY','SUB_CUSTODY','SAFEKEEPING',
                                   'NOMINEE','SETTLEMENT','CASH_COLLATERAL')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    total_assets_value      NUMERIC(20,4) DEFAULT 0,
    securities_count        INT          DEFAULT 0,
    -- Services
    settlement_enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    corporate_actions       BOOLEAN      NOT NULL DEFAULT TRUE,
    income_collection       BOOLEAN      NOT NULL DEFAULT TRUE,
    proxy_voting            BOOLEAN      NOT NULL DEFAULT FALSE,
    tax_reclaim             BOOLEAN      NOT NULL DEFAULT FALSE,
    fx_services             BOOLEAN      NOT NULL DEFAULT FALSE,
    securities_lending      BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Fees
    custody_fee_bps         INT          DEFAULT 0,  -- basis points on AUM
    transaction_fee         NUMERIC(12,4),
    -- Status
    sub_custodian           VARCHAR(200),
    depository_id           VARCHAR(40),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','CLOSED')),
    opened_at               TIMESTAMP,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_custody_customer ON custody_account(customer_id, status);

-- ============================================================
-- BIAN SD: Fund Management (Mutual Fund Administration)
-- ============================================================
CREATE TABLE IF NOT EXISTS managed_fund (
    id                      BIGSERIAL PRIMARY KEY,
    fund_code               VARCHAR(30)  NOT NULL UNIQUE,
    fund_name               VARCHAR(200) NOT NULL,
    fund_type               VARCHAR(20)  NOT NULL
                            CHECK (fund_type IN ('EQUITY_FUND','BOND_FUND','MONEY_MARKET','BALANCED',
                                   'INDEX_FUND','ETF','HEDGE_FUND','REAL_ESTATE','SHARIA_FUND','PENSION_FUND')),
    fund_manager            VARCHAR(200) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    -- NAV
    nav_per_unit            NUMERIC(15,6) NOT NULL DEFAULT 0,
    total_units_outstanding NUMERIC(20,6) DEFAULT 0,
    total_aum               NUMERIC(20,4) DEFAULT 0,  -- Assets Under Management
    nav_date                DATE,
    -- Performance
    return_1m_pct           NUMERIC(8,4),
    return_3m_pct           NUMERIC(8,4),
    return_6m_pct           NUMERIC(8,4),
    return_1y_pct           NUMERIC(8,4),
    return_3y_annualized    NUMERIC(8,4),
    return_since_inception  NUMERIC(8,4),
    benchmark_code          VARCHAR(40),
    -- Fees
    management_fee_pct      NUMERIC(6,4),
    entry_load_pct          NUMERIC(5,2) DEFAULT 0,
    exit_load_pct           NUMERIC(5,2) DEFAULT 0,
    expense_ratio_pct       NUMERIC(6,4),
    -- Risk
    standard_deviation      NUMERIC(8,4),
    sharpe_ratio            NUMERIC(8,4),
    beta                    NUMERIC(8,4),
    -- Classification
    risk_rating             INT          CHECK (risk_rating BETWEEN 1 AND 7),
    morningstar_rating      INT          CHECK (morningstar_rating BETWEEN 1 AND 5),
    is_sharia_compliant     BOOLEAN      NOT NULL DEFAULT FALSE,
    min_investment          NUMERIC(15,4),
    -- Status
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','CLOSED','LIQUIDATING')),
    launch_date             DATE,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_managed_fund_type ON managed_fund(fund_type, status);
