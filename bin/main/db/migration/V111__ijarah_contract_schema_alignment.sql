-- ============================================================================
-- V111: Ijarah contract schema alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.ijarah_contracts
    ADD COLUMN IF NOT EXISTS late_penalty_method VARCHAR(30)
        CHECK (late_penalty_method IN ('PERCENTAGE_OF_OVERDUE','FLAT_PER_INSTALLMENT','DAILY_RATE')),
    ADD COLUMN IF NOT EXISTS last_screening_ref VARCHAR(50);

UPDATE cbs.ijarah_contracts
SET late_penalty_method = COALESCE(late_penalty_method, 'PERCENTAGE_OF_OVERDUE')
WHERE late_penalty_method IS NULL;