-- ============================================================================
-- V114: Murabaha contract schema alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

ALTER TABLE cbs.murabaha_contracts
    ADD COLUMN IF NOT EXISTS profit_recognition_suspended BOOLEAN NOT NULL DEFAULT FALSE;