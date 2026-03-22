-- Reconciliation Session persistence
-- Previously sessions were ephemeral / in-memory; this table stores them durably.

CREATE TABLE IF NOT EXISTS cbs.recon_session (
    id              BIGSERIAL PRIMARY KEY,
    session_ref     VARCHAR(30)  NOT NULL UNIQUE,
    recon_type      VARCHAR(20)  NOT NULL DEFAULT 'NOSTRO',
    position_id     BIGINT       REFERENCES cbs.nostro_vostro_position(id),
    recon_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    our_count       INT          NOT NULL DEFAULT 0,
    cp_count        INT          NOT NULL DEFAULT 0,
    matched_count   INT          NOT NULL DEFAULT 0,
    unmatched_count INT          NOT NULL DEFAULT 0,
    written_off_count INT        NOT NULL DEFAULT 0,
    created_by      VARCHAR(100),
    completed_by    VARCHAR(100),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX idx_recon_session_status ON cbs.recon_session(status);
CREATE INDEX idx_recon_session_recon_date ON cbs.recon_session(recon_date);
