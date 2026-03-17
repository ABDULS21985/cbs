-- V20__platform_architecture.sql
-- Capabilities 75-80, 82-83: Open Banking, Events, Multi-Tenancy, Product Factory, Data Lake, HA

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 75: API-FIRST / OPEN BANKING
-- ============================================================

CREATE TABLE api_client (
    id                      BIGSERIAL PRIMARY KEY,
    client_id               VARCHAR(50) NOT NULL UNIQUE,
    client_name             VARCHAR(200) NOT NULL,
    client_type             VARCHAR(20) NOT NULL CHECK (client_type IN ('INTERNAL','TPP_AISP','TPP_PISP','TPP_CBPII','PARTNER','SANDBOX')),
    -- Auth
    api_key_hash            VARCHAR(128) NOT NULL,
    oauth_client_id         VARCHAR(100),
    redirect_uris           JSONB DEFAULT '[]',
    allowed_scopes          JSONB NOT NULL DEFAULT '[]',
    allowed_endpoints       JSONB DEFAULT '[]',
    -- Rate limiting
    rate_limit_per_second   INT NOT NULL DEFAULT 10,
    rate_limit_per_day      INT NOT NULL DEFAULT 10000,
    daily_request_count     INT NOT NULL DEFAULT 0,
    last_request_reset      DATE,
    -- Versioning
    api_version             VARCHAR(10) NOT NULL DEFAULT 'v1',
    -- Contact
    contact_name            VARCHAR(100),
    contact_email           VARCHAR(100),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    approved_at             TIMESTAMP WITH TIME ZONE,
    expires_at              TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE api_consent (
    id                      BIGSERIAL PRIMARY KEY,
    consent_id              VARCHAR(50) NOT NULL UNIQUE,
    client_id               VARCHAR(50) NOT NULL REFERENCES api_client(client_id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    -- Scope
    consent_type            VARCHAR(20) NOT NULL CHECK (consent_type IN ('ACCOUNT_ACCESS','PAYMENT_INITIATION','FUNDS_CONFIRMATION')),
    permissions             JSONB NOT NULL DEFAULT '[]',
    account_ids             JSONB DEFAULT '[]',
    -- Validity
    granted_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at              TIMESTAMP WITH TIME ZONE,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'AWAITING_AUTHORISATION'
                                CHECK (status IN ('AWAITING_AUTHORISATION','AUTHORISED','REJECTED','REVOKED','EXPIRED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_consent_customer ON api_consent(customer_id);
CREATE INDEX idx_consent_client ON api_consent(client_id);

-- ============================================================
-- CAPABILITY 76/79: EVENT-DRIVEN / REAL-TIME EVENT STREAMING
-- ============================================================

CREATE TABLE domain_event (
    id                      BIGSERIAL PRIMARY KEY,
    event_id                VARCHAR(50) NOT NULL UNIQUE,
    event_type              VARCHAR(50) NOT NULL,
    aggregate_type          VARCHAR(50) NOT NULL,
    aggregate_id            BIGINT NOT NULL,
    -- Payload
    payload                 JSONB NOT NULL,
    metadata                JSONB DEFAULT '{}',
    -- Sequencing
    sequence_number         BIGINT NOT NULL,
    -- Publishing
    published               BOOLEAN NOT NULL DEFAULT FALSE,
    published_at            TIMESTAMP WITH TIME ZONE,
    topic                   VARCHAR(100),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_aggregate ON domain_event(aggregate_type, aggregate_id);
CREATE INDEX idx_event_type ON domain_event(event_type);
CREATE INDEX idx_event_unpublished ON domain_event(published) WHERE published = FALSE;
CREATE SEQUENCE event_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE event_subscription (
    id                      BIGSERIAL PRIMARY KEY,
    subscription_name       VARCHAR(100) NOT NULL UNIQUE,
    event_types             JSONB NOT NULL DEFAULT '["*"]',
    -- Delivery
    delivery_type           VARCHAR(20) NOT NULL CHECK (delivery_type IN ('WEBHOOK','KAFKA','SQS','INTERNAL','LOG')),
    delivery_url            VARCHAR(500),
    delivery_config         JSONB DEFAULT '{}',
    -- Filter
    filter_expression       VARCHAR(500),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    last_delivered_event_id BIGINT,
    failure_count           INT NOT NULL DEFAULT 0,
    max_retries             INT NOT NULL DEFAULT 3,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

-- ============================================================
-- CAPABILITY 78: MULTI-TENANCY
-- ============================================================

CREATE TABLE tenant (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_code             VARCHAR(20) NOT NULL UNIQUE,
    tenant_name             VARCHAR(200) NOT NULL,
    tenant_type             VARCHAR(20) NOT NULL CHECK (tenant_type IN ('PRIMARY','SUBSIDIARY','WHITE_LABEL','SANDBOX')),
    -- Isolation
    isolation_mode          VARCHAR(20) NOT NULL DEFAULT 'LOGICAL'
                                CHECK (isolation_mode IN ('LOGICAL','SCHEMA','DATABASE')),
    schema_name             VARCHAR(50),
    -- Branding
    branding_config         JSONB DEFAULT '{}',
    -- Limits
    max_customers           INT,
    max_accounts            INT,
    max_users               INT,
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    license_expires_at      TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

-- ============================================================
-- CAPABILITY 80: LOW-CODE / NO-CODE PRODUCT FACTORY
-- ============================================================

CREATE TABLE product_template (
    id                      BIGSERIAL PRIMARY KEY,
    template_code           VARCHAR(30) NOT NULL UNIQUE,
    template_name           VARCHAR(200) NOT NULL,
    product_category        VARCHAR(20) NOT NULL CHECK (product_category IN (
                                'SAVINGS','CURRENT','FIXED_DEPOSIT','RECURRING_DEPOSIT',
                                'PERSONAL_LOAN','SME_LOAN','MORTGAGE','OVERDRAFT','CREDIT_CARD')),
    -- Configuration (all product parameters as JSONB)
    interest_config         JSONB NOT NULL DEFAULT '{}',
    fee_config              JSONB NOT NULL DEFAULT '{}',
    limit_config            JSONB NOT NULL DEFAULT '{}',
    eligibility_rules       JSONB NOT NULL DEFAULT '[]',
    lifecycle_rules         JSONB NOT NULL DEFAULT '{}',
    gl_mapping              JSONB NOT NULL DEFAULT '{}',
    -- Approval
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','ACTIVE','RETIRED')),
    approved_by             VARCHAR(100),
    approved_at             TIMESTAMP WITH TIME ZONE,
    activated_at            TIMESTAMP WITH TIME ZONE,
    -- Versioning
    template_version        INT NOT NULL DEFAULT 1,
    parent_template_id      BIGINT REFERENCES product_template(id),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_template_category ON product_template(product_category);

-- ============================================================
-- CAPABILITY 82: DATA LAKEHOUSE & ANALYTICS
-- ============================================================

CREATE TABLE data_export_job (
    id                      BIGSERIAL PRIMARY KEY,
    job_name                VARCHAR(100) NOT NULL,
    source_entity           VARCHAR(50) NOT NULL,
    export_format           VARCHAR(10) NOT NULL CHECK (export_format IN ('PARQUET','CSV','JSON','AVRO')),
    -- Schedule
    schedule_cron           VARCHAR(50),
    last_run_at             TIMESTAMP WITH TIME ZONE,
    next_run_at             TIMESTAMP WITH TIME ZONE,
    -- Filter
    date_column             VARCHAR(50),
    last_exported_date      DATE,
    incremental             BOOLEAN NOT NULL DEFAULT TRUE,
    -- Destination
    destination_type        VARCHAR(20) NOT NULL CHECK (destination_type IN ('S3','GCS','AZURE_BLOB','HDFS','LOCAL')),
    destination_path        VARCHAR(500) NOT NULL,
    destination_config      JSONB DEFAULT '{}',
    -- Execution
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','PAUSED','FAILED','DISABLED')),
    last_record_count       INT,
    last_file_size_bytes    BIGINT,
    last_duration_ms        INT,
    error_message           TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);
