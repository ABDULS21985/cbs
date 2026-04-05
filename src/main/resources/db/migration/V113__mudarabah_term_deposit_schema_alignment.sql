-- ============================================================================
-- V113: Mudarabah term deposit schema alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.mudarabah_term_deposit
    ADD COLUMN IF NOT EXISTS external_reference VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uk_mudarabah_td_external_reference
    ON cbs.mudarabah_term_deposit (external_reference)
    WHERE external_reference IS NOT NULL;