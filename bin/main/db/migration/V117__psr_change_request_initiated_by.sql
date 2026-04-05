-- ============================================================================
-- V117: PSR change request initiated-by alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.psr_change_request
    ADD COLUMN IF NOT EXISTS initiated_by VARCHAR(100);