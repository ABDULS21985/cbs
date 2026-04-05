-- ============================================================================
-- V109: Combined screening audit log schema alignment
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

CREATE TABLE IF NOT EXISTS cbs.combined_screening_audit_log (
    id                      BIGSERIAL PRIMARY KEY,
    entity_name             VARCHAR(300) NOT NULL,
    outcome                 VARCHAR(30) NOT NULL
                            CHECK (outcome IN (
                                'CLEAR', 'SHARIAH_BLOCKED', 'SANCTIONS_BLOCKED', 'DUAL_BLOCKED'
                            )),
    shariah_clear           BOOLEAN NOT NULL DEFAULT FALSE,
    sanctions_clear         BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_screening_ref   VARCHAR(50),
    sanctions_screening_ref VARCHAR(50),
    action_required         VARCHAR(100),
    screened_at             TIMESTAMP,
    tenant_id               BIGINT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_outcome
    ON cbs.combined_screening_audit_log(outcome);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_screened_at
    ON cbs.combined_screening_audit_log(screened_at);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_created_at
    ON cbs.combined_screening_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_tenant
    ON cbs.combined_screening_audit_log(tenant_id);