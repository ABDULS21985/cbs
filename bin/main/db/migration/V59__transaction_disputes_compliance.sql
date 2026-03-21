SET search_path TO cbs;

CREATE SEQUENCE IF NOT EXISTS transaction_dispute_ref_seq START 1;
CREATE SEQUENCE IF NOT EXISTS transaction_reversal_req_seq START 1;

CREATE TABLE IF NOT EXISTS transaction_audit_event (
    id                  BIGSERIAL PRIMARY KEY,
    transaction_id      BIGINT NOT NULL REFERENCES transaction_journal(id) ON DELETE CASCADE,
    event_type          VARCHAR(40) NOT NULL,
    actor               VARCHAR(100),
    actor_role          VARCHAR(100),
    channel             VARCHAR(20),
    description         VARCHAR(500),
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_timestamp     TIMESTAMP NOT NULL DEFAULT now(),
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_event_txn_time
    ON transaction_audit_event(transaction_id, event_timestamp DESC);

CREATE TABLE IF NOT EXISTS transaction_dispute (
    id                      BIGSERIAL PRIMARY KEY,
    dispute_ref             VARCHAR(30) NOT NULL UNIQUE,
    transaction_id          BIGINT NOT NULL REFERENCES transaction_journal(id),
    transaction_ref         VARCHAR(30) NOT NULL,
    account_id              BIGINT NOT NULL REFERENCES account(id),
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    amount                  NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    reason_code             VARCHAR(30) NOT NULL,
    description             TEXT NOT NULL,
    contact_email           VARCHAR(150),
    contact_phone           VARCHAR(20),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    assigned_to             VARCHAR(100),
    response_notes          TEXT,
    escalation_notes        TEXT,
    closing_notes           TEXT,
    supporting_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    filed_at                TIMESTAMP NOT NULL DEFAULT now(),
    last_updated_at         TIMESTAMP NOT NULL DEFAULT now(),
    filed_by                VARCHAR(100),
    updated_by              VARCHAR(100),
    closed_at               TIMESTAMP,
    closed_by               VARCHAR(100),
    version                 BIGINT
);

CREATE INDEX IF NOT EXISTS idx_transaction_dispute_status_updated
    ON transaction_dispute(status, last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_dispute_transaction
    ON transaction_dispute(transaction_id);

CREATE TABLE IF NOT EXISTS transaction_reversal_request (
    id                  BIGSERIAL PRIMARY KEY,
    request_ref         VARCHAR(30) NOT NULL UNIQUE,
    transaction_id      BIGINT NOT NULL REFERENCES transaction_journal(id),
    transaction_ref     VARCHAR(30) NOT NULL,
    amount              NUMERIC(18,2) NOT NULL,
    currency_code       VARCHAR(3) NOT NULL,
    reason_category     VARCHAR(40) NOT NULL,
    sub_reason          VARCHAR(80),
    notes               TEXT,
    requested_settlement VARCHAR(30) NOT NULL DEFAULT 'IMMEDIATE',
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    approval_request_id BIGINT REFERENCES approval_request(id),
    requested_by        VARCHAR(100) NOT NULL,
    requested_at        TIMESTAMP NOT NULL DEFAULT now(),
    approved_by         VARCHAR(100),
    approved_at         TIMESTAMP,
    rejected_by         VARCHAR(100),
    rejected_at         TIMESTAMP,
    rejection_reason    TEXT,
    reversal_ref        VARCHAR(40),
    advice_path         VARCHAR(500),
    version             BIGINT
);

CREATE INDEX IF NOT EXISTS idx_transaction_reversal_request_status
    ON transaction_reversal_request(status, requested_at DESC);
