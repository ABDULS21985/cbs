-- ============================================================================
-- V110: Ijarah asset schema alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.ijarah_assets
    ADD COLUMN IF NOT EXISTS impairment_provision_balance NUMERIC(18,2) NOT NULL DEFAULT 0;