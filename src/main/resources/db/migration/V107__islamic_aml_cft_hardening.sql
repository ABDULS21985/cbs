-- ============================================================================
-- V107: Islamic AML/CFT Hardening — Combined Screening Audit Support
-- ============================================================================
SET search_path TO cbs;

CREATE TABLE IF NOT EXISTS combined_screening_audit_log (
    id                      BIGSERIAL PRIMARY KEY,
    entity_name             VARCHAR(300) NOT NULL,
    outcome                 VARCHAR(30) NOT NULL
                            CHECK (outcome IN (
                                'CLEAR', 'SHARIAH_BLOCKED', 'SANCTIONS_BLOCKED', 'DUAL_BLOCKED'
                            )),
    shariah_clear           BOOLEAN NOT NULL DEFAULT false,
    sanctions_clear         BOOLEAN NOT NULL DEFAULT false,
    shariah_screening_ref   VARCHAR(50),
    sanctions_screening_ref VARCHAR(50),
    action_required         VARCHAR(100),
    screened_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_outcome
    ON combined_screening_audit_log(outcome);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_screened_at
    ON combined_screening_audit_log(screened_at);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_created_at
    ON combined_screening_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_combined_screening_audit_tenant
    ON combined_screening_audit_log(tenant_id);
