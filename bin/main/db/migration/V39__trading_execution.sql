SET search_path TO cbs;

-- =====================================================
-- V39: Trading Execution & Market Making (Batch 33)
-- =====================================================

-- 1. Market Making Mandate
CREATE TABLE IF NOT EXISTS market_making_mandate (
    id                          BIGSERIAL PRIMARY KEY,
    mandate_code                VARCHAR(30)    NOT NULL UNIQUE,
    mandate_name                VARCHAR(200),
    instrument_type             VARCHAR(20)    NOT NULL CHECK (instrument_type IN ('FX_SPOT','FX_FORWARD','GOVERNMENT_BOND','CORPORATE_BOND','TBILL','EQUITY')),
    instrument_code             VARCHAR(30),
    exchange                    VARCHAR(60),
    mandate_type                VARCHAR(15)    NOT NULL CHECK (mandate_type IN ('DESIGNATED','VOLUNTARY','INTERBANK','PRIMARY_DEALER')),
    desk_id                     BIGINT         NOT NULL REFERENCES dealing_desk(id),
    quote_obligation            VARCHAR(15)    NOT NULL CHECK (quote_obligation IN ('CONTINUOUS','ON_REQUEST','SCHEDULED')),
    min_quote_size              NUMERIC(20,4),
    max_quote_size              NUMERIC(20,4),
    max_spread_bps              NUMERIC(8,2),
    min_quote_duration_seconds  INT,
    daily_quote_hours           INT,
    inventory_limit             NUMERIC(20,4),
    hedging_strategy            VARCHAR(20)    CHECK (hedging_strategy IN ('FULL_HEDGE','PARTIAL_HEDGE','DISCRETIONARY','NONE')),
    performance_metrics         JSONB,
    effective_from              DATE           NOT NULL,
    effective_to                DATE,
    regulatory_ref              VARCHAR(80),
    status                      VARCHAR(15)    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_APPROVAL','ACTIVE','SUSPENDED','TERMINATED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

-- 2. Market Making Activity (standalone, immutable daily log)
CREATE TABLE IF NOT EXISTS market_making_activity (
    id                          BIGSERIAL PRIMARY KEY,
    mandate_id                  BIGINT         NOT NULL REFERENCES market_making_mandate(id),
    activity_date               DATE           NOT NULL,
    quotes_published            INT            DEFAULT 0,
    quotes_hit                  INT            DEFAULT 0,
    fill_ratio_pct              NUMERIC(5,2),
    avg_bid_ask_spread_bps      NUMERIC(8,2),
    total_volume                NUMERIC(20,4),
    buy_volume                  NUMERIC(20,4),
    sell_volume                 NUMERIC(20,4),
    net_position                NUMERIC(20,4),
    realized_pnl                NUMERIC(20,4)  DEFAULT 0,
    unrealized_pnl              NUMERIC(20,4)  DEFAULT 0,
    inventory_turnover          NUMERIC(8,4),
    quoting_uptime_pct          NUMERIC(5,2),
    spread_violation_count      INT            DEFAULT 0,
    obligation_met              BOOLEAN        DEFAULT TRUE,
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    UNIQUE(mandate_id, activity_date)
);

-- 3. Market Order
CREATE TABLE IF NOT EXISTS market_order (
    id                          BIGSERIAL PRIMARY KEY,
    order_ref                   VARCHAR(30)    NOT NULL UNIQUE,
    order_source                VARCHAR(15)    NOT NULL CHECK (order_source IN ('CLIENT','DEALER','PROGRAM','INTERNAL','REBALANCE')),
    customer_id                 BIGINT,
    dealer_id                   VARCHAR(80),
    desk_id                     BIGINT         REFERENCES dealing_desk(id),
    portfolio_code              VARCHAR(30),
    order_type                  VARCHAR(20)    NOT NULL CHECK (order_type IN ('MARKET','LIMIT','STOP','STOP_LIMIT','FILL_OR_KILL','GOOD_TILL_CANCEL','GOOD_TILL_DATE','IMMEDIATE_OR_CANCEL')),
    side                        VARCHAR(4)     NOT NULL CHECK (side IN ('BUY','SELL')),
    instrument_type             VARCHAR(20)    NOT NULL,
    instrument_code             VARCHAR(30)    NOT NULL,
    instrument_name             VARCHAR(300),
    exchange                    VARCHAR(60),
    quantity                    NUMERIC(20,6)  NOT NULL,
    limit_price                 NUMERIC(20,8),
    stop_price                  NUMERIC(20,8),
    currency                    VARCHAR(3)     NOT NULL,
    time_in_force               VARCHAR(15)    NOT NULL DEFAULT 'DAY' CHECK (time_in_force IN ('DAY','GTC','GTD','IOC','FOK')),
    expiry_date                 DATE,
    filled_quantity             NUMERIC(20,6)  DEFAULT 0,
    avg_filled_price            NUMERIC(20,8),
    filled_amount               NUMERIC(20,4)  DEFAULT 0,
    remaining_quantity          NUMERIC(20,6),
    commission_amount           NUMERIC(15,4),
    commission_currency         VARCHAR(3),
    suitability_check_id        BIGINT,
    suitability_result          VARCHAR(10),
    validation_errors           JSONB,
    routed_to                   VARCHAR(60),
    routed_at                   TIMESTAMP,
    filled_at                   TIMESTAMP,
    cancelled_reason            TEXT,
    status                      VARCHAR(15)    NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','VALIDATED','ROUTED','PARTIALLY_FILLED','FILLED','CANCELLED','REJECTED','EXPIRED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

CREATE INDEX idx_mktord_status ON market_order(status, order_source);

-- 4. Order Execution (standalone, immutable fill log)
CREATE TABLE IF NOT EXISTS order_execution (
    id                          BIGSERIAL PRIMARY KEY,
    execution_ref               VARCHAR(30)    NOT NULL UNIQUE,
    order_id                    BIGINT         NOT NULL REFERENCES market_order(id),
    execution_type              VARCHAR(15)    NOT NULL CHECK (execution_type IN ('FULL_FILL','PARTIAL_FILL','CORRECTION','CANCELLATION','BUST')),
    execution_venue             VARCHAR(60)    NOT NULL CHECK (execution_venue IN ('NGX','FMDQ','NASD','OTC','INTERNAL_CROSS','INTERBANK')),
    execution_price             NUMERIC(20,8)  NOT NULL,
    execution_quantity          NUMERIC(20,6)  NOT NULL,
    execution_amount            NUMERIC(20,4)  NOT NULL,
    currency                    VARCHAR(3)     NOT NULL,
    counterparty_code           VARCHAR(30),
    counterparty_name           VARCHAR(200),
    commission_charged          NUMERIC(15,4),
    stamp_duty                  NUMERIC(15,4),
    levy_amount                 NUMERIC(15,4),
    net_settlement_amount       NUMERIC(20,4),
    trade_date                  DATE           NOT NULL,
    settlement_date             DATE           NOT NULL,
    settlement_cycle            VARCHAR(5)     CHECK (settlement_cycle IN ('T0','T1','T2','T3')),
    confirmation_ref            VARCHAR(30),
    executed_at                 TIMESTAMP      NOT NULL,
    reported_to_exchange        BOOLEAN        DEFAULT FALSE,
    reported_at                 TIMESTAMP,
    exchange_trade_id           VARCHAR(30),
    status                      VARCHAR(15)    NOT NULL DEFAULT 'EXECUTED' CHECK (status IN ('EXECUTED','CONFIRMED','REPORTED','SETTLED','BUSTED','CORRECTED')),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordexec_order ON order_execution(order_id, executed_at DESC);

-- 5. Execution Quality (standalone, immutable analysis)
CREATE TABLE IF NOT EXISTS execution_quality (
    id                          BIGSERIAL PRIMARY KEY,
    order_id                    BIGINT         NOT NULL REFERENCES market_order(id),
    benchmark_type              VARCHAR(20)    NOT NULL CHECK (benchmark_type IN ('ARRIVAL_PRICE','VWAP','TWAP','CLOSE_PRICE','OPEN_PRICE','MIDPOINT')),
    benchmark_price             NUMERIC(20,8)  NOT NULL,
    avg_execution_price         NUMERIC(20,8)  NOT NULL,
    slippage_bps                NUMERIC(8,2),
    implementation_shortfall    NUMERIC(20,4),
    market_impact_bps           NUMERIC(8,2),
    timing_cost_bps             NUMERIC(8,2),
    execution_duration_seconds  INT,
    fill_rate_pct               NUMERIC(5,2),
    number_of_fills             INT,
    analysis_date               DATE           NOT NULL,
    created_at                  TIMESTAMP      NOT NULL DEFAULT now()
);

-- 6. Trading Strategy
CREATE TABLE IF NOT EXISTS trading_strategy (
    id                          BIGSERIAL PRIMARY KEY,
    strategy_code               VARCHAR(30)    NOT NULL UNIQUE,
    strategy_name               VARCHAR(200)   NOT NULL,
    strategy_type               VARCHAR(25)    NOT NULL CHECK (strategy_type IN ('TWAP','VWAP','ICEBERG','BASKET','INDEX_REBALANCE','PAIRS','STATISTICAL_ARB','MOMENTUM','MEAN_REVERSION','SCHEDULED')),
    desk_id                     BIGINT         REFERENCES dealing_desk(id),
    instrument_scope            JSONB,
    execution_algorithm         VARCHAR(30)    CHECK (execution_algorithm IN ('TIME_SLICE','VOLUME_PARTICIPATION','IMPLEMENTATION_SHORTFALL','ARRIVAL_PRICE','CUSTOM')),
    parameters                  JSONB,
    risk_limits                 JSONB,
    pre_trade_checks            JSONB,
    approved_by                 VARCHAR(80),
    approval_date               DATE,
    model_risk_tier             VARCHAR(10)    CHECK (model_risk_tier IN ('TIER_1','TIER_2','TIER_3')),
    status                      VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ACTIVE','PAUSED','RETIRED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

-- 7. Program Execution
CREATE TABLE IF NOT EXISTS program_execution (
    id                          BIGSERIAL PRIMARY KEY,
    execution_ref               VARCHAR(30)    NOT NULL UNIQUE,
    strategy_id                 BIGINT         NOT NULL REFERENCES trading_strategy(id),
    execution_date              DATE           NOT NULL,
    parent_order_ref            VARCHAR(30),
    target_quantity             NUMERIC(20,6),
    target_amount               NUMERIC(20,4),
    executed_quantity            NUMERIC(20,6)  DEFAULT 0,
    executed_amount              NUMERIC(20,4)  DEFAULT 0,
    avg_execution_price         NUMERIC(20,8),
    benchmark_price             NUMERIC(20,8),
    slippage_bps                NUMERIC(8,2),
    child_order_count           INT            DEFAULT 0,
    completion_pct              NUMERIC(5,2)   DEFAULT 0,
    started_at                  TIMESTAMP,
    completed_at                TIMESTAMP,
    cancelled_reason            TEXT,
    status                      VARCHAR(15)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','EXECUTING','PAUSED','COMPLETED','PARTIALLY_COMPLETED','CANCELLED','FAILED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);
