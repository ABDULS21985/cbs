-- ============================================================================
-- V118: Regulatory reporting schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cbs;

CREATE TABLE IF NOT EXISTS cbs.regulatory_return_templates (
    id                                  BIGSERIAL PRIMARY KEY,
    template_code                       VARCHAR(80) NOT NULL UNIQUE,
    jurisdiction                        VARCHAR(20) NOT NULL CHECK (jurisdiction IN (
                                            'SA_SAMA','AE_CBUAE','QA_QCB','BH_CBB','KW_CBK','OM_CBO','NG_CBN')),
    return_type                         VARCHAR(40) NOT NULL CHECK (return_type IN (
                                            'BALANCE_SHEET','INCOME_STATEMENT','CAPITAL_ADEQUACY','ASSET_QUALITY',
                                            'FINANCING_PORTFOLIO','INVESTMENT_ACCOUNTS','PROFIT_DISTRIBUTION',
                                            'LIQUIDITY','CONCENTRATION','FX_POSITION','OFF_BALANCE_SHEET',
                                            'SHARIAH_COMPLIANCE','AML_STATISTICAL','PER_IRR','ZAKAT')),
    name                                VARCHAR(255) NOT NULL,
    name_ar                             VARCHAR(255),
    description                         TEXT,
    version_number                      INT NOT NULL,
    effective_from                      DATE NOT NULL,
    effective_to                        DATE,
    sections                            JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_rules                    JSONB NOT NULL DEFAULT '[]'::jsonb,
    cross_validations                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_format                       VARCHAR(20) NOT NULL CHECK (output_format IN (
                                            'JSON','XML','XBRL','CSV','EXCEL','PDF')),
    xbrl_taxonomy                       VARCHAR(150),
    reporting_frequency                 VARCHAR(20) NOT NULL CHECK (reporting_frequency IN (
                                            'MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL','AD_HOC')),
    filing_deadline_days_after_period   INT NOT NULL,
    regulator_form_number               VARCHAR(80),
    regulator_portal_url                VARCHAR(255),
    is_active                           BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by                         VARCHAR(100),
    tenant_id                           BIGINT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_regulatory_templates_jurisdiction_type
    ON cbs.regulatory_return_templates (jurisdiction, return_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_templates_active
    ON cbs.regulatory_return_templates (is_active, tenant_id);

CREATE TABLE IF NOT EXISTS cbs.regulatory_returns (
    id                                  BIGSERIAL PRIMARY KEY,
    return_ref                          VARCHAR(100) NOT NULL UNIQUE,
    template_id                         BIGINT NOT NULL REFERENCES cbs.regulatory_return_templates(id),
    template_code                       VARCHAR(80) NOT NULL,
    jurisdiction                        VARCHAR(20) NOT NULL CHECK (jurisdiction IN (
                                            'SA_SAMA','AE_CBUAE','QA_QCB','BH_CBB','KW_CBK','OM_CBO','NG_CBN')),
    return_type                         VARCHAR(40) NOT NULL CHECK (return_type IN (
                                            'BALANCE_SHEET','INCOME_STATEMENT','CAPITAL_ADEQUACY','ASSET_QUALITY',
                                            'FINANCING_PORTFOLIO','INVESTMENT_ACCOUNTS','PROFIT_DISTRIBUTION',
                                            'LIQUIDITY','CONCENTRATION','FX_POSITION','OFF_BALANCE_SHEET',
                                            'SHARIAH_COMPLIANCE','AML_STATISTICAL','PER_IRR','ZAKAT')),
    reporting_period_type               VARCHAR(20) NOT NULL CHECK (reporting_period_type IN (
                                            'MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL','AD_HOC')),
    period_from                         DATE NOT NULL,
    period_to                           DATE NOT NULL,
    reporting_date                      DATE NOT NULL,
    currency_code                       VARCHAR(3) NOT NULL,
    data_extraction_status              VARCHAR(20) NOT NULL CHECK (data_extraction_status IN (
                                            'PENDING','IN_PROGRESS','COMPLETED','FAILED')),
    data_extracted_at                   TIMESTAMP,
    data_extracted_by                   VARCHAR(100),
    extraction_errors                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    return_data                         JSONB NOT NULL DEFAULT '{}'::jsonb,
    return_data_version                 INT NOT NULL DEFAULT 1,
    validation_status                   VARCHAR(20) NOT NULL CHECK (validation_status IN (
                                            'NOT_VALIDATED','VALID','INVALID','WARNINGS')),
    validation_errors                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_warnings                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    cross_validation_status             VARCHAR(20) CHECK (cross_validation_status IN (
                                            'NOT_CHECKED','PASSED','FAILED')),
    status                              VARCHAR(30) NOT NULL CHECK (status IN (
                                            'DRAFT','GENERATED','VALIDATED','UNDER_REVIEW','APPROVED',
                                            'SUBMITTED','ACKNOWLEDGED','REJECTED_BY_REGULATOR','REVISED','FINAL')),
    generated_by                        VARCHAR(100),
    generated_at                        TIMESTAMP,
    reviewed_by                         VARCHAR(100),
    reviewed_at                         TIMESTAMP,
    approved_by                         VARCHAR(100),
    approved_at                         TIMESTAMP,
    submitted_by                        VARCHAR(100),
    submitted_at                        TIMESTAMP,
    submission_method                   VARCHAR(20) CHECK (submission_method IN ('PORTAL_UPLOAD','API','EMAIL','MANUAL')),
    regulator_reference_number          VARCHAR(120),
    regulator_acknowledged_at           TIMESTAMP,
    regulator_feedback                  TEXT,
    filing_deadline                     DATE NOT NULL,
    deadline_breach                     BOOLEAN NOT NULL DEFAULT FALSE,
    is_amendment                        BOOLEAN NOT NULL DEFAULT FALSE,
    original_return_id                  BIGINT REFERENCES cbs.regulatory_returns(id),
    amendment_reason                    TEXT,
    previous_period_return_id           BIGINT REFERENCES cbs.regulatory_returns(id),
    variance_from_previous              JSONB NOT NULL DEFAULT '{}'::jsonb,
    tenant_id                           BIGINT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_regulatory_returns_template
    ON cbs.regulatory_returns (template_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_returns_status_deadline
    ON cbs.regulatory_returns (status, filing_deadline);
CREATE INDEX IF NOT EXISTS idx_regulatory_returns_period
    ON cbs.regulatory_returns (jurisdiction, return_type, period_from, period_to);

CREATE TABLE IF NOT EXISTS cbs.regulatory_return_line_items (
    id                                  BIGSERIAL PRIMARY KEY,
    return_id                           BIGINT NOT NULL REFERENCES cbs.regulatory_returns(id) ON DELETE CASCADE,
    line_number                         VARCHAR(40) NOT NULL,
    section_code                        VARCHAR(40),
    line_description                    VARCHAR(255) NOT NULL,
    line_description_ar                 VARCHAR(255),
    data_type                           VARCHAR(20) NOT NULL CHECK (data_type IN (
                                            'AMOUNT','PERCENTAGE','COUNT','TEXT','DATE','BOOLEAN')),
    line_value                          TEXT,
    previous_period_value               TEXT,
    variance                            TEXT,
    variance_percentage                 NUMERIC(18,6),
    source_type                         VARCHAR(20) CHECK (source_type IN (
                                            'GL_BALANCE','GL_MOVEMENT','CALCULATED','MANUAL','CROSS_REFERENCE',
                                            'CONSTANT','ENTITY_QUERY','ENTITY_COUNT','ECL_DATA','POOL_DATA')),
    source_gl_account_code              VARCHAR(120),
    source_query                        TEXT,
    calculation_formula                 TEXT,
    manual_override                     BOOLEAN NOT NULL DEFAULT FALSE,
    manual_override_by                  VARCHAR(100),
    manual_override_reason              TEXT,
    is_valid                            BOOLEAN NOT NULL DEFAULT TRUE,
    validation_message                  TEXT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_regulatory_return_line UNIQUE (return_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_regulatory_line_items_section
    ON cbs.regulatory_return_line_items (return_id, section_code, line_number);

CREATE TABLE IF NOT EXISTS cbs.return_audit_events (
    id                                  BIGSERIAL PRIMARY KEY,
    return_id                           BIGINT NOT NULL REFERENCES cbs.regulatory_returns(id) ON DELETE CASCADE,
    event_type                          VARCHAR(30) NOT NULL CHECK (event_type IN (
                                            'GENERATED','REGENERATED','LINE_OVERRIDDEN','VALIDATED','REVIEWED',
                                            'APPROVED','SUBMITTED','ACKNOWLEDGED','REJECTED','AMENDED')),
    event_timestamp                     TIMESTAMP NOT NULL,
    performed_by                        VARCHAR(100) NOT NULL,
    details                             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_return_audit_events_return_timestamp
    ON cbs.return_audit_events (return_id, event_timestamp DESC);