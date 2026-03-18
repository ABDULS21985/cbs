SET search_path TO cbs;

-- =====================================================
-- V44: Partial Gap Closure Wave 3 — Analytics & Infrastructure (Batch 38 FINAL)
-- =====================================================

-- 1. Service Point
CREATE TABLE IF NOT EXISTS service_point (
    id                          BIGSERIAL PRIMARY KEY,
    service_point_code          VARCHAR(30)    NOT NULL UNIQUE,
    service_point_name          VARCHAR(200)   NOT NULL,
    service_point_type          VARCHAR(20)    NOT NULL CHECK (service_point_type IN ('BRANCH_COUNTER','SELF_SERVICE_KIOSK','MOBILE_BANKER','ATM','POS_DEVICE','ONLINE','AGENT_TERMINAL')),
    location_id                 BIGINT,
    device_id                   VARCHAR(80),
    supported_services          JSONB,
    operating_hours             JSONB,
    is_accessible               BOOLEAN        DEFAULT FALSE,
    staff_required              BOOLEAN        DEFAULT TRUE,
    assigned_staff_id           VARCHAR(80),
    max_concurrent_customers    INT            DEFAULT 1,
    avg_service_time_minutes    INT,
    status                      VARCHAR(15)    NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE','OFFLINE','MAINTENANCE')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

-- 2. Service Point Interaction (standalone, immutable)
CREATE TABLE IF NOT EXISTS service_point_interaction (
    id                              BIGSERIAL PRIMARY KEY,
    service_point_id                BIGINT         NOT NULL,
    customer_id                     BIGINT,
    session_id                      BIGINT,
    interaction_type                VARCHAR(15)    NOT NULL CHECK (interaction_type IN ('ENQUIRY','TRANSACTION','APPLICATION','COMPLAINT','ADVISORY')),
    services_used                   JSONB,
    channel_used                    VARCHAR(20),
    staff_assisted                  BOOLEAN        DEFAULT FALSE,
    staff_id                        VARCHAR(80),
    started_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    ended_at                        TIMESTAMP,
    duration_seconds                INT,
    customer_satisfaction_score     INT            CHECK (customer_satisfaction_score BETWEEN 1 AND 5),
    feedback_comment                TEXT,
    outcome                         VARCHAR(15)    NOT NULL DEFAULT 'COMPLETED' CHECK (outcome IN ('COMPLETED','ABANDONED','REFERRED','ESCALATED')),
    created_at                      TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spint_sp ON service_point_interaction(service_point_id, started_at DESC);

-- 3. Product Quality Assessment
CREATE TABLE IF NOT EXISTS product_quality_assessment (
    id                              BIGSERIAL PRIMARY KEY,
    assessment_code                 VARCHAR(30)    NOT NULL UNIQUE,
    product_code                    VARCHAR(30)    NOT NULL,
    product_name                    VARCHAR(200),
    assessment_period               VARCHAR(10)    NOT NULL CHECK (assessment_period IN ('MONTHLY','QUARTERLY')),
    period_date                     DATE           NOT NULL,
    customer_satisfaction_score     NUMERIC(5,2),
    complaint_count                 INT            DEFAULT 0,
    complaints_per_1000_accounts    NUMERIC(8,4),
    defect_rate                     NUMERIC(8,4),
    processing_error_count          INT            DEFAULT 0,
    sla_breach_count                INT            DEFAULT 0,
    sla_meet_pct                    NUMERIC(5,2),
    avg_onboarding_time_days        NUMERIC(8,2),
    avg_claim_settlement_days       NUMERIC(8,2),
    regulatory_findings_count       INT            DEFAULT 0,
    audit_findings_count            INT            DEFAULT 0,
    pending_remediations            INT            DEFAULT 0,
    compliance_score_pct            NUMERIC(5,2),
    market_share_pct                NUMERIC(5,2),
    competitor_benchmark_position   INT,
    pricing_competitiveness         VARCHAR(15)    CHECK (pricing_competitiveness IN ('ABOVE_MARKET','AT_MARKET','BELOW_MARKET')),
    channel_availability_pct        NUMERIC(5,2),
    straight_through_processing_pct NUMERIC(5,2),
    manual_intervention_rate        NUMERIC(5,2),
    overall_quality_rating          VARCHAR(20)    NOT NULL CHECK (overall_quality_rating IN ('EXCELLENT','GOOD','SATISFACTORY','NEEDS_IMPROVEMENT','CRITICAL')),
    action_items                    JSONB,
    assessed_by                     VARCHAR(200),
    status                          VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEWED','PUBLISHED')),
    UNIQUE(product_code, assessment_period, period_date),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    created_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    version                         BIGINT         DEFAULT 0
);

-- 4. Market Data Switch
CREATE TABLE IF NOT EXISTS market_data_switch (
    id                          BIGSERIAL PRIMARY KEY,
    switch_name                 VARCHAR(200)   NOT NULL,
    switch_type                 VARCHAR(15)    NOT NULL CHECK (switch_type IN ('AGGREGATOR','DISTRIBUTOR','NORMALIZER','FILTER','VALIDATOR')),
    input_feeds                 JSONB,
    output_subscribers          JSONB,
    transformation_rules        JSONB,
    filter_rules                JSONB,
    validation_rules            JSONB,
    throughput_per_second        INT,
    latency_ms                  INT,
    last_processed_at           TIMESTAMP,
    total_processed_today       INT            DEFAULT 0,
    total_rejected_today        INT            DEFAULT 0,
    total_errors_today          INT            DEFAULT 0,
    status                      VARCHAR(15)    NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','DEGRADED','STOPPED','MAINTENANCE')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

-- 5. Market Data Subscription
CREATE TABLE IF NOT EXISTS market_data_subscription (
    id                          BIGSERIAL PRIMARY KEY,
    subscriber_system           VARCHAR(20)    NOT NULL CHECK (subscriber_system IN ('TREASURY','ALM','RISK','TRADING','CUSTODY','VALUATION','EOD')),
    feed_ids                    JSONB,
    instrument_filter           JSONB,
    delivery_method             VARCHAR(10)    NOT NULL CHECK (delivery_method IN ('PUSH','PULL','BATCH')),
    delivery_frequency          VARCHAR(15)    NOT NULL CHECK (delivery_frequency IN ('REAL_TIME','15MIN','HOURLY','END_OF_DAY')),
    format                      VARCHAR(15)    CHECK (format IN ('JSON','CSV','FIX','PROPRIETARY')),
    last_delivered_at           TIMESTAMP,
    delivery_failure_count      INT            DEFAULT 0,
    is_active                   BOOLEAN        NOT NULL DEFAULT TRUE,
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

-- 6. Market Research Project
CREATE TABLE IF NOT EXISTS market_research_project (
    id                          BIGSERIAL PRIMARY KEY,
    project_code                VARCHAR(30)    NOT NULL UNIQUE,
    project_name                VARCHAR(200)   NOT NULL,
    project_type                VARCHAR(25)    NOT NULL CHECK (project_type IN ('CUSTOMER_RESEARCH','MARKET_SIZING','COMPETITIVE_STUDY','PRODUCT_FEASIBILITY','BRAND_PERCEPTION','CHANNEL_PREFERENCE','PRICING_SENSITIVITY','GEOGRAPHIC_OPPORTUNITY','SEGMENTATION_STUDY','REGULATORY_IMPACT')),
    objectives                  TEXT,
    methodology                 VARCHAR(20)    CHECK (methodology IN ('SURVEY','FOCUS_GROUP','INTERVIEW','DESK_RESEARCH','MYSTERY_SHOPPING','DATA_ANALYTICS','MIXED_METHOD')),
    target_population           VARCHAR(200),
    sample_size                 INT,
    vendor                      VARCHAR(200),
    project_lead                VARCHAR(200),
    budget                      NUMERIC(15,4),
    actual_cost                 NUMERIC(15,4),
    planned_start_date          DATE,
    planned_end_date            DATE,
    actual_end_date             DATE,
    key_findings                JSONB,
    recommendations             JSONB,
    actions_taken               JSONB,
    impact_measurement          JSONB,
    status                      VARCHAR(15)    NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','APPROVED','IN_PROGRESS','ANALYSIS','COMPLETED','ARCHIVED')),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP      NOT NULL DEFAULT now(),
    version                     BIGINT         DEFAULT 0
);

-- 7. Feed Operation Log (standalone, immutable)
CREATE TABLE IF NOT EXISTS feed_operation_log (
    id                          BIGSERIAL PRIMARY KEY,
    feed_id                     BIGINT         NOT NULL,
    operation_type              VARCHAR(25)    NOT NULL CHECK (operation_type IN ('CONNECT','DISCONNECT','RECONNECT','HEARTBEAT','DATA_RECEIPT','ERROR','RECOVERY','SCHEDULED_MAINTENANCE','FAILOVER')),
    timestamp                   TIMESTAMP      NOT NULL DEFAULT now(),
    records_received            INT,
    records_processed           INT,
    records_rejected            INT,
    latency_ms                  INT,
    error_code                  VARCHAR(30),
    error_message               TEXT,
    recovery_action             VARCHAR(200),
    connection_duration_seconds INT,
    created_at                  TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fdoplog_feed ON feed_operation_log(feed_id, timestamp DESC);

-- 8. Feed Quality Metric (standalone, daily snapshot)
CREATE TABLE IF NOT EXISTS feed_quality_metric (
    id                          BIGSERIAL PRIMARY KEY,
    feed_id                     BIGINT         NOT NULL,
    metric_date                 DATE           NOT NULL,
    total_records_received      INT,
    total_records_processed     INT,
    total_records_rejected      INT,
    uptime_pct                  NUMERIC(5,2),
    avg_latency_ms              INT,
    max_latency_ms              INT,
    p99_latency_ms              INT,
    gap_count                   INT            DEFAULT 0,
    stale_data_count            INT            DEFAULT 0,
    duplicate_count             INT            DEFAULT 0,
    out_of_range_count          INT            DEFAULT 0,
    quality_score               NUMERIC(5,2),
    UNIQUE(feed_id, metric_date),
    created_at                  TIMESTAMP      NOT NULL DEFAULT now()
);
