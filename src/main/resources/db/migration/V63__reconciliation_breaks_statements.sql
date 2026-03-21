-- ============================================================================
-- V61: Reconciliation break management, statement imports, auto-fetch configs
-- ============================================================================

-- ─── Statement Imports ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cbs.statement_import (
    id                  BIGSERIAL       PRIMARY KEY,
    position_id         BIGINT          REFERENCES cbs.nostro_vostro_position(id),
    account_number      VARCHAR(40)     NOT NULL,
    bank_name           VARCHAR(200)    NOT NULL,
    filename            VARCHAR(300)    NOT NULL,
    format              VARCHAR(10)     NOT NULL CHECK (format IN ('CSV','MT940','XML','SWIFT')),
    statement_date      DATE,
    opening_balance     DECIMAL(18,2),
    closing_balance     DECIMAL(18,2),
    currency            VARCHAR(3),
    total_credits       DECIMAL(18,2),
    total_debits        DECIMAL(18,2),
    entries_count       INTEGER         NOT NULL DEFAULT 0,
    status              VARCHAR(15)     NOT NULL DEFAULT 'PENDING'
                                        CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','PARTIAL','REJECTED')),
    imported_by         VARCHAR(100),
    errors              TEXT,
    raw_entries         JSONB           DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stmt_import_position ON cbs.statement_import(position_id);
CREATE INDEX IF NOT EXISTS idx_stmt_import_status   ON cbs.statement_import(status);
CREATE INDEX IF NOT EXISTS idx_stmt_import_date     ON cbs.statement_import(created_at);

-- ─── Reconciliation Breaks ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cbs.reconciliation_break (
    id                  BIGSERIAL       PRIMARY KEY,
    position_id         BIGINT          REFERENCES cbs.nostro_vostro_position(id),
    recon_item_id       BIGINT          REFERENCES cbs.nostro_reconciliation_item(id),
    account_number      VARCHAR(40)     NOT NULL,
    bank_name           VARCHAR(200)    NOT NULL,
    currency            VARCHAR(3)      NOT NULL,
    amount              DECIMAL(18,2)   NOT NULL,
    direction           VARCHAR(1)      NOT NULL CHECK (direction IN ('D','C')),
    detected_date       DATE            NOT NULL DEFAULT CURRENT_DATE,
    assigned_to         VARCHAR(100),
    status              VARCHAR(15)     NOT NULL DEFAULT 'OPEN'
                                        CHECK (status IN ('OPEN','IN_PROGRESS','ESCALATED','RESOLVED','WRITTEN_OFF')),
    escalation_level    VARCHAR(15)     DEFAULT 'OFFICER'
                                        CHECK (escalation_level IN ('OFFICER','TEAM_LEAD','OPS_MANAGER','CFO')),
    sla_deadline        TIMESTAMPTZ,
    resolution_type     VARCHAR(20),
    resolution_notes    TEXT,
    resolved_date       DATE,
    resolved_by         VARCHAR(100),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recon_break_status   ON cbs.reconciliation_break(status);
CREATE INDEX IF NOT EXISTS idx_recon_break_position ON cbs.reconciliation_break(position_id);
CREATE INDEX IF NOT EXISTS idx_recon_break_assigned ON cbs.reconciliation_break(assigned_to);
CREATE INDEX IF NOT EXISTS idx_recon_break_detected ON cbs.reconciliation_break(detected_date);

-- ─── Break Timeline Entries ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cbs.break_timeline_entry (
    id                  BIGSERIAL       PRIMARY KEY,
    break_id            BIGINT          NOT NULL REFERENCES cbs.reconciliation_break(id) ON DELETE CASCADE,
    timestamp           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    actor               VARCHAR(100)    NOT NULL,
    action              VARCHAR(200)    NOT NULL,
    notes               TEXT,
    entry_type          VARCHAR(15)     NOT NULL DEFAULT 'INFO'
                                        CHECK (entry_type IN ('INFO','ACTION','RESOLVED','ESCALATED'))
);

CREATE INDEX IF NOT EXISTS idx_break_timeline_break ON cbs.break_timeline_entry(break_id);

-- ─── Auto-Fetch Configurations ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cbs.auto_fetch_config (
    id                  BIGSERIAL       PRIMARY KEY,
    bank_name           VARCHAR(200)    NOT NULL,
    protocol            VARCHAR(10)     NOT NULL CHECK (protocol IN ('SFTP','SWIFT','API')),
    host                VARCHAR(300)    NOT NULL,
    schedule            VARCHAR(50)     NOT NULL DEFAULT '0 6 * * *',
    last_fetch          TIMESTAMPTZ,
    status              VARCHAR(10)     NOT NULL DEFAULT 'INACTIVE'
                                        CHECK (status IN ('ACTIVE','INACTIVE','ERROR')),
    account_pattern     VARCHAR(100),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT          DEFAULT 0
);
