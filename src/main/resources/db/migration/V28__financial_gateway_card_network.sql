-- V28: Financial Gateway & Card Network (BIAN Gap Remediation Batch 23)
-- SWIFT Gateway, Card Clearing/Settlement, ACH, Central Cash, Message Analysis, Merchant Acquiring, Card Network

SET search_path TO cbs;

-- ============================================================
-- BIAN SD: Financial Gateway (SWIFT MX/MT)
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_gateway (
    id                      BIGSERIAL PRIMARY KEY,
    gateway_code            VARCHAR(30)  NOT NULL UNIQUE,
    gateway_name            VARCHAR(200) NOT NULL,
    gateway_type            VARCHAR(20)  NOT NULL
                            CHECK (gateway_type IN ('SWIFT','RTGS','ACH','CARD_NETWORK','INSTANT_PAYMENT','CROSS_BORDER','DOMESTIC')),
    protocol                VARCHAR(20)  NOT NULL
                            CHECK (protocol IN ('SWIFT_FIN','SWIFT_INTERACT','ISO20022_MX','PAIN_XML','EBICS','API_REST','FTP_BATCH')),
    bic_code                VARCHAR(11),
    endpoint_url            VARCHAR(500),
    auth_method             VARCHAR(20)  NOT NULL DEFAULT 'CERTIFICATE'
                            CHECK (auth_method IN ('CERTIFICATE','HSM','API_KEY','OAUTH2','MTLS')),
    encryption_standard     VARCHAR(20)  DEFAULT 'TLS_1_3',
    -- Connectivity
    primary_connection      VARCHAR(200),
    backup_connection       VARCHAR(200),
    connection_status       VARCHAR(15)  NOT NULL DEFAULT 'CONNECTED'
                            CHECK (connection_status IN ('CONNECTED','DISCONNECTED','DEGRADED','MAINTENANCE')),
    last_heartbeat_at       TIMESTAMP,
    -- Limits
    daily_volume_limit      INT,
    daily_value_limit       NUMERIC(20,4),
    messages_today          INT          DEFAULT 0,
    value_today             NUMERIC(20,4) DEFAULT 0,
    -- Status
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gateway_message (
    id                      BIGSERIAL PRIMARY KEY,
    message_ref             VARCHAR(80)  NOT NULL UNIQUE,
    gateway_id              BIGINT       NOT NULL REFERENCES financial_gateway(id),
    direction               VARCHAR(10)  NOT NULL CHECK (direction IN ('OUTBOUND','INBOUND')),
    message_type            VARCHAR(30)  NOT NULL,  -- MT103, pacs.008, pain.001, etc.
    message_format          VARCHAR(15)  NOT NULL
                            CHECK (message_format IN ('MT','MX','ISO20022','PROPRIETARY')),
    sender_bic              VARCHAR(11),
    receiver_bic            VARCHAR(11),
    amount                  NUMERIC(20,4),
    currency                VARCHAR(3),
    value_date              DATE,
    -- Processing
    validation_status       VARCHAR(15)  DEFAULT 'PENDING'
                            CHECK (validation_status IN ('PENDING','VALID','FAILED','REPAIRED')),
    sanctions_checked       BOOLEAN      NOT NULL DEFAULT FALSE,
    sanctions_result        VARCHAR(15),
    -- Delivery
    delivery_status         VARCHAR(20)  NOT NULL DEFAULT 'QUEUED'
                            CHECK (delivery_status IN ('QUEUED','SENT','ACKNOWLEDGED','REJECTED','FAILED','TIMEOUT','NACKED')),
    delivery_attempts       INT          DEFAULT 0,
    ack_reference           VARCHAR(80),
    nack_reason             TEXT,
    -- Timing
    queued_at               TIMESTAMP    NOT NULL DEFAULT now(),
    sent_at                 TIMESTAMP,
    ack_at                  TIMESTAMP,
    processing_time_ms      INT,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateway_msg_status ON gateway_message(gateway_id, delivery_status, queued_at DESC);

-- ============================================================
-- BIAN SD: Card Clearing + Card Financial Settlement
-- ============================================================
CREATE TABLE IF NOT EXISTS card_clearing_batch (
    id                      BIGSERIAL PRIMARY KEY,
    batch_id                VARCHAR(30)  NOT NULL UNIQUE,
    network                 VARCHAR(20)  NOT NULL
                            CHECK (network IN ('VISA','MASTERCARD','AMEX','DISCOVER','UNIONPAY','JCB','VERVE','INTERSWITCH')),
    batch_type              VARCHAR(20)  NOT NULL
                            CHECK (batch_type IN ('CLEARING','SETTLEMENT','CHARGEBACK','REPRESENTMENT','FEE','ADJUSTMENT')),
    clearing_date           DATE         NOT NULL,
    settlement_date         DATE,
    currency                VARCHAR(3)   NOT NULL,
    total_transactions      INT          NOT NULL DEFAULT 0,
    total_amount            NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_fees              NUMERIC(15,4) DEFAULT 0,
    interchange_amount      NUMERIC(15,4) DEFAULT 0,
    net_settlement_amount   NUMERIC(20,4),
    file_reference          VARCHAR(200),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED'
                            CHECK (status IN ('RECEIVED','VALIDATING','MATCHED','EXCEPTIONS','SETTLED','REJECTED','RECONCILED')),
    exception_count         INT          DEFAULT 0,
    reconciled_at           TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_settlement_position (
    id                      BIGSERIAL PRIMARY KEY,
    settlement_date         DATE         NOT NULL,
    network                 VARCHAR(20)  NOT NULL,
    counterparty_bic        VARCHAR(11),
    counterparty_name       VARCHAR(200),
    currency                VARCHAR(3)   NOT NULL,
    gross_debits            NUMERIC(20,4) NOT NULL DEFAULT 0,
    gross_credits           NUMERIC(20,4) NOT NULL DEFAULT 0,
    interchange_receivable  NUMERIC(15,4) DEFAULT 0,
    interchange_payable     NUMERIC(15,4) DEFAULT 0,
    scheme_fees             NUMERIC(15,4) DEFAULT 0,
    net_position            NUMERIC(20,4) NOT NULL DEFAULT 0,
    settlement_account_id   BIGINT,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','CALCULATED','CONFIRMED','SETTLED','DISPUTED')),
    settled_at              TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_clearing ON card_clearing_batch(network, clearing_date DESC);
CREATE INDEX idx_card_settlement ON card_settlement_position(settlement_date, network);

-- ============================================================
-- BIAN SD: ACH Operations
-- ============================================================
CREATE TABLE IF NOT EXISTS ach_batch (
    id                      BIGSERIAL PRIMARY KEY,
    batch_id                VARCHAR(30)  NOT NULL UNIQUE,
    ach_operator             VARCHAR(30)  NOT NULL,  -- NIBSS, FedACH, Bacs, SEPA, etc.
    batch_type              VARCHAR(20)  NOT NULL
                            CHECK (batch_type IN ('CREDIT','DEBIT','RETURN','REVERSAL','PRENOTE','NOTIFICATION')),
    originator_id           VARCHAR(40)  NOT NULL,
    originator_name         VARCHAR(200) NOT NULL,
    originator_account_id   BIGINT       NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    total_transactions      INT          NOT NULL DEFAULT 0,
    total_amount            NUMERIC(20,4) NOT NULL DEFAULT 0,
    effective_date          DATE         NOT NULL,
    settlement_date         DATE,
    file_reference          VARCHAR(200),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'CREATED'
                            CHECK (status IN ('CREATED','VALIDATED','SUBMITTED','ACCEPTED','PARTIALLY_ACCEPTED',
                                   'REJECTED','SETTLED','RETURNED')),
    rejection_count         INT          DEFAULT 0,
    return_count            INT          DEFAULT 0,
    submitted_at            TIMESTAMP,
    settled_at              TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_ach_batch ON ach_batch(ach_operator, effective_date DESC);

-- ============================================================
-- BIAN SD: Central Cash Handling
-- ============================================================
CREATE TABLE IF NOT EXISTS central_cash_position (
    id                      BIGSERIAL PRIMARY KEY,
    position_date           DATE         NOT NULL,
    currency                VARCHAR(3)   NOT NULL,
    -- Inflows
    clearing_inflows        NUMERIC(20,4) NOT NULL DEFAULT 0,
    customer_deposits       NUMERIC(20,4) NOT NULL DEFAULT 0,
    interbank_inflows       NUMERIC(20,4) NOT NULL DEFAULT 0,
    cb_borrowing            NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Outflows
    clearing_outflows       NUMERIC(20,4) NOT NULL DEFAULT 0,
    customer_withdrawals    NUMERIC(20,4) NOT NULL DEFAULT 0,
    interbank_outflows      NUMERIC(20,4) NOT NULL DEFAULT 0,
    cb_repayment            NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Positions
    opening_balance         NUMERIC(20,4) NOT NULL,
    net_movement            NUMERIC(20,4) NOT NULL DEFAULT 0,
    closing_balance         NUMERIC(20,4),
    reserve_requirement     NUMERIC(20,4),
    excess_reserve          NUMERIC(20,4),
    -- Status
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PROJECTED'
                            CHECK (status IN ('PROJECTED','ACTUAL','RECONCILED')),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (position_date, currency)
);

-- ============================================================
-- BIAN SD: Financial Message Analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS message_analysis (
    id                      BIGSERIAL PRIMARY KEY,
    analysis_id             VARCHAR(30)  NOT NULL UNIQUE,
    message_ref             VARCHAR(80)  NOT NULL,
    analysis_type           VARCHAR(30)  NOT NULL
                            CHECK (analysis_type IN ('FORMAT_VALIDATION','SANCTIONS_SCREENING','DUPLICATE_CHECK',
                                   'AMOUNT_THRESHOLD','PATTERN_DETECTION','ROUTING_VALIDATION','COMPLIANCE_CHECK')),
    result                  VARCHAR(15)  NOT NULL
                            CHECK (result IN ('PASS','FAIL','WARNING','REVIEW')),
    severity                VARCHAR(10)  DEFAULT 'LOW'
                            CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
    details                 TEXT,
    rule_triggered          VARCHAR(100),
    auto_action             VARCHAR(20)
                            CHECK (auto_action IN ('NONE','HOLD','REJECT','ESCALATE','REPAIR','RELEASE')),
    reviewed_by             VARCHAR(80),
    reviewed_at             TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_analysis ON message_analysis(message_ref, analysis_type);

-- ============================================================
-- BIAN SD: Merchant Relations + Merchant Acquiring Facility
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant_profile (
    id                      BIGSERIAL PRIMARY KEY,
    merchant_id             VARCHAR(30)  NOT NULL UNIQUE,
    merchant_name           VARCHAR(200) NOT NULL,
    trading_name            VARCHAR(200),
    merchant_category_code  VARCHAR(10)  NOT NULL,  -- MCC
    business_type           VARCHAR(30)  NOT NULL
                            CHECK (business_type IN ('SOLE_PROPRIETOR','PARTNERSHIP','LIMITED_COMPANY','PLC',
                                   'GOVERNMENT','NGO','COOPERATIVE','FRANCHISE')),
    registration_number     VARCHAR(60),
    tax_id                  VARCHAR(40),
    contact_name            VARCHAR(200),
    contact_phone           VARCHAR(30),
    contact_email           VARCHAR(200),
    address                 TEXT,
    -- Acquiring terms
    settlement_account_id   BIGINT,
    settlement_frequency    VARCHAR(15)  NOT NULL DEFAULT 'DAILY'
                            CHECK (settlement_frequency IN ('REAL_TIME','DAILY','WEEKLY','MONTHLY')),
    mdr_rate                NUMERIC(5,3) NOT NULL,  -- Merchant Discount Rate %
    terminal_count          INT          DEFAULT 0,
    monthly_volume_limit    NUMERIC(20,4),
    -- Risk
    risk_category           VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM'
                            CHECK (risk_category IN ('LOW','MEDIUM','HIGH','PROHIBITED')),
    chargeback_rate         NUMERIC(5,3) DEFAULT 0,
    monitoring_level        VARCHAR(15)  DEFAULT 'STANDARD'
                            CHECK (monitoring_level IN ('STANDARD','ENHANCED','INTENSIVE')),
    -- Status
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED','UNDER_REVIEW')),
    onboarded_at            TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchant_mcc ON merchant_profile(merchant_category_code, status);

-- ============================================================
-- BIAN SD: Card Network Participant Facility
-- ============================================================
CREATE TABLE IF NOT EXISTS card_network_membership (
    id                      BIGSERIAL PRIMARY KEY,
    network                 VARCHAR(20)  NOT NULL
                            CHECK (network IN ('VISA','MASTERCARD','AMEX','DISCOVER','UNIONPAY','JCB','VERVE','INTERSWITCH')),
    membership_type         VARCHAR(20)  NOT NULL
                            CHECK (membership_type IN ('PRINCIPAL','ASSOCIATE','AFFILIATE','PROCESSOR','AGENT','SPONSOR')),
    member_id               VARCHAR(40)  NOT NULL,  -- BIN sponsor / member ID
    institution_name        VARCHAR(200) NOT NULL,
    bin_ranges              JSONB,        -- [{"start":"456200","end":"456299","product":"DEBIT"}]
    issuing_enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    acquiring_enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    settlement_bic          VARCHAR(11),
    settlement_currency     VARCHAR(3)   NOT NULL DEFAULT 'USD',
    -- Compliance
    pci_dss_compliant       BOOLEAN      NOT NULL DEFAULT TRUE,
    pci_expiry_date         DATE,
    annual_fee              NUMERIC(15,4),
    -- Status
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED')),
    effective_from          DATE         NOT NULL,
    effective_to            DATE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_network ON card_network_membership(network, status);
