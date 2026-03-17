-- V22: Integration & Messaging (Caps 90-92, 94)
-- ESB/Message Bus, ISO 20022 Message Handling, Open Banking/PSD2, API Marketplace

SET search_path TO cbs;

-- ============================================================
-- Cap 90: Enterprise Service Bus / Message Bus
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_route (
    id                  BIGSERIAL PRIMARY KEY,
    route_code          VARCHAR(80)  NOT NULL UNIQUE,
    route_name          VARCHAR(200) NOT NULL,
    route_type          VARCHAR(30)  NOT NULL
                        CHECK (route_type IN ('SYNC','ASYNC','PUBLISH_SUBSCRIBE','REQUEST_REPLY',
                               'FIRE_AND_FORGET','SAGA','CHOREOGRAPHY')),
    source_system       VARCHAR(80)  NOT NULL,
    target_system       VARCHAR(80)  NOT NULL,
    protocol            VARCHAR(30)  NOT NULL
                        CHECK (protocol IN ('REST','SOAP','GRPC','AMQP','KAFKA','JMS','FTP','SFTP','FILE','SMTP','WEBSOCKET')),
    endpoint_url        VARCHAR(500),
    transform_spec      JSONB,        -- XSLT / JSONata / mapping rules
    retry_policy        JSONB,        -- {"max_retries":3,"backoff_ms":1000,"backoff_multiplier":2}
    circuit_breaker     JSONB,        -- {"failure_threshold":5,"reset_timeout_ms":30000}
    rate_limit_per_sec  INT,
    timeout_ms          INT          NOT NULL DEFAULT 30000,
    auth_type           VARCHAR(20)  DEFAULT 'NONE'
                        CHECK (auth_type IN ('NONE','BASIC','OAUTH2','API_KEY','MTLS','HMAC')),
    auth_config         JSONB,        -- encrypted credentials reference
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_health_check   TIMESTAMP,
    health_status       VARCHAR(20)  DEFAULT 'UNKNOWN'
                        CHECK (health_status IN ('HEALTHY','DEGRADED','DOWN','UNKNOWN')),
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_message (
    id                  BIGSERIAL PRIMARY KEY,
    message_id          VARCHAR(80)  NOT NULL UNIQUE,
    route_id            BIGINT       NOT NULL REFERENCES integration_route(id),
    correlation_id      VARCHAR(80),
    direction           VARCHAR(10)  NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
    message_type        VARCHAR(60)  NOT NULL,
    content_type        VARCHAR(40)  NOT NULL DEFAULT 'application/json'
                        CHECK (content_type IN ('application/json','application/xml','text/plain',
                               'application/iso20022','application/swift','application/csv')),
    payload_hash        VARCHAR(80),  -- SHA-256 for idempotency
    payload_size_bytes  BIGINT,
    headers             JSONB,
    status              VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED'
                        CHECK (status IN ('RECEIVED','VALIDATING','TRANSFORMING','ROUTING','DELIVERED',
                               'FAILED','DEAD_LETTER','RETRYING')),
    retry_count         INT          NOT NULL DEFAULT 0,
    error_message       TEXT,
    processing_time_ms  INT,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    delivered_at        TIMESTAMP
);

CREATE INDEX idx_integration_msg_route ON integration_message(route_id, status, created_at DESC);
CREATE INDEX idx_integration_msg_correlation ON integration_message(correlation_id);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id                  BIGSERIAL PRIMARY KEY,
    message_id          BIGINT       NOT NULL REFERENCES integration_message(id),
    route_id            BIGINT       NOT NULL REFERENCES integration_route(id),
    failure_reason      TEXT         NOT NULL,
    original_payload    TEXT,
    retry_count         INT          NOT NULL DEFAULT 0,
    max_retries         INT          NOT NULL DEFAULT 3,
    next_retry_at       TIMESTAMP,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','RETRYING','RESOLVED','ABANDONED')),
    resolved_by         VARCHAR(80),
    resolved_at         TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- Cap 91: ISO 20022 Message Handling
-- ============================================================
CREATE TABLE IF NOT EXISTS iso20022_message (
    id                  BIGSERIAL PRIMARY KEY,
    message_id          VARCHAR(80)  NOT NULL UNIQUE,
    business_message_id VARCHAR(80),  -- BizMsgIdr
    message_definition  VARCHAR(30)  NOT NULL,  -- e.g. pacs.008.001.10, pain.001.001.11
    message_category    VARCHAR(20)  NOT NULL
                        CHECK (message_category IN ('PAYMENTS','SECURITIES','TRADE_FINANCE',
                               'FOREIGN_EXCHANGE','CASH_MANAGEMENT','CARD','REPORTING')),
    message_function    VARCHAR(40)  NOT NULL
                        CHECK (message_function IN ('CREDIT_TRANSFER','DIRECT_DEBIT','STATUS_REPORT',
                               'RETURN','CANCELLATION','INVESTIGATION','RESOLUTION','NOTIFICATION',
                               'STATEMENT','MANDATE')),
    direction           VARCHAR(10)  NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
    sender_bic          VARCHAR(11),
    receiver_bic        VARCHAR(11),
    creation_date_time  TIMESTAMP    NOT NULL,
    number_of_txns      INT          NOT NULL DEFAULT 1,
    total_amount        NUMERIC(20,4),
    currency            VARCHAR(3),
    xml_payload         TEXT,
    parsed_payload      JSONB,        -- structured extraction for quick queries
    validation_status   VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (validation_status IN ('PENDING','VALID','SCHEMA_ERROR','BUSINESS_ERROR','REJECTED')),
    validation_errors   JSONB,
    settlement_method   VARCHAR(20),
    settlement_date     DATE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED'
                        CHECK (status IN ('RECEIVED','VALIDATED','PROCESSING','SETTLED','REJECTED',
                               'RETURNED','CANCELLED','INVESTIGATING')),
    linked_transaction_id BIGINT,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_iso20022_definition ON iso20022_message(message_definition, status, created_at DESC);
CREATE INDEX idx_iso20022_bic ON iso20022_message(sender_bic, receiver_bic);

-- ISO 20022 code sets (reason codes, purpose codes, etc.)
CREATE TABLE IF NOT EXISTS iso20022_code_set (
    id                  BIGSERIAL PRIMARY KEY,
    code_set_name       VARCHAR(80)  NOT NULL,  -- e.g. ExternalPurpose1Code, ExternalReturnReason1Code
    code                VARCHAR(20)  NOT NULL,
    display_name        VARCHAR(200) NOT NULL,
    definition          TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (code_set_name, code)
);

-- Seed: common ISO 20022 purpose codes
INSERT INTO iso20022_code_set (code_set_name, code, display_name, definition) VALUES
    ('ExternalPurpose1Code', 'SALA', 'Salary Payment', 'Transaction is a payment of salary'),
    ('ExternalPurpose1Code', 'SUPP', 'Supplier Payment', 'Transaction is a payment to a supplier'),
    ('ExternalPurpose1Code', 'PENS', 'Pension Payment', 'Transaction is a pension payment'),
    ('ExternalPurpose1Code', 'TAXS', 'Tax Payment', 'Transaction is a tax payment'),
    ('ExternalPurpose1Code', 'DIVD', 'Dividend', 'Transaction is a dividend payment'),
    ('ExternalPurpose1Code', 'LOAN', 'Loan', 'Transaction is a loan disbursement or repayment'),
    ('ExternalPurpose1Code', 'INTC', 'Intra-Company', 'Intra-company payment'),
    ('ExternalPurpose1Code', 'TRAD', 'Trade Settlement', 'Transaction is a trade settlement payment'),
    ('ExternalReturnReason1Code', 'AC01', 'Incorrect Account Number', 'Account identifier is incorrect'),
    ('ExternalReturnReason1Code', 'AC04', 'Closed Account', 'Account is closed'),
    ('ExternalReturnReason1Code', 'AC06', 'Blocked Account', 'Account is blocked'),
    ('ExternalReturnReason1Code', 'AM01', 'Zero Amount', 'Amount is zero'),
    ('ExternalReturnReason1Code', 'AM02', 'Not Allowed Amount', 'Amount exceeds agreed limit'),
    ('ExternalReturnReason1Code', 'AM04', 'Insufficient Funds', 'Insufficient funds'),
    ('ExternalReturnReason1Code', 'BE01', 'Inconsistent With End Customer', 'Identification does not match'),
    ('ExternalReturnReason1Code', 'MS03', 'Not Specified Reason Agent', 'Reason not specified by agent')
ON CONFLICT (code_set_name, code) DO NOTHING;

-- ============================================================
-- Cap 92: Open Banking / PSD2 Compliance Layer
-- ============================================================
CREATE TABLE IF NOT EXISTS psd2_tpp_registration (
    id                  BIGSERIAL PRIMARY KEY,
    tpp_id              VARCHAR(80)  NOT NULL UNIQUE,
    tpp_name            VARCHAR(200) NOT NULL,
    tpp_type            VARCHAR(20)  NOT NULL
                        CHECK (tpp_type IN ('AISP','PISP','CBPII','ASPSP')),
    national_authority  VARCHAR(100),  -- e.g. FCA, BaFin, DNB
    authorization_number VARCHAR(80),
    eidas_certificate   TEXT,          -- qualified certificate for electronic seals
    redirect_uris       JSONB,
    allowed_scopes      JSONB,         -- ['accounts','payments','funds-confirmations']
    sca_approach        VARCHAR(20)   NOT NULL DEFAULT 'REDIRECT'
                        CHECK (sca_approach IN ('REDIRECT','EMBEDDED','DECOUPLED','OAUTH2')),
    status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED')),
    passporting_countries JSONB,       -- countries where TPP is passported
    last_certificate_check TIMESTAMP,
    certificate_valid   BOOLEAN       DEFAULT TRUE,
    created_at          TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS psd2_sca_session (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          VARCHAR(80)  NOT NULL UNIQUE,
    tpp_id              VARCHAR(80)  NOT NULL,
    customer_id         BIGINT       NOT NULL,
    sca_method          VARCHAR(30)  NOT NULL
                        CHECK (sca_method IN ('SMS_OTP','PUSH','BIOMETRIC','TOTP','FIDO2','PHOTO_TAN','CHIP_TAN')),
    sca_status          VARCHAR(20)  NOT NULL DEFAULT 'STARTED'
                        CHECK (sca_status IN ('STARTED','AUTHENTICATION_REQUIRED','METHOD_SELECTED',
                               'FINALISED','FAILED','EXEMPTED')),
    exemption_type      VARCHAR(30)
                        CHECK (exemption_type IN ('LOW_VALUE','RECURRING','TRUSTED_BENEFICIARY',
                               'SECURE_CORPORATE','TRA','CONTACTLESS','UNATTENDED')),
    payment_id          BIGINT,
    consent_id          VARCHAR(80),
    challenge_data      TEXT,
    ip_address          VARCHAR(50),
    user_agent          TEXT,
    psu_geo_location    VARCHAR(100),
    expires_at          TIMESTAMP    NOT NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    finalised_at        TIMESTAMP
);

CREATE INDEX idx_psd2_sca_tpp ON psd2_sca_session(tpp_id, sca_status);
CREATE INDEX idx_psd2_sca_customer ON psd2_sca_session(customer_id, created_at DESC);

-- ============================================================
-- Cap 94: API Marketplace / Partner Ecosystem
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_api_product (
    id                  BIGSERIAL PRIMARY KEY,
    product_code        VARCHAR(80)  NOT NULL UNIQUE,
    product_name        VARCHAR(200) NOT NULL,
    product_category    VARCHAR(40)  NOT NULL
                        CHECK (product_category IN ('ACCOUNTS','PAYMENTS','LENDING','CARDS',
                               'IDENTITY','COMPLIANCE','DATA','FOREX','INSURANCE','UTILITY')),
    api_version         VARCHAR(20)  NOT NULL DEFAULT 'v1',
    description         TEXT,
    documentation_url   VARCHAR(500),
    base_path           VARCHAR(200) NOT NULL,  -- e.g. /api/v1/accounts
    supported_methods   JSONB        NOT NULL DEFAULT '["GET"]'::jsonb,
    rate_limit_tier     VARCHAR(20)  NOT NULL DEFAULT 'STANDARD'
                        CHECK (rate_limit_tier IN ('FREE','BASIC','STANDARD','PREMIUM','ENTERPRISE','UNLIMITED')),
    rate_limit_per_min  INT          NOT NULL DEFAULT 60,
    pricing_model       VARCHAR(20)  NOT NULL DEFAULT 'FREE'
                        CHECK (pricing_model IN ('FREE','PAY_PER_CALL','MONTHLY_SUBSCRIPTION',
                               'TIERED','REVENUE_SHARE','CUSTOM')),
    price_per_call      NUMERIC(10,4),
    monthly_price       NUMERIC(12,2),
    sandbox_available   BOOLEAN      NOT NULL DEFAULT TRUE,
    requires_approval   BOOLEAN      NOT NULL DEFAULT FALSE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','PUBLISHED','DEPRECATED','RETIRED')),
    published_at        TIMESTAMP,
    deprecated_at       TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_subscription (
    id                  BIGSERIAL PRIMARY KEY,
    subscription_id     VARCHAR(80)  NOT NULL UNIQUE,
    api_product_id      BIGINT       NOT NULL REFERENCES marketplace_api_product(id),
    subscriber_client_id BIGINT,      -- references api_client
    subscriber_name     VARCHAR(200) NOT NULL,
    subscriber_email    VARCHAR(200),
    plan_tier           VARCHAR(20)  NOT NULL DEFAULT 'STANDARD',
    api_key_hash        VARCHAR(200),
    monthly_call_limit  INT,
    calls_this_month    INT          NOT NULL DEFAULT 0,
    billing_start_date  DATE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
    approved_by         VARCHAR(80),
    approved_at         TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_usage_log (
    id                  BIGSERIAL PRIMARY KEY,
    subscription_id     BIGINT       NOT NULL REFERENCES marketplace_subscription(id),
    api_product_id      BIGINT       NOT NULL REFERENCES marketplace_api_product(id),
    endpoint_path       VARCHAR(200) NOT NULL,
    http_method         VARCHAR(10)  NOT NULL,
    response_code       INT          NOT NULL,
    response_time_ms    INT          NOT NULL,
    request_size_bytes  INT,
    response_size_bytes INT,
    ip_address          VARCHAR(50),
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_usage ON marketplace_usage_log(subscription_id, created_at DESC);
