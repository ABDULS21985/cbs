SET search_path TO cbs;

ALTER TABLE IF EXISTS dealing_desk
    ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS activated_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS market_making_compliance_event (
    id                          BIGSERIAL PRIMARY KEY,
    mandate_id                  BIGINT NOT NULL REFERENCES market_making_mandate(id),
    event_date                  DATE NOT NULL,
    quote_time_pct              NUMERIC(8,2),
    spread_bps                  NUMERIC(8,2),
    compliance_status           VARCHAR(15) NOT NULL,
    breach_reason               VARCHAR(500),
    created_at                  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mm_compliance_event_mandate_date
    ON market_making_compliance_event(mandate_id, event_date DESC);
