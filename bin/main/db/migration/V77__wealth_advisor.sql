SET search_path TO cbs;

-- V77: Wealth Advisor entity — formalises advisor management
-- Previously advisors were derived from plan data; now a first-class entity.

CREATE TABLE IF NOT EXISTS wealth_advisor (
    id                      BIGSERIAL PRIMARY KEY,
    advisor_code            VARCHAR(30)   NOT NULL UNIQUE,
    full_name               VARCHAR(200)  NOT NULL,
    email                   VARCHAR(200)  NOT NULL,
    phone                   VARCHAR(40),
    specializations         JSONB,         -- ["Wealth Planning","Estate Management"]
    certifications          JSONB,         -- [{"name":"CFA","issuedBy":"CFA Institute","issuedDate":"2018-06-15","expiryDate":"2028-06-15"}]
    max_clients             INT           DEFAULT 30,
    management_fee_pct      NUMERIC(6,4)  DEFAULT 0.0125,  -- 1.25% annual
    advisory_fee_pct        NUMERIC(6,4)  DEFAULT 0.0075,  -- 0.75% annual
    performance_fee_pct     NUMERIC(6,4)  DEFAULT 0.0020,  -- 0.20% annual
    join_date               DATE,
    status                  VARCHAR(15)   NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP     NOT NULL DEFAULT now(),
    version                 BIGINT        DEFAULT 0
);

CREATE INDEX idx_wealth_advisor_status ON wealth_advisor(status);

-- Add FK from wealth_management_plan.advisor_id to wealth_advisor.advisor_code
-- Use a text column reference since advisor_id is VARCHAR(80) and advisor_code is VARCHAR(30)
-- We keep it loose (no hard FK) to avoid migration ordering issues with existing data,
-- but add an index for join performance.
CREATE INDEX IF NOT EXISTS idx_wealth_plan_advisor ON wealth_management_plan(advisor_id);

-- Add fee tracking columns to wealth_management_plan for real analytics
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS management_fee_pct   NUMERIC(6,4);
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS advisory_fee_pct     NUMERIC(6,4);
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS performance_fee_pct  NUMERIC(6,4);
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS fees_charged_ytd     NUMERIC(20,4) DEFAULT 0;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS contributions_ytd    NUMERIC(20,4) DEFAULT 0;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS withdrawals_ytd      NUMERIC(20,4) DEFAULT 0;
