-- V79: Add recommendation/targetPrice/instrumentCode to research_publication
--      and create market_research_project table

ALTER TABLE research_publication
    ADD COLUMN IF NOT EXISTS instrument_code   VARCHAR(40),
    ADD COLUMN IF NOT EXISTS recommendation    VARCHAR(10)  CHECK (recommendation IN ('BUY','HOLD','SELL')),
    ADD COLUMN IF NOT EXISTS target_price      NUMERIC(18,4);

-- market_research_project table (backs /api/v1/market-research/*)
CREATE TABLE IF NOT EXISTS market_research_project (
    id              BIGSERIAL PRIMARY KEY,
    project_code    VARCHAR(30)  NOT NULL UNIQUE,
    title           VARCHAR(300) NOT NULL,
    project_type    VARCHAR(30)  NOT NULL
                        CHECK (project_type IN ('CUSTOMER_SURVEY','COMPETITIVE_ANALYSIS','PRODUCT_STUDY','MARKET_SIZING')),
    description     TEXT         NOT NULL,
    status          VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','COMPLETED')),
    findings        TEXT,
    key_insights    JSONB,
    action_items    JSONB,
    completed_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_mrp_status      ON market_research_project(status);
CREATE INDEX IF NOT EXISTS idx_mrp_project_type ON market_research_project(project_type);
