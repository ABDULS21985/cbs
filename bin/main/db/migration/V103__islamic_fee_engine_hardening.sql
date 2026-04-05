-- ============================================================================
-- V103__islamic_fee_engine_hardening.sql
-- Hardening for Islamic fee engine review findings
-- ============================================================================

ALTER TABLE late_penalty_records
    ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS blocked_reason VARCHAR(80);

UPDATE late_penalty_records
SET outstanding_amount = penalty_amount
WHERE outstanding_amount = 0
  AND status = 'CHARGED';

ALTER TABLE musharakah_buyout_installments
    ADD COLUMN IF NOT EXISTS late_penalty_amount NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS late_penalty_charity_journal_ref VARCHAR(40);

ALTER TABLE late_penalty_records
    DROP CONSTRAINT IF EXISTS late_penalty_records_status_check;

ALTER TABLE late_penalty_records
    ADD CONSTRAINT late_penalty_records_status_check
    CHECK (status IN ('CHARGED','REVERSED','WAIVED','BLOCKED'));
