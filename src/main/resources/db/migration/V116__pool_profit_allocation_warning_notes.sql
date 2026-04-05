-- ============================================================================
-- V116: Pool profit allocation warning notes alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.pool_profit_allocation
    ADD COLUMN IF NOT EXISTS warning_notes VARCHAR(500);