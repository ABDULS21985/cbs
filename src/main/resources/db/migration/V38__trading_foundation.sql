SET search_path TO cbs;

-- =====================================================
-- Batch 32: Trading Foundation (Wave 4)
-- =====================================================

-- dealing_desk
CREATE TABLE IF NOT EXISTS dealing_desk (
    id                      BIGSERIAL PRIMARY KEY,
    desk_code               VARCHAR(20) NOT NULL UNIQUE,
    desk_name               VARCHAR(200) NOT NULL,
    desk_type               VARCHAR(20) NOT NULL
        CHECK (desk_type IN ('FX_SPOT','FX_FORWARD','FIXED_INCOME','MONEY_MARKET','DERIVATIVES','EQUITY','COMMODITY','STRUCTURED_PRODUCTS','PROPRIETARY','ALM')),
    head_dealer_name        VARCHAR(200),
    head_dealer_employee_id VARCHAR(80),
    location                VARCHAR(100),
    timezone                VARCHAR(40) DEFAULT 'Africa/Lagos',
    trading_hours_start     TIME,
    trading_hours_end       TIME,
    trading_days            JSONB,
    supported_instruments   JSONB,
    supported_currencies    JSONB,
    max_open_position_limit NUMERIC(20,4),
    max_single_trade_limit  NUMERIC(20,4),
    daily_var_limit         NUMERIC(20,4),
    stop_loss_limit         NUMERIC(20,4),
    pnl_currency            VARCHAR(3) DEFAULT 'USD',
    status                  VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- desk_dealer
CREATE TABLE IF NOT EXISTS desk_dealer (
    id                      BIGSERIAL PRIMARY KEY,
    desk_id                 BIGINT NOT NULL REFERENCES dealing_desk(id),
    employee_id             VARCHAR(80) NOT NULL,
    dealer_name             VARCHAR(200) NOT NULL,
    dealer_role             VARCHAR(20) NOT NULL
        CHECK (dealer_role IN ('HEAD_DEALER','SENIOR_DEALER','DEALER','JUNIOR_DEALER','TRAINEE')),
    authorized_instruments  JSONB,
    single_trade_limit      NUMERIC(20,4),
    daily_volume_limit      NUMERIC(20,4),
    requires_counter_sign   BOOLEAN DEFAULT FALSE,
    counter_sign_threshold  NUMERIC(20,4),
    status                  VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','ON_LEAVE','SUSPENDED','REVOKED')),
    authorized_from         DATE NOT NULL,
    authorized_to           DATE,
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dskdlr_desk ON desk_dealer(desk_id, status);

-- desk_pnl (standalone immutable)
CREATE TABLE IF NOT EXISTS desk_pnl (
    id                      BIGSERIAL PRIMARY KEY,
    desk_id                 BIGINT NOT NULL REFERENCES dealing_desk(id),
    pnl_date                DATE NOT NULL,
    currency                VARCHAR(3) NOT NULL DEFAULT 'USD',
    realized_pnl            NUMERIC(20,4) DEFAULT 0,
    unrealized_pnl          NUMERIC(20,4) DEFAULT 0,
    total_pnl               NUMERIC(20,4) DEFAULT 0,
    mtd_pnl                 NUMERIC(20,4) DEFAULT 0,
    ytd_pnl                 NUMERIC(20,4) DEFAULT 0,
    trading_revenue         NUMERIC(20,4) DEFAULT 0,
    hedging_cost            NUMERIC(20,4) DEFAULT 0,
    funding_cost            NUMERIC(20,4) DEFAULT 0,
    position_count          INT DEFAULT 0,
    trade_count             INT DEFAULT 0,
    total_volume            NUMERIC(20,4) DEFAULT 0,
    var_utilization_pct     NUMERIC(5,2),
    stop_loss_breached      BOOLEAN DEFAULT FALSE,
    status                  VARCHAR(15) NOT NULL DEFAULT 'PROVISIONAL'
        CHECK (status IN ('PROVISIONAL','VERIFIED','FINAL')),
    UNIQUE(desk_id, pnl_date),
    created_at              TIMESTAMP NOT NULL DEFAULT now()
);

-- price_quote
CREATE TABLE IF NOT EXISTS price_quote (
    id                      BIGSERIAL PRIMARY KEY,
    quote_ref               VARCHAR(30) NOT NULL UNIQUE,
    desk_id                 BIGINT REFERENCES dealing_desk(id),
    dealer_id               VARCHAR(80) NOT NULL,
    quote_type              VARCHAR(15) NOT NULL
        CHECK (quote_type IN ('INDICATIVE','FIRM','REQUEST_FOR_QUOTE','EXECUTABLE')),
    instrument_type         VARCHAR(20) NOT NULL
        CHECK (instrument_type IN ('FX_SPOT','FX_FORWARD','FX_SWAP','IRS','BOND','TBILL','REPO','COMMERCIAL_PAPER')),
    instrument_code         VARCHAR(30),
    currency_pair           VARCHAR(7),
    tenor                   VARCHAR(10),
    bid_price               NUMERIC(20,8) NOT NULL,
    ask_price               NUMERIC(20,8) NOT NULL,
    mid_price               NUMERIC(20,8),
    spread_bps              NUMERIC(8,2),
    notional_amount         NUMERIC(20,4),
    currency                VARCHAR(3) NOT NULL,
    counterparty_code       VARCHAR(30),
    counterparty_name       VARCHAR(200),
    valid_from_time         TIMESTAMP NOT NULL DEFAULT now(),
    valid_until_time        TIMESTAMP,
    is_auto_generated       BOOLEAN DEFAULT FALSE,
    pricing_model           VARCHAR(30),
    market_data_ref         VARCHAR(30),
    status                  VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','EXPIRED','ACCEPTED','REJECTED','CANCELLED','TRADED')),
    traded_ref              VARCHAR(30),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_prcqt_desk ON price_quote(desk_id, status);

-- quote_request
CREATE TABLE IF NOT EXISTS quote_request (
    id                      BIGSERIAL PRIMARY KEY,
    request_ref             VARCHAR(30) NOT NULL UNIQUE,
    requestor_type          VARCHAR(15) NOT NULL
        CHECK (requestor_type IN ('CUSTOMER','INTERBANK','INTERNAL','BROKER')),
    requestor_id            VARCHAR(80),
    requestor_name          VARCHAR(200),
    instrument_type         VARCHAR(20) NOT NULL,
    currency_pair           VARCHAR(7),
    tenor                   VARCHAR(10),
    amount                  NUMERIC(20,4) NOT NULL,
    direction               VARCHAR(10) NOT NULL
        CHECK (direction IN ('BUY','SELL','TWO_WAY')),
    requested_at            TIMESTAMP NOT NULL DEFAULT now(),
    response_deadline       TIMESTAMP,
    assigned_desk_id        BIGINT REFERENCES dealing_desk(id),
    assigned_dealer_id      VARCHAR(80),
    quotes_provided         INT DEFAULT 0,
    selected_quote_id       BIGINT,
    status                  VARCHAR(15) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','QUOTED','ACCEPTED','EXPIRED','CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- trader_position
CREATE TABLE IF NOT EXISTS trader_position (
    id                      BIGSERIAL PRIMARY KEY,
    position_ref            VARCHAR(30) NOT NULL UNIQUE,
    dealer_id               VARCHAR(80) NOT NULL,
    dealer_name             VARCHAR(200) NOT NULL,
    desk_id                 BIGINT NOT NULL REFERENCES dealing_desk(id),
    instrument_type         VARCHAR(20) NOT NULL,
    instrument_code         VARCHAR(30) NOT NULL,
    instrument_name         VARCHAR(300),
    currency                VARCHAR(3) NOT NULL,
    long_quantity           NUMERIC(20,6) DEFAULT 0,
    short_quantity          NUMERIC(20,6) DEFAULT 0,
    net_quantity            NUMERIC(20,6) DEFAULT 0,
    avg_cost_long           NUMERIC(20,8),
    avg_cost_short          NUMERIC(20,8),
    market_price            NUMERIC(20,8),
    market_value            NUMERIC(20,4),
    unrealized_pnl          NUMERIC(20,4) DEFAULT 0,
    realized_pnl_today      NUMERIC(20,4) DEFAULT 0,
    trader_position_limit   NUMERIC(20,4),
    limit_utilization_pct   NUMERIC(5,2),
    limit_breached          BOOLEAN DEFAULT FALSE,
    position_date           DATE NOT NULL,
    last_trade_at           TIMESTAMP,
    status                  VARCHAR(15) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','FLAT','LIMIT_BREACH','SUSPENDED')),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    version BIGINT DEFAULT 0,
    UNIQUE(dealer_id, instrument_code, position_date)
);
CREATE INDEX IF NOT EXISTS idx_trdpos_dealer ON trader_position(dealer_id, position_date DESC);

-- trader_position_limit
CREATE TABLE IF NOT EXISTS trader_position_limit (
    id                      BIGSERIAL PRIMARY KEY,
    dealer_id               VARCHAR(80) NOT NULL,
    limit_type              VARCHAR(20) NOT NULL
        CHECK (limit_type IN ('GROSS_POSITION','NET_POSITION','SINGLE_INSTRUMENT','VAR','STOP_LOSS_DAILY','STOP_LOSS_MONTHLY','OVERNIGHT','INTRADAY')),
    instrument_type         VARCHAR(20),
    currency                VARCHAR(3) DEFAULT 'USD',
    limit_amount            NUMERIC(20,4) NOT NULL,
    warning_threshold_pct   NUMERIC(5,2) DEFAULT 80,
    current_utilization     NUMERIC(20,4) DEFAULT 0,
    utilization_pct         NUMERIC(5,2) DEFAULT 0,
    last_breach_date        DATE,
    breach_count            INT DEFAULT 0,
    approved_by             VARCHAR(80),
    effective_from          DATE NOT NULL,
    effective_to            DATE,
    status                  VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','WARNING','BREACHED','SUSPENDED','EXPIRED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trdlim_dealer ON trader_position_limit(dealer_id, status);

-- trading_book
CREATE TABLE IF NOT EXISTS trading_book (
    id                      BIGSERIAL PRIMARY KEY,
    book_code               VARCHAR(20) NOT NULL UNIQUE,
    book_name               VARCHAR(200) NOT NULL,
    book_type               VARCHAR(20) NOT NULL
        CHECK (book_type IN ('FX','RATES','CREDIT','EQUITY','COMMODITY','STRUCTURED','ALM','BANKING_BOOK')),
    desk_id                 BIGINT REFERENCES dealing_desk(id),
    base_currency           VARCHAR(3) NOT NULL DEFAULT 'USD',
    regulatory_classification VARCHAR(20) NOT NULL
        CHECK (regulatory_classification IN ('TRADING_BOOK','BANKING_BOOK')),
    position_count          INT DEFAULT 0,
    gross_position_value    NUMERIC(20,4) DEFAULT 0,
    net_position_value      NUMERIC(20,4) DEFAULT 0,
    daily_pnl               NUMERIC(20,4) DEFAULT 0,
    mtd_pnl                 NUMERIC(20,4) DEFAULT 0,
    ytd_pnl                 NUMERIC(20,4) DEFAULT 0,
    var_amount              NUMERIC(20,4),
    var_limit               NUMERIC(20,4),
    var_utilization_pct     NUMERIC(5,2),
    stress_test_loss        NUMERIC(20,4),
    capital_requirement     NUMERIC(20,4),
    last_valuation_at       TIMESTAMP,
    status                  VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- trading_book_snapshot (standalone immutable)
CREATE TABLE IF NOT EXISTS trading_book_snapshot (
    id                      BIGSERIAL PRIMARY KEY,
    book_id                 BIGINT NOT NULL REFERENCES trading_book(id),
    snapshot_date           DATE NOT NULL,
    snapshot_type           VARCHAR(10) NOT NULL
        CHECK (snapshot_type IN ('EOD','INTRADAY','STRESS_TEST')),
    position_count          INT,
    gross_position_value    NUMERIC(20,4),
    net_position_value      NUMERIC(20,4),
    realized_pnl            NUMERIC(20,4),
    unrealized_pnl          NUMERIC(20,4),
    total_pnl               NUMERIC(20,4),
    var95_1d                NUMERIC(20,4),
    var99_1d                NUMERIC(20,4),
    expected_shortfall      NUMERIC(20,4),
    greeks                  JSONB,
    concentration_by_instrument  JSONB,
    concentration_by_currency    JSONB,
    concentration_by_counterparty JSONB,
    limit_breaches          JSONB,
    capital_charge          NUMERIC(20,4),
    UNIQUE(book_id, snapshot_date, snapshot_type),
    created_at              TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tbsnap_book ON trading_book_snapshot(book_id, snapshot_date DESC);

-- trading_model
CREATE TABLE IF NOT EXISTS trading_model (
    id                      BIGSERIAL PRIMARY KEY,
    model_code              VARCHAR(30) NOT NULL UNIQUE,
    model_name              VARCHAR(200) NOT NULL,
    model_purpose           VARCHAR(25) NOT NULL
        CHECK (model_purpose IN ('PRICING','HEDGING','EXECUTION','RISK_MEASUREMENT','MARKET_MAKING','SIGNAL_GENERATION','PORTFOLIO_OPTIMIZATION','CURVE_CONSTRUCTION')),
    instrument_scope        VARCHAR(20) NOT NULL
        CHECK (instrument_scope IN ('FX','RATES','CREDIT','EQUITY','COMMODITY','MULTI_ASSET')),
    methodology             VARCHAR(30)
        CHECK (methodology IN ('BLACK_SCHOLES','BINOMIAL','MONTE_CARLO','FINITE_DIFFERENCE','HULL_WHITE','SABR','HESTON','GARCH','COPULA','MACHINE_LEARNING','CUSTOM')),
    model_version           VARCHAR(20) NOT NULL,
    description             TEXT,
    input_parameters        JSONB,
    output_metrics          JSONB,
    assumptions             JSONB,
    limitations             TEXT,
    calibration_frequency   VARCHAR(15)
        CHECK (calibration_frequency IN ('REAL_TIME','DAILY','WEEKLY','MONTHLY','ON_DEMAND')),
    last_calibrated_at      TIMESTAMP,
    calibration_quality     VARCHAR(10)
        CHECK (calibration_quality IN ('EXCELLENT','GOOD','ACCEPTABLE','POOR')),
    model_owner             VARCHAR(200),
    developer               VARCHAR(200),
    last_validated_at       TIMESTAMP,
    validation_result       VARCHAR(15)
        CHECK (validation_result IN ('APPROVED','CONDITIONALLY_APPROVED','REJECTED','PENDING')),
    model_risk_tier         VARCHAR(10)
        CHECK (model_risk_tier IN ('TIER_1','TIER_2','TIER_3')),
    regulatory_use          BOOLEAN DEFAULT FALSE,
    production_deployed_at  TIMESTAMP,
    performance_metrics     JSONB,
    next_review_date        DATE,
    status                  VARCHAR(15) NOT NULL DEFAULT 'DEVELOPMENT'
        CHECK (status IN ('DEVELOPMENT','TESTING','VALIDATION','APPROVED','PRODUCTION','SUSPENDED','RETIRED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trdmodel_type ON trading_model(model_purpose, status);
