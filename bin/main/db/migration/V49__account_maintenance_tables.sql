-- ============================================================================
-- V49: Account Maintenance — Interest Rate Overrides, Account Limits
-- ============================================================================

-- Interest rate override history / active overrides
CREATE TABLE IF NOT EXISTS cbs.interest_rate_override (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT          NOT NULL REFERENCES cbs.account(id),
    override_rate   NUMERIC(8,4)    NOT NULL,
    original_rate   NUMERIC(8,4)    NOT NULL,
    reason          TEXT            NOT NULL,
    effective_date  DATE            NOT NULL,
    expiry_date     DATE            NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    approved_by     VARCHAR(100),
    performed_by    VARCHAR(100),
    created_at      TIMESTAMP       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT now(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT          NOT NULL DEFAULT 0,

    CONSTRAINT chk_override_rate_range CHECK (override_rate >= 0 AND override_rate <= 100),
    CONSTRAINT chk_override_dates CHECK (expiry_date > effective_date)
);

CREATE INDEX idx_iro_account     ON cbs.interest_rate_override(account_id);
CREATE INDEX idx_iro_active      ON cbs.interest_rate_override(account_id, is_active) WHERE is_active = true;
CREATE INDEX idx_iro_expiry      ON cbs.interest_rate_override(expiry_date) WHERE is_active = true;

-- Per-account transaction / channel limits
CREATE TABLE IF NOT EXISTS cbs.account_limit (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT          NOT NULL REFERENCES cbs.account(id),
    limit_type      VARCHAR(30)     NOT NULL,
    limit_value     NUMERIC(18,2)   NOT NULL,
    previous_value  NUMERIC(18,2),
    reason          TEXT            NOT NULL,
    effective_date  DATE            NOT NULL DEFAULT CURRENT_DATE,
    performed_by    VARCHAR(100),
    created_at      TIMESTAMP       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT now(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT          NOT NULL DEFAULT 0,

    CONSTRAINT chk_limit_value_positive CHECK (limit_value >= 0),
    CONSTRAINT uq_account_limit_type UNIQUE (account_id, limit_type)
);

CREATE INDEX idx_al_account ON cbs.account_limit(account_id);
