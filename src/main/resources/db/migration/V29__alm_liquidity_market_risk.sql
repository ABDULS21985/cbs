-- V29: ALM / Liquidity / Market Risk (BIAN Gap Remediation Batch 24)
-- Full ALM, Liquidity Risk, Market Risk, Asset Securitization, Bank Portfolio, Treasury Analytics, Economic Capital

SET search_path TO cbs;

-- ============================================================
-- BIAN SD: Asset & Liability Management (full upgrade)
-- ============================================================
CREATE TABLE IF NOT EXISTS alm_position (
    id                      BIGSERIAL PRIMARY KEY,
    position_date           DATE         NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    time_bucket             VARCHAR(20)  NOT NULL
                            CHECK (time_bucket IN ('OVERNIGHT','1W','2W','1M','2M','3M','6M','9M','1Y','2Y','3Y','5Y','7Y','10Y','15Y','20Y','30Y','OVER_30Y')),
    -- Assets
    cash_and_equivalents    NUMERIC(20,4) DEFAULT 0,
    interbank_placements    NUMERIC(20,4) DEFAULT 0,
    securities_held         NUMERIC(20,4) DEFAULT 0,
    loans_and_advances      NUMERIC(20,4) DEFAULT 0,
    fixed_assets            NUMERIC(20,4) DEFAULT 0,
    other_assets            NUMERIC(20,4) DEFAULT 0,
    total_assets            NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Liabilities
    demand_deposits         NUMERIC(20,4) DEFAULT 0,
    term_deposits           NUMERIC(20,4) DEFAULT 0,
    interbank_borrowings    NUMERIC(20,4) DEFAULT 0,
    bonds_issued            NUMERIC(20,4) DEFAULT 0,
    other_liabilities       NUMERIC(20,4) DEFAULT 0,
    total_liabilities       NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Gap
    gap_amount              NUMERIC(20,4),  -- assets - liabilities
    cumulative_gap          NUMERIC(20,4),
    gap_ratio               NUMERIC(8,4),   -- gap / total assets
    -- Sensitivity
    nii_impact_up100bp      NUMERIC(15,4),  -- NII change if rates +100bp
    nii_impact_down100bp    NUMERIC(15,4),
    eve_impact_up200bp      NUMERIC(15,4),  -- EVE change if rates +200bp
    eve_impact_down200bp    NUMERIC(15,4),
    duration_assets         NUMERIC(8,4),
    duration_liabilities    NUMERIC(8,4),
    duration_gap            NUMERIC(8,4),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (position_date, currency, time_bucket)
);

-- ============================================================
-- BIAN SD: Liquidity Risk Models
-- ============================================================
CREATE TABLE IF NOT EXISTS liquidity_metric (
    id                      BIGSERIAL PRIMARY KEY,
    metric_date             DATE         NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    -- LCR (Liquidity Coverage Ratio - Basel III)
    hqla_level1             NUMERIC(20,4) DEFAULT 0,  -- cash, central bank reserves, govt bonds
    hqla_level2a            NUMERIC(20,4) DEFAULT 0,  -- GSE bonds, corporate IG bonds
    hqla_level2b            NUMERIC(20,4) DEFAULT 0,  -- corporate bonds, equities, RMBS
    total_hqla              NUMERIC(20,4) NOT NULL DEFAULT 0,
    net_cash_outflows_30d   NUMERIC(20,4) NOT NULL DEFAULT 0,
    lcr_ratio               NUMERIC(8,4),              -- must be >= 100%
    -- NSFR (Net Stable Funding Ratio)
    available_stable_funding NUMERIC(20,4) DEFAULT 0,
    required_stable_funding  NUMERIC(20,4) DEFAULT 0,
    nsfr_ratio              NUMERIC(8,4),              -- must be >= 100%
    -- Stress scenarios
    stress_lcr_moderate     NUMERIC(8,4),
    stress_lcr_severe       NUMERIC(8,4),
    survival_days_moderate  INT,
    survival_days_severe    INT,
    -- Concentration
    top10_depositor_pct     NUMERIC(6,2),  -- concentration risk
    wholesale_funding_pct   NUMERIC(6,2),
    -- Limits
    lcr_limit               NUMERIC(8,4) DEFAULT 100.0,
    nsfr_limit              NUMERIC(8,4) DEFAULT 100.0,
    lcr_breach              BOOLEAN      NOT NULL DEFAULT FALSE,
    nsfr_breach             BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (metric_date, currency)
);

