-- V17__card_tokenisation_dispute.sql
-- Capabilities 37, 40: Virtual/Tokenised Cards, Dispute & Chargeback Management

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 37: VIRTUAL & TOKENISED CARDS
-- ============================================================

CREATE TABLE card_token (
    id                      BIGSERIAL PRIMARY KEY,
    token_ref               VARCHAR(30) NOT NULL UNIQUE,
    card_id                 BIGINT NOT NULL REFERENCES card(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    -- Token
    token_number_hash       VARCHAR(64) NOT NULL,
    token_number_suffix     VARCHAR(4) NOT NULL,
    token_requestor_id      VARCHAR(20),
    -- Wallet
    wallet_provider         VARCHAR(20) NOT NULL CHECK (wallet_provider IN (
                                'APPLE_PAY','GOOGLE_PAY','SAMSUNG_PAY','GARMIN_PAY',
                                'FITBIT_PAY','MERCHANT_TOKEN','ISSUER_TOKEN','COF_TOKEN')),
    device_name             VARCHAR(100),
    device_id               VARCHAR(100),
    device_type             VARCHAR(20) CHECK (device_type IN ('PHONE','WATCH','TABLET','BROWSER','IOT','OTHER')),
    -- Lifecycle
    status                  VARCHAR(20) NOT NULL DEFAULT 'REQUESTED'
                                CHECK (status IN ('REQUESTED','ACTIVE','SUSPENDED','DEACTIVATED','EXPIRED')),
    activated_at            TIMESTAMP WITH TIME ZONE,
    suspended_at            TIMESTAMP WITH TIME ZONE,
    suspend_reason          VARCHAR(200),
    deactivated_at          TIMESTAMP WITH TIME ZONE,
    deactivation_reason     VARCHAR(200),
    -- Validity
    token_expiry_date       DATE,
    last_used_at            TIMESTAMP WITH TIME ZONE,
    transaction_count       INT NOT NULL DEFAULT 0,
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_card_token_card ON card_token(card_id);
CREATE INDEX idx_card_token_customer ON card_token(customer_id);
CREATE INDEX idx_card_token_status ON card_token(status);

-- ============================================================
-- CAPABILITY 40: DISPUTE & CHARGEBACK MANAGEMENT
-- ============================================================

CREATE TABLE card_dispute (
    id                      BIGSERIAL PRIMARY KEY,
    dispute_ref             VARCHAR(30) NOT NULL UNIQUE,
    card_id                 BIGINT NOT NULL REFERENCES card(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    account_id              BIGINT NOT NULL REFERENCES account(id),
    transaction_id          BIGINT REFERENCES card_transaction(id),
    -- Transaction details
    transaction_ref         VARCHAR(50),
    transaction_date        DATE NOT NULL,
    transaction_amount      NUMERIC(18,2) NOT NULL,
    transaction_currency    VARCHAR(3) NOT NULL,
    merchant_name           VARCHAR(200),
    merchant_id             VARCHAR(30),
    -- Dispute
    dispute_type            VARCHAR(30) NOT NULL CHECK (dispute_type IN (
                                'FRAUD','MERCHANDISE_NOT_RECEIVED','DEFECTIVE_MERCHANDISE',
                                'DUPLICATE_CHARGE','INCORRECT_AMOUNT','CANCELLED_RECURRING',
                                'NOT_RECOGNISED','SERVICE_NOT_PROVIDED','ATM_DISPUTE','OTHER')),
    dispute_reason          TEXT NOT NULL,
    dispute_amount          NUMERIC(18,2) NOT NULL,
    dispute_currency        VARCHAR(3) NOT NULL,
    -- Scheme
    card_scheme             VARCHAR(20) NOT NULL,
    scheme_case_id          VARCHAR(50),
    scheme_reason_code      VARCHAR(10),
    -- SLA (scheme-compliant timelines)
    filing_deadline         DATE NOT NULL,
    response_deadline       DATE,
    arbitration_deadline    DATE,
    is_sla_breached         BOOLEAN NOT NULL DEFAULT FALSE,
    -- Provisional credit
    provisional_credit_amount NUMERIC(18,2),
    provisional_credit_date DATE,
    provisional_credit_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    -- Evidence
    evidence_documents      JSONB DEFAULT '[]',
    merchant_response       TEXT,
    merchant_response_date  DATE,
    -- Resolution
    resolution_type         VARCHAR(20) CHECK (resolution_type IN (
                                'CUSTOMER_FAVOUR','MERCHANT_FAVOUR','SPLIT','WITHDRAWN','EXPIRED')),
    resolution_amount       NUMERIC(18,2),
    resolution_date         DATE,
    resolution_notes        TEXT,
    -- Status (scheme-compliant lifecycle)
    status                  VARCHAR(30) NOT NULL DEFAULT 'INITIATED'
                                CHECK (status IN ('INITIATED','INVESTIGATION','CHARGEBACK_FILED',
                                    'REPRESENTMENT','PRE_ARBITRATION','ARBITRATION',
                                    'RESOLVED_CUSTOMER','RESOLVED_MERCHANT','WITHDRAWN','EXPIRED')),
    -- Audit
    assigned_to             VARCHAR(100),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_dispute_card ON card_dispute(card_id);
CREATE INDEX idx_dispute_customer ON card_dispute(customer_id);
CREATE INDEX idx_dispute_status ON card_dispute(status);
CREATE INDEX idx_dispute_deadline ON card_dispute(filing_deadline) WHERE status IN ('INITIATED','INVESTIGATION');

CREATE TABLE dispute_timeline (
    id                      BIGSERIAL PRIMARY KEY,
    dispute_id              BIGINT NOT NULL REFERENCES card_dispute(id) ON DELETE CASCADE,
    action                  VARCHAR(50) NOT NULL,
    from_status             VARCHAR(30),
    to_status               VARCHAR(30) NOT NULL,
    performed_by            VARCHAR(100) NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispute_timeline ON dispute_timeline(dispute_id);

CREATE SEQUENCE dispute_seq START WITH 1 INCREMENT BY 1;
