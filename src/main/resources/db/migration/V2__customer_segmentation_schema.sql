-- V2__customer_segmentation_schema.sql
-- Capability 5: Customer Segmentation Engine

SET search_path TO cbs;

-- ============================================================
-- SEGMENTATION RULES ENGINE
-- ============================================================

CREATE TABLE segment (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    segment_type    VARCHAR(20) NOT NULL DEFAULT 'RULE_BASED'
                        CHECK (segment_type IN ('RULE_BASED','ML_DRIVEN','MANUAL','HYBRID')),
    priority        INT NOT NULL DEFAULT 100,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    color_code      VARCHAR(7),
    icon            VARCHAR(50),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE segment_rule (
    id              BIGSERIAL PRIMARY KEY,
    segment_id      BIGINT NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
    field_name      VARCHAR(100) NOT NULL,
    operator        VARCHAR(20) NOT NULL CHECK (operator IN (
                        'EQUALS','NOT_EQUALS','GREATER_THAN','LESS_THAN',
                        'GREATER_OR_EQUAL','LESS_OR_EQUAL','CONTAINS','NOT_CONTAINS',
                        'IN','NOT_IN','BETWEEN','IS_NULL','IS_NOT_NULL','STARTS_WITH','ENDS_WITH')),
    field_value     VARCHAR(500) NOT NULL,
    field_value_to  VARCHAR(500),
    logical_group   INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_segment_rule_segment ON segment_rule(segment_id);

-- ============================================================
-- CUSTOMER-SEGMENT ASSIGNMENT
-- ============================================================

CREATE TABLE customer_segment (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    segment_id      BIGINT NOT NULL REFERENCES segment(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_by     VARCHAR(100),
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'AUTO'
                        CHECK (assignment_type IN ('AUTO','MANUAL','ML')),
    confidence_score NUMERIC(5,4),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(customer_id, segment_id)
);

CREATE INDEX idx_customer_segment_customer ON customer_segment(customer_id);
CREATE INDEX idx_customer_segment_segment ON customer_segment(segment_id);

-- ============================================================
-- DEFAULT SEGMENTS (Nigerian banking context)
-- ============================================================

INSERT INTO segment (code, name, description, segment_type, priority) VALUES
    ('HNW', 'High Net Worth', 'Customers with significant asset balances', 'RULE_BASED', 10),
    ('MASS_RETAIL', 'Mass Retail', 'Standard retail banking customers', 'RULE_BASED', 90),
    ('MASS_AFFLUENT', 'Mass Affluent', 'Mid-tier customers with growing portfolios', 'RULE_BASED', 50),
    ('SME_GROWTH', 'SME Growth', 'Small and medium enterprises in growth phase', 'RULE_BASED', 40),
    ('SME_STARTUP', 'SME Startup', 'Newly registered SME customers', 'RULE_BASED', 60),
    ('CORPORATE_TIER1', 'Corporate Tier 1', 'Large corporate clients', 'RULE_BASED', 5),
    ('CORPORATE_TIER2', 'Corporate Tier 2', 'Mid-sized corporate clients', 'RULE_BASED', 20),
    ('GOV_ENTITY', 'Government Entity', 'Government agencies and parastatals', 'RULE_BASED', 15),
    ('DIASPORA', 'Diaspora', 'Nigerian diaspora customers', 'RULE_BASED', 30),
    ('YOUTH', 'Youth Banking', 'Customers under 30', 'RULE_BASED', 70),
    ('DORMANT_RISK', 'Dormant Risk', 'Customers at risk of dormancy', 'ML_DRIVEN', 80),
    ('CHURN_RISK', 'Churn Risk', 'Customers showing churn indicators', 'ML_DRIVEN', 75);
