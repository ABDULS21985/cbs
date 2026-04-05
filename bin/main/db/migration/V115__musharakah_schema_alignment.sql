-- ============================================================================
-- V115: Musharakah schema alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.musharakah_loss_events
    ADD COLUMN IF NOT EXISTS requires_compliance_verification BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS insurance_recovery_status VARCHAR(30);

ALTER TABLE cbs.musharakah_ownership_units
    ADD COLUMN IF NOT EXISTS last_appraiser VARCHAR(200),
    ADD COLUMN IF NOT EXISTS last_valuation_ref VARCHAR(100);