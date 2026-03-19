-- V49: Virtual account extensions — transactions, matching rules, sweep history

-- ── VA Transactions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS va_transaction (
    id                  BIGSERIAL       PRIMARY KEY,
    va_id               BIGINT          NOT NULL REFERENCES virtual_account(id),
    transaction_date    TIMESTAMP       NOT NULL DEFAULT now(),
    reference           VARCHAR(100)    NOT NULL,
    description         VARCHAR(500),
    amount              NUMERIC(20,4)   NOT NULL,
    transaction_type    VARCHAR(10)     NOT NULL CHECK (transaction_type IN ('CREDIT','DEBIT','SWEEP')),
    match_status        VARCHAR(10)     NOT NULL DEFAULT 'UNMATCHED' CHECK (match_status IN ('MATCHED','UNMATCHED','PARTIAL')),
    matched_ref         VARCHAR(100),
    created_at          TIMESTAMP       NOT NULL DEFAULT now()
);

CREATE INDEX idx_va_txn_va_id ON va_transaction(va_id, transaction_date DESC);
CREATE INDEX idx_va_txn_match  ON va_transaction(va_id, match_status);

-- ── VA Matching Rules ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS va_matching_rule (
    id          BIGSERIAL       PRIMARY KEY,
    va_id       BIGINT          NOT NULL REFERENCES virtual_account(id),
    rule_type   VARCHAR(20)     NOT NULL CHECK (rule_type IN ('REFERENCE_PREFIX','REGEX','EXACT')),
    rule_value  VARCHAR(200)    NOT NULL,
    priority    INT             NOT NULL DEFAULT 1,
    created_at  TIMESTAMP       NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT now()
);

CREATE INDEX idx_va_rule_va_id ON va_matching_rule(va_id, priority);

-- ── VA Sweep History ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS va_sweep_history (
    id              BIGSERIAL       PRIMARY KEY,
    va_id           BIGINT          NOT NULL REFERENCES virtual_account(id),
    sweep_amount    NUMERIC(20,4)   NOT NULL,
    direction       VARCHAR(15)     NOT NULL DEFAULT 'TO_MASTER',
    balance_before  NUMERIC(20,4)   NOT NULL,
    balance_after   NUMERIC(20,4)   NOT NULL,
    swept_at        TIMESTAMP       NOT NULL DEFAULT now()
);

CREATE INDEX idx_va_sweep_va_id ON va_sweep_history(va_id, swept_at DESC);
