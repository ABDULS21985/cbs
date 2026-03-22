-- =============================================================================
-- V70: DSPM – Data Security & Privacy Management
-- Scan results, data classification, policy rules, exception management,
-- identity access tracking, access audit trail
-- =============================================================================

-- ── 1  DATA SOURCE PROFILE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.dspm_data_source (
    id                  BIGSERIAL       PRIMARY KEY,
    source_code         VARCHAR(30)     NOT NULL UNIQUE,
    source_name         VARCHAR(200)    NOT NULL,
    source_type         VARCHAR(30)     NOT NULL DEFAULT 'DATABASE',
    connection_ref      VARCHAR(200),
    environment         VARCHAR(20)     NOT NULL DEFAULT 'PRODUCTION',
    owner               VARCHAR(100),
    classification      VARCHAR(30)     NOT NULL DEFAULT 'UNCLASSIFIED',
    sensitivity_level   VARCHAR(20)     NOT NULL DEFAULT 'LOW',
    tags                JSONB           NOT NULL DEFAULT '[]',
    last_scan_at        TIMESTAMPTZ,
    record_count        BIGINT          NOT NULL DEFAULT 0,
    pii_fields_count    INTEGER         NOT NULL DEFAULT 0,
    status              VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dspm_ds_class ON cbs.dspm_data_source(classification);
CREATE INDEX IF NOT EXISTS idx_dspm_ds_status ON cbs.dspm_data_source(status);

-- ── 2  SCAN ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.dspm_scan (
    id                  BIGSERIAL       PRIMARY KEY,
    scan_code           VARCHAR(30)     NOT NULL UNIQUE,
    scan_type           VARCHAR(20)     NOT NULL DEFAULT 'FULL',
    scope               VARCHAR(30)     NOT NULL DEFAULT 'ALL',
    asset_types         JSONB           NOT NULL DEFAULT '[]',
    full_scan           BOOLEAN         NOT NULL DEFAULT TRUE,
    triggered_by        VARCHAR(100),
    source_id           BIGINT          REFERENCES cbs.dspm_data_source(id),
    total_assets        INTEGER         NOT NULL DEFAULT 0,
    assets_scanned      INTEGER         NOT NULL DEFAULT 0,
    issues_found        INTEGER         NOT NULL DEFAULT 0,
    critical_findings   INTEGER         NOT NULL DEFAULT 0,
    high_findings       INTEGER         NOT NULL DEFAULT 0,
    medium_findings     INTEGER         NOT NULL DEFAULT 0,
    low_findings        INTEGER         NOT NULL DEFAULT 0,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    duration_sec        INTEGER         NOT NULL DEFAULT 0,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dspm_scan_status ON cbs.dspm_scan(status);
CREATE INDEX IF NOT EXISTS idx_dspm_scan_source ON cbs.dspm_scan(source_id);

-- ── 3  POLICY ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.dspm_policy (
    id                  BIGSERIAL       PRIMARY KEY,
    policy_code         VARCHAR(30)     NOT NULL UNIQUE,
    policy_name         VARCHAR(200)    NOT NULL,
    policy_type         VARCHAR(30)     NOT NULL DEFAULT 'DATA_ACCESS',
    description         TEXT,
    severity            VARCHAR(20)     NOT NULL DEFAULT 'MEDIUM',
    rule                JSONB           NOT NULL DEFAULT '{}',
    data_types          JSONB           NOT NULL DEFAULT '[]',
    applies_to          JSONB           NOT NULL DEFAULT '[]',
    enforcement_action  VARCHAR(30)     NOT NULL DEFAULT 'ALERT',
    auto_remediate      BOOLEAN         NOT NULL DEFAULT FALSE,
    violation_count     INTEGER         NOT NULL DEFAULT 0,
    last_triggered_at   TIMESTAMPTZ,
    status              VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dspm_policy_status ON cbs.dspm_policy(status);
CREATE INDEX IF NOT EXISTS idx_dspm_policy_type ON cbs.dspm_policy(policy_type);

-- ── 4  EXCEPTION ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.dspm_exception (
    id                  BIGSERIAL       PRIMARY KEY,
    exception_code      VARCHAR(30)     NOT NULL UNIQUE,
    policy_id           BIGINT          REFERENCES cbs.dspm_policy(id),
    source_id           BIGINT          REFERENCES cbs.dspm_data_source(id),
    exception_type      VARCHAR(30)     NOT NULL DEFAULT 'FALSE_POSITIVE',
    reason              TEXT            NOT NULL DEFAULT '',
    risk_accepted       BOOLEAN         NOT NULL DEFAULT FALSE,
    approved_by         VARCHAR(100),
    approved_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dspm_exc_status ON cbs.dspm_exception(status);
CREATE INDEX IF NOT EXISTS idx_dspm_exc_policy ON cbs.dspm_exception(policy_id);

-- ── 5  IDENTITY (tracked data accessor) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.dspm_identity (
    id                  BIGSERIAL       PRIMARY KEY,
    identity_code       VARCHAR(30)     NOT NULL UNIQUE,
    identity_name       VARCHAR(200)    NOT NULL,
    identity_type       VARCHAR(20)     NOT NULL DEFAULT 'USER',
    email               VARCHAR(200),
    department          VARCHAR(100),
    role                VARCHAR(100),
    access_level        VARCHAR(20)     NOT NULL DEFAULT 'READ',
    data_sources_count  INTEGER         NOT NULL DEFAULT 0,
    last_access_at      TIMESTAMPTZ,
    risk_score          NUMERIC(5,2)    NOT NULL DEFAULT 0,
    status              VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dspm_ident_status ON cbs.dspm_identity(status);

-- ── 6  ACCESS AUDIT ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.dspm_access_audit (
    id                  BIGSERIAL       PRIMARY KEY,
    audit_code          VARCHAR(30)     NOT NULL UNIQUE,
    identity_id         BIGINT          NOT NULL REFERENCES cbs.dspm_identity(id),
    source_id           BIGINT          REFERENCES cbs.dspm_data_source(id),
    action              VARCHAR(30)     NOT NULL DEFAULT 'READ',
    resource_path       VARCHAR(500),
    query_text          TEXT,
    records_affected    INTEGER         NOT NULL DEFAULT 0,
    sensitive_fields    JSONB           NOT NULL DEFAULT '[]',
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(300),
    outcome             VARCHAR(20)     NOT NULL DEFAULT 'SUCCESS',
    risk_flag           BOOLEAN         NOT NULL DEFAULT FALSE,
    policy_id           BIGINT          REFERENCES cbs.dspm_policy(id),
    occurred_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dspm_audit_identity ON cbs.dspm_access_audit(identity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_dspm_audit_source ON cbs.dspm_access_audit(source_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_dspm_audit_risk ON cbs.dspm_access_audit(risk_flag) WHERE risk_flag = TRUE;
