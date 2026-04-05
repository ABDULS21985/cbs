-- ============================================================================
-- V112: Investment pool schema alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.investment_pool
    ADD COLUMN IF NOT EXISTS indicative_rate NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS primary_contract_type VARCHAR(30)
        CHECK (primary_contract_type IN (
            'MUDARABAH','MUSHARAKAH','WAKALAH','IJARAH','MURABAHA','SALAM',
            'ISTISNA','SUKUK','QARD','WADIAH','TAKAFUL','MIXED'
        )),
    ADD COLUMN IF NOT EXISTS max_per_retention_pct NUMERIC(8,4) NOT NULL DEFAULT 50.0000,
    ADD COLUMN IF NOT EXISTS max_irr_retention_pct NUMERIC(8,4) NOT NULL DEFAULT 25.0000,
    ADD COLUMN IF NOT EXISTS max_total_reserve_pct NUMERIC(8,4) NOT NULL DEFAULT 75.0000;