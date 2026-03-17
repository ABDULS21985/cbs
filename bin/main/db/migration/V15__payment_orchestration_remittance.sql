-- V15__payment_orchestration_remittance.sql
-- Capabilities 34-35: Payment Orchestration Layer, Cross-Border Remittances

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 34: PAYMENT ORCHESTRATION LAYER
-- ============================================================

CREATE TABLE payment_rail (
    id                      BIGSERIAL PRIMARY KEY,
    rail_code               VARCHAR(20) NOT NULL UNIQUE,
    rail_name               VARCHAR(100) NOT NULL,
    rail_type               VARCHAR(30) NOT NULL CHECK (rail_type IN (
                                'INSTANT','ACH','RTGS','SWIFT','MOBILE_MONEY','CARD_NETWORK',
                                'INTERNAL','WALLET','QR','BLOCKCHAIN')),
    provider                VARCHAR(50),
    -- Capabilities
    supported_currencies    JSONB NOT NULL DEFAULT '["USD"]',
    supported_countries     JSONB NOT NULL DEFAULT '["*"]',
    max_amount              NUMERIC(18,2),
    min_amount              NUMERIC(18,2) DEFAULT 0,
    -- Cost
    flat_fee                NUMERIC(18,2) DEFAULT 0,
    percentage_fee          NUMERIC(8,4) DEFAULT 0,
    fee_currency            VARCHAR(3) DEFAULT 'USD',
    -- Speed
    settlement_speed        VARCHAR(20) NOT NULL CHECK (settlement_speed IN (
                                'REAL_TIME','SAME_DAY','NEXT_DAY','T_PLUS_2','T_PLUS_3','VARIABLE')),
    avg_processing_ms       INT,
    -- Availability
    operating_hours         VARCHAR(200) DEFAULT '24/7',
    is_available            BOOLEAN NOT NULL DEFAULT TRUE,
    uptime_pct              NUMERIC(5,2) DEFAULT 99.9,
    last_health_check       TIMESTAMP WITH TIME ZONE,
    -- Priority
    priority_rank           INT NOT NULL DEFAULT 100,
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE payment_routing_rule (
    id                      BIGSERIAL PRIMARY KEY,
    rule_name               VARCHAR(100) NOT NULL,
    rule_priority           INT NOT NULL DEFAULT 100,
    -- Match criteria
    source_country          VARCHAR(3),
    destination_country     VARCHAR(3),
    currency_code           VARCHAR(3),
    min_amount              NUMERIC(18,2),
    max_amount              NUMERIC(18,2),
    payment_type            VARCHAR(30),
    channel                 VARCHAR(20),
    customer_segment        VARCHAR(30),
    -- Routing
    preferred_rail_code     VARCHAR(20) NOT NULL REFERENCES payment_rail(rail_code),
    fallback_rail_code      VARCHAR(20) REFERENCES payment_rail(rail_code),
    -- Optimization
    optimize_for            VARCHAR(20) NOT NULL DEFAULT 'COST'
                                CHECK (optimize_for IN ('COST','SPEED','AVAILABILITY','COMPLIANCE')),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to            DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_routing_rule_priority ON payment_routing_rule(rule_priority);

CREATE TABLE payment_routing_log (
    id                      BIGSERIAL PRIMARY KEY,
    payment_ref             VARCHAR(50) NOT NULL,
    -- Request
    source_country          VARCHAR(3),
    destination_country     VARCHAR(3),
    currency_code           VARCHAR(3) NOT NULL,
    amount                  NUMERIC(18,2) NOT NULL,
    payment_type            VARCHAR(30),
    -- Decision
    selected_rail_code      VARCHAR(20) NOT NULL,
    fallback_used           BOOLEAN NOT NULL DEFAULT FALSE,
    routing_rule_id         BIGINT,
    optimization_reason     VARCHAR(200),
    -- Cost
    estimated_fee           NUMERIC(18,2),
    estimated_speed         VARCHAR(20),
    -- Candidates evaluated
    candidates_evaluated    INT NOT NULL DEFAULT 0,
    -- Timing
    routing_time_ms         INT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routing_log_payment ON payment_routing_log(payment_ref);

-- ============================================================
-- CAPABILITY 35: CROSS-BORDER REMITTANCES
-- ============================================================

CREATE TABLE remittance_corridor (
    id                      BIGSERIAL PRIMARY KEY,
    corridor_code           VARCHAR(20) NOT NULL UNIQUE,
    source_country          VARCHAR(3) NOT NULL,
    destination_country     VARCHAR(3) NOT NULL,
    source_currency         VARCHAR(3) NOT NULL REFERENCES currency(code),
    destination_currency    VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Pricing
    flat_fee                NUMERIC(18,2) NOT NULL DEFAULT 0,
    percentage_fee          NUMERIC(8,4) NOT NULL DEFAULT 0,
    fee_cap                 NUMERIC(18,2),
    fx_markup_pct           NUMERIC(8,4) DEFAULT 0,
    -- Limits
    min_amount              NUMERIC(18,2) DEFAULT 0,
    max_amount              NUMERIC(18,2),
    daily_limit             NUMERIC(18,2),
    monthly_limit           NUMERIC(18,2),
    -- Compliance
    requires_purpose_code   BOOLEAN NOT NULL DEFAULT FALSE,
    requires_source_of_funds BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_purpose_codes   JSONB DEFAULT '[]',
    -- Rails
    preferred_rail_code     VARCHAR(20) REFERENCES payment_rail(rail_code),
    settlement_days         INT NOT NULL DEFAULT 2,
    -- IMTO
    imto_partner_code       VARCHAR(30),
    imto_partner_name       VARCHAR(100),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(source_country, destination_country)
);

CREATE INDEX idx_corridor_route ON remittance_corridor(source_country, destination_country);

CREATE TABLE remittance_beneficiary (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    beneficiary_name        VARCHAR(200) NOT NULL,
    beneficiary_country     VARCHAR(3) NOT NULL,
    beneficiary_city        VARCHAR(100),
    -- Bank details
    bank_name               VARCHAR(200),
    bank_code               VARCHAR(20),
    bank_swift_code         VARCHAR(11),
    account_number          VARCHAR(34),
    iban                    VARCHAR(34),
    -- Mobile wallet
    mobile_number           VARCHAR(20),
    mobile_provider         VARCHAR(30),
    -- Identification
    id_type                 VARCHAR(30),
    id_number               VARCHAR(50),
    relationship            VARCHAR(50),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_rem_bene_customer ON remittance_beneficiary(customer_id);

CREATE TABLE remittance_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    remittance_ref          VARCHAR(30) NOT NULL UNIQUE,
    -- Parties
    sender_customer_id      BIGINT NOT NULL REFERENCES customer(id),
    sender_account_id       BIGINT REFERENCES account(id),
    beneficiary_id          BIGINT NOT NULL REFERENCES remittance_beneficiary(id),
    corridor_id             BIGINT NOT NULL REFERENCES remittance_corridor(id),
    -- Source
    source_amount           NUMERIC(18,2) NOT NULL,
    source_currency         VARCHAR(3) NOT NULL,
    -- Destination
    destination_amount      NUMERIC(18,2) NOT NULL,
    destination_currency    VARCHAR(3) NOT NULL,
    -- FX
    fx_rate                 NUMERIC(18,8) NOT NULL,
    fx_markup               NUMERIC(18,2) DEFAULT 0,
    -- Fees
    flat_fee                NUMERIC(18,2) NOT NULL DEFAULT 0,
    percentage_fee          NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_fee               NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_debit_amount      NUMERIC(18,2) NOT NULL,
    -- Compliance
    purpose_code            VARCHAR(10),
    purpose_description     VARCHAR(200),
    source_of_funds         VARCHAR(100),
    sanctions_check_ref     VARCHAR(50),
    sanctions_check_status  VARCHAR(20) DEFAULT 'PENDING',
    -- Rail
    payment_rail_code       VARCHAR(20),
    partner_ref             VARCHAR(50),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'INITIATED'
                                CHECK (status IN ('INITIATED','COMPLIANCE_CHECK','PROCESSING',
                                    'SENT','DELIVERED','COMPLETED','RETURNED','CANCELLED','FAILED')),
    status_message          VARCHAR(300),
    -- Timing
    initiated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at                 TIMESTAMP WITH TIME ZONE,
    delivered_at            TIMESTAMP WITH TIME ZONE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_rem_txn_sender ON remittance_transaction(sender_customer_id);
CREATE INDEX idx_rem_txn_status ON remittance_transaction(status);
CREATE INDEX idx_rem_txn_ref ON remittance_transaction(remittance_ref);

CREATE SEQUENCE remittance_seq START WITH 1 INCREMENT BY 1;
