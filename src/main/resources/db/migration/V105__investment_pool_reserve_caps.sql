-- ---------------------------------------------------------------------------
-- V105: Add configurable reserve caps and primary contract type to investment_pool
-- ---------------------------------------------------------------------------
-- These columns allow SSB to configure per-pool PER/IRR retention caps
-- instead of relying on system-wide hardcoded defaults. Also adds a formal
-- primary_contract_type column to replace string-based contract type detection.
-- ---------------------------------------------------------------------------

ALTER TABLE cbs.investment_pool
    ADD COLUMN IF NOT EXISTS primary_contract_type      VARCHAR(30),
    ADD COLUMN IF NOT EXISTS max_per_retention_pct       NUMERIC(8, 4) NOT NULL DEFAULT 50.0000,
    ADD COLUMN IF NOT EXISTS max_irr_retention_pct       NUMERIC(8, 4) NOT NULL DEFAULT 25.0000,
    ADD COLUMN IF NOT EXISTS max_total_reserve_pct       NUMERIC(8, 4) NOT NULL DEFAULT 75.0000;

COMMENT ON COLUMN cbs.investment_pool.primary_contract_type IS 'Primary Islamic contract type for this pool (MUDARABAH, MUSHARAKAH). Used for loss allocation rules.';
COMMENT ON COLUMN cbs.investment_pool.max_per_retention_pct IS 'Maximum PER retention as % of depositor pool. SSB-configurable per pool. Default 50%.';
COMMENT ON COLUMN cbs.investment_pool.max_irr_retention_pct IS 'Maximum IRR retention as % of post-PER pool. SSB-configurable per pool. Default 25%.';
COMMENT ON COLUMN cbs.investment_pool.max_total_reserve_pct IS 'Maximum total reserves (PER+IRR) as % of depositor pool. SSB-configurable per pool. Default 75%.';

CREATE INDEX IF NOT EXISTS idx_investment_pool_contract_type ON cbs.investment_pool (primary_contract_type);