-- ============================================================
-- BIAN SD: Market Risk Models
-- ============================================================
CREATE TABLE IF NOT EXISTS market_risk_position (
    id                      BIGSERIAL PRIMARY KEY,
    position_date           DATE         NOT NULL,
    risk_type               VARCHAR(20)  NOT NULL
                            CHECK (risk_type IN ('INTEREST_RATE','FX','EQUITY','COMMODITY','CREDIT_SPREAD','VOLATILITY')),
    portfolio               VARCHAR(60)  NOT NULL,  -- BANKING_BOOK, TRADING_BOOK, etc.
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    -- VaR
    var_1d_95               NUMERIC(15,4),  -- 1-day 95% VaR
    var_1d_99               NUMERIC(15,4),  -- 1-day 99% VaR
    var_10d_99              NUMERIC(15,4),  -- 10-day 99% VaR (regulatory)
    var_method              VARCHAR(20)  DEFAULT 'HISTORICAL'
                            CHECK (var_method IN ('HISTORICAL','PARAMETRIC','MONTE_CARLO','FILTERED_HISTORICAL')),
    -- Stress testing
    stress_loss_moderate    NUMERIC(15,4),
    stress_loss_severe      NUMERIC(15,4),
    stress_scenario         VARCHAR(60),
    -- Sensitivities (Greeks)
    delta                   NUMERIC(15,4),  -- first-order rate sensitivity
    gamma                   NUMERIC(15,4),  -- second-order
    vega                    NUMERIC(15,4),  -- volatility sensitivity
    theta                   NUMERIC(15,4),  -- time decay
    rho                     NUMERIC(15,4),  -- rate sensitivity
    -- Limits
    var_limit               NUMERIC(15,4),
    var_utilization_pct     NUMERIC(6,2),
    limit_breach            BOOLEAN      NOT NULL DEFAULT FALSE,
    -- P&L
    daily_pnl               NUMERIC(15,4),
    mtd_pnl                 NUMERIC(15,4),
    ytd_pnl                 NUMERIC(15,4),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (position_date, risk_type, portfolio, currency)
);

