CREATE TABLE IF NOT EXISTS cbs.wadiah_statement_record (
    id                          BIGSERIAL PRIMARY KEY,
    statement_ref               VARCHAR(80) NOT NULL UNIQUE,
    account_id                  BIGINT NOT NULL REFERENCES cbs.wadiah_account(id) ON DELETE CASCADE,
    period_from                 DATE NOT NULL,
    period_to                   DATE NOT NULL,
    statement_data              JSONB NOT NULL,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wadiah_statement_record_account_period
    ON cbs.wadiah_statement_record (account_id, period_from, period_to);