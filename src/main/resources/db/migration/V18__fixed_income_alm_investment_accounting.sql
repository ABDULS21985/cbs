-- V18__fixed_income_alm_investment_accounting.sql
-- Capabilities 44-46: Fixed Income Portfolio, ALM, Investment Portfolio Accounting

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 44: FIXED INCOME & SECURITIES PORTFOLIO
-- ============================================================

CREATE TABLE security_holding (
    id                      BIGSERIAL PRIMARY KEY,
    holding_ref             VARCHAR(30) NOT NULL UNIQUE,
    security_type           VARCHAR(20) NOT NULL CHECK (security_type IN (
                                'TREASURY_BILL','GOVERNMENT_BOND','CORPORATE_BOND',
                                'SUKUK','COMMERCIAL_PAPER','CERTIFICATE_OF_DEPOSIT')),
    -- Security identity
    isin_code               VARCHAR(12),
    security_name           VARCHAR(200) NOT NULL,
    issuer_name             VARCHAR(200) NOT NULL,
    issuer_type             VARCHAR(20) CHECK (issuer_type IN ('SOVEREIGN','QUASI_SOVEREIGN','CORPORATE','SUPRANATIONAL','MUNICIPAL')),
    -- Position
    face_value              NUMERIC(18,2) NOT NULL,
    units                   NUMERIC(18,6) NOT NULL DEFAULT 1,
    purchase_price          NUMERIC(18,6) NOT NULL,
    purchase_yield          NUMERIC(8,4),
    clean_price             NUMERIC(18,6),
    dirty_price             NUMERIC(18,6),
    market_price            NUMERIC(18,6),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Coupon
    coupon_rate             NUMERIC(8,4) DEFAULT 0,
    coupon_frequency        VARCHAR(10) CHECK (coupon_frequency IN ('ZERO','ANNUAL','SEMI_ANNUAL','QUARTERLY','MONTHLY')),
    day_count_convention    VARCHAR(10) DEFAULT 'ACT/365',
    next_coupon_date        DATE,
    -- Dates
    purchase_date           DATE NOT NULL,
    settlement_date         DATE NOT NULL,
    maturity_date           DATE NOT NULL,
    -- Accrued interest
    accrued_interest        NUMERIC(18,4) NOT NULL DEFAULT 0,
    last_accrual_date       DATE,
    -- Amortisation
    amortised_cost          NUMERIC(18,2),
    premium_discount        NUMERIC(18,2) DEFAULT 0,
    cumulative_amortisation NUMERIC(18,2) DEFAULT 0,
    -- Mark-to-market
    mtm_value               NUMERIC(18,2),
    unrealised_gain_loss    NUMERIC(18,2) DEFAULT 0,
    last_mtm_date           DATE,
    -- Portfolio
    portfolio_code          VARCHAR(20),
    deal_id                 BIGINT REFERENCES treasury_deal(id),
    account_id              BIGINT REFERENCES account(id),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','MATURED','SOLD','CALLED','DEFAULTED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_sec_holding_type ON security_holding(security_type);
CREATE INDEX idx_sec_holding_maturity ON security_holding(maturity_date) WHERE status = 'ACTIVE';
CREATE INDEX idx_sec_holding_portfolio ON security_holding(portfolio_code);

CREATE TABLE coupon_payment (
    id                      BIGSERIAL PRIMARY KEY,
    holding_id              BIGINT NOT NULL REFERENCES security_holding(id),
    coupon_date             DATE NOT NULL,
    coupon_amount           NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PROJECTED'
                                CHECK (status IN ('PROJECTED','RECEIVED','MISSED')),
    received_date           DATE,
    journal_id              BIGINT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(holding_id, coupon_date)
);

CREATE INDEX idx_coupon_holding ON coupon_payment(holding_id);

-- ============================================================
-- CAPABILITY 45: ALM & INTEREST RATE RISK
-- ============================================================

CREATE TABLE alm_gap_report (
    id                      BIGSERIAL PRIMARY KEY,
    report_date             DATE NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    -- Buckets (JSONB array of time buckets with asset/liability/gap)
    buckets                 JSONB NOT NULL DEFAULT '[]',
    -- Summary
    total_rsa               NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_rsl               NUMERIC(18,2) NOT NULL DEFAULT 0,
    cumulative_gap          NUMERIC(18,2) NOT NULL DEFAULT 0,
    gap_ratio               NUMERIC(8,4),
    -- NII simulation
    nii_base                NUMERIC(18,2),
    nii_up_100bp            NUMERIC(18,2),
    nii_down_100bp          NUMERIC(18,2),
    nii_sensitivity         NUMERIC(18,2),
    -- EVE
    eve_base                NUMERIC(18,2),
    eve_up_200bp            NUMERIC(18,2),
    eve_down_200bp          NUMERIC(18,2),
    eve_sensitivity         NUMERIC(18,2),
    -- Duration
    weighted_avg_duration_assets  NUMERIC(8,4),
    weighted_avg_duration_liabs   NUMERIC(8,4),
    duration_gap            NUMERIC(8,4),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','FINAL','SUBMITTED')),
    generated_by            VARCHAR(100),
    approved_by             VARCHAR(100),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(report_date, currency_code)
);

CREATE INDEX idx_alm_gap_date ON alm_gap_report(report_date);

CREATE TABLE alm_scenario (
    id                      BIGSERIAL PRIMARY KEY,
    scenario_name           VARCHAR(100) NOT NULL,
    scenario_type           VARCHAR(20) NOT NULL CHECK (scenario_type IN ('PARALLEL','STEEPENER','FLATTENER','SHORT_UP','SHORT_DOWN','CUSTOM')),
    shift_bps               JSONB NOT NULL DEFAULT '{}',
    description             TEXT,
    is_regulatory           BOOLEAN NOT NULL DEFAULT FALSE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

-- ============================================================
-- CAPABILITY 46: INVESTMENT PORTFOLIO ACCOUNTING (IFRS 9)
-- ============================================================

CREATE TABLE investment_portfolio (
    id                      BIGSERIAL PRIMARY KEY,
    portfolio_code          VARCHAR(20) NOT NULL UNIQUE,
    portfolio_name          VARCHAR(100) NOT NULL,
    ifrs9_classification    VARCHAR(30) NOT NULL CHECK (ifrs9_classification IN (
                                'AMORTISED_COST','FVOCI','FVTPL')),
    business_model          VARCHAR(30) NOT NULL CHECK (business_model IN (
                                'HOLD_TO_COLLECT','HOLD_TO_COLLECT_AND_SELL','TRADING','OTHER')),
    -- GL mapping
    asset_gl_code           VARCHAR(20),
    income_gl_code          VARCHAR(20),
    unrealised_gl_code      VARCHAR(20),
    impairment_gl_code      VARCHAR(20),
    -- Limits
    max_portfolio_size      NUMERIC(18,2),
    max_single_issuer_pct   NUMERIC(5,2),
    max_single_security_pct NUMERIC(5,2),
    allowed_security_types  JSONB DEFAULT '[]',
    currency_code           VARCHAR(3) NOT NULL DEFAULT 'USD',
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE investment_valuation (
    id                      BIGSERIAL PRIMARY KEY,
    holding_id              BIGINT NOT NULL REFERENCES security_holding(id),
    portfolio_code          VARCHAR(20) NOT NULL,
    valuation_date          DATE NOT NULL,
    ifrs9_classification    VARCHAR(30) NOT NULL,
    -- Carrying value
    amortised_cost          NUMERIC(18,2) NOT NULL,
    fair_value              NUMERIC(18,2) NOT NULL,
    carrying_amount         NUMERIC(18,2) NOT NULL,
    -- P&L impact
    interest_income         NUMERIC(18,2) DEFAULT 0,
    amortisation_amount     NUMERIC(18,2) DEFAULT 0,
    unrealised_gain_loss    NUMERIC(18,2) DEFAULT 0,
    realised_gain_loss      NUMERIC(18,2) DEFAULT 0,
    -- ECL (for AMORTISED_COST and FVOCI)
    ecl_stage               INT CHECK (ecl_stage IN (1, 2, 3)),
    ecl_amount              NUMERIC(18,2) DEFAULT 0,
    ecl_movement            NUMERIC(18,2) DEFAULT 0,
    -- OCI (for FVOCI only)
    oci_reserve             NUMERIC(18,2) DEFAULT 0,
    oci_movement            NUMERIC(18,2) DEFAULT 0,
    -- Journal
    journal_id              BIGINT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(holding_id, valuation_date)
);

CREATE INDEX idx_inv_val_date ON investment_valuation(valuation_date);
CREATE INDEX idx_inv_val_portfolio ON investment_valuation(portfolio_code);