-- ============================================================
-- BIAN SD: Asset Securitization
-- ============================================================
CREATE TABLE IF NOT EXISTS securitization_vehicle (
    id                      BIGSERIAL PRIMARY KEY,
    vehicle_code            VARCHAR(30)  NOT NULL UNIQUE,
    vehicle_name            VARCHAR(200) NOT NULL,
    vehicle_type            VARCHAR(20)  NOT NULL
                            CHECK (vehicle_type IN ('RMBS','CMBS','ABS','CLO','CDO','COVERED_BOND','WHOLE_LOAN')),
    underlying_asset_type   VARCHAR(30)  NOT NULL
                            CHECK (underlying_asset_type IN ('MORTGAGE','AUTO_LOAN','CREDIT_CARD','STUDENT_LOAN',
                                   'COMMERCIAL_LOAN','TRADE_RECEIVABLE','LEASE','CONSUMER_LOAN')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    total_pool_balance      NUMERIC(20,4) NOT NULL,
    number_of_assets        INT          NOT NULL,
    weighted_avg_coupon     NUMERIC(6,4),
    weighted_avg_maturity   NUMERIC(8,2),  -- months
    -- Tranches
    tranches                JSONB,  -- [{"name":"A","rating":"AAA","amount":800000000,"coupon":3.5},{"name":"B",...}]
    total_issued            NUMERIC(20,4),
    credit_enhancement_pct  NUMERIC(6,2),  -- subordination + overcollateralization
    -- Performance
    delinquency_30d_pct     NUMERIC(6,2) DEFAULT 0,
    delinquency_60d_pct     NUMERIC(6,2) DEFAULT 0,
    delinquency_90d_pct     NUMERIC(6,2) DEFAULT 0,
    cumulative_loss_pct     NUMERIC(6,2) DEFAULT 0,
    prepayment_rate_cpr     NUMERIC(6,2) DEFAULT 0,  -- Conditional Prepayment Rate
    -- Status
    status                  VARCHAR(15)  NOT NULL DEFAULT 'STRUCTURING'
                            CHECK (status IN ('STRUCTURING','RATED','MARKETING','ISSUED','AMORTIZING','CALLED','MATURED')),
    issue_date              DATE,
    maturity_date           DATE,
    trustee_name            VARCHAR(200),
    rating_agency           VARCHAR(40),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- BIAN SD: Bank Portfolio Administration + Analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_portfolio (
    id                      BIGSERIAL PRIMARY KEY,
    portfolio_code          VARCHAR(30)  NOT NULL UNIQUE,
    portfolio_name          VARCHAR(200) NOT NULL,
    portfolio_type          VARCHAR(20)  NOT NULL
                            CHECK (portfolio_type IN ('BANKING_BOOK','TRADING_BOOK','INVESTMENT','TREASURY',
                                   'LIQUIDITY_BUFFER','HELD_TO_MATURITY','AVAILABLE_FOR_SALE')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    total_value             NUMERIC(20,4) NOT NULL DEFAULT 0,
    unrealized_pnl          NUMERIC(15,4) DEFAULT 0,
    realized_pnl_ytd        NUMERIC(15,4) DEFAULT 0,
    yield_to_maturity       NUMERIC(8,4),
    modified_duration       NUMERIC(8,4),
    convexity               NUMERIC(8,4),
    credit_spread_bps       INT,
    var_99_1d               NUMERIC(15,4),
    benchmark               VARCHAR(60),
    tracking_error_bps      INT,
    asset_count             INT          DEFAULT 0,
    last_rebalanced_at      TIMESTAMP,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','FROZEN','LIQUIDATING','CLOSED')),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- BIAN SD: Corporate Treasury Analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS treasury_analytics_snapshot (
    id                      BIGSERIAL PRIMARY KEY,
    snapshot_date           DATE         NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    -- Funding
    total_deposits          NUMERIC(20,4),
    total_borrowings        NUMERIC(20,4),
    cost_of_funds_pct       NUMERIC(6,4),
    weighted_avg_tenor_days INT,
    -- Yield
    total_earning_assets    NUMERIC(20,4),
    yield_on_assets_pct     NUMERIC(6,4),
    net_interest_margin_pct NUMERIC(6,4),
    interest_spread_pct     NUMERIC(6,4),
    -- Ratios
    loan_to_deposit_ratio   NUMERIC(6,2),
    capital_adequacy_ratio  NUMERIC(6,2),
    tier1_ratio             NUMERIC(6,2),
    leverage_ratio          NUMERIC(6,2),
    return_on_assets_pct    NUMERIC(6,4),
    return_on_equity_pct    NUMERIC(6,4),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (snapshot_date, currency)
);

-- ============================================================
-- BIAN SD: Economic Capital
-- ============================================================
CREATE TABLE IF NOT EXISTS economic_capital (
    id                      BIGSERIAL PRIMARY KEY,
    calc_date               DATE         NOT NULL,
    risk_type               VARCHAR(20)  NOT NULL
                            CHECK (risk_type IN ('CREDIT','MARKET','OPERATIONAL','LIQUIDITY','CONCENTRATION',
                                   'STRATEGIC','REPUTATIONAL','TOTAL')),
    confidence_level        NUMERIC(6,4) NOT NULL DEFAULT 99.90,
    time_horizon_days       INT          NOT NULL DEFAULT 365,
    -- Capital
    regulatory_capital      NUMERIC(20,4),
    economic_capital        NUMERIC(20,4) NOT NULL,
    available_capital       NUMERIC(20,4),
    capital_surplus_deficit  NUMERIC(20,4),
    -- Components
    expected_loss           NUMERIC(20,4),
    unexpected_loss         NUMERIC(20,4),
    stress_capital_add_on   NUMERIC(20,4),
    -- Allocation
    business_unit           VARCHAR(60),
    allocated_capital       NUMERIC(20,4),
    raroc_pct               NUMERIC(8,4),  -- Risk-Adjusted Return On Capital
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (calc_date, risk_type, business_unit)
);

CREATE INDEX idx_alm_position ON alm_position(position_date, currency);
CREATE INDEX idx_liquidity ON liquidity_metric(metric_date, currency);
CREATE INDEX idx_market_risk ON market_risk_position(position_date, risk_type);
