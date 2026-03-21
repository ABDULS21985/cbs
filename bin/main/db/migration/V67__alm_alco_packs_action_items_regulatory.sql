-- =============================================================================
-- V67: ALM ALCO Packs, Action Items, Regulatory Returns & Submissions
-- =============================================================================

-- ── ALCO Pack ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.alco_pack (
    id                  BIGSERIAL       PRIMARY KEY,
    month               VARCHAR(7)      NOT NULL,               -- e.g. '2026-03'
    sections            JSONB           NOT NULL DEFAULT '[]',   -- ordered list of section IDs
    executive_summary   TEXT            NOT NULL DEFAULT '',
    status              VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',-- DRAFT, PENDING_REVIEW, APPROVED, DISTRIBUTED
    prepared_by         VARCHAR(100),
    approved_by         VARCHAR(100),
    approved_at         TIMESTAMPTZ,
    distributed_at      TIMESTAMPTZ,
    pack_version        INT             NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version             BIGINT          NOT NULL DEFAULT 0       -- optimistic lock
);
CREATE INDEX IF NOT EXISTS idx_alco_pack_month ON cbs.alco_pack(month);
CREATE INDEX IF NOT EXISTS idx_alco_pack_status ON cbs.alco_pack(status);

-- ── ALCO Action Item ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.alco_action_item (
    id              BIGSERIAL       PRIMARY KEY,
    item_number     VARCHAR(20)     NOT NULL,
    description     TEXT            NOT NULL,
    owner           VARCHAR(100)    NOT NULL,
    due_date        DATE            NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'OPEN',  -- OPEN, IN_PROGRESS, CLOSED
    update_notes    TEXT            NOT NULL DEFAULT '',
    meeting_date    DATE            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version         BIGINT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alco_action_item_status ON cbs.alco_action_item(status);
CREATE INDEX IF NOT EXISTS idx_alco_action_item_meeting ON cbs.alco_action_item(meeting_date);

-- ── ALM Regulatory Return ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.alm_regulatory_return (
    id                      BIGSERIAL       PRIMARY KEY,
    code                    VARCHAR(20)     NOT NULL UNIQUE,    -- IRRBB, LCR, NSFR, SLR, LER
    name                    VARCHAR(100)    NOT NULL,
    frequency               VARCHAR(20)     NOT NULL,           -- DAILY, MONTHLY, QUARTERLY
    due_date                DATE            NOT NULL,
    next_due                DATE            NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'DRAFT', -- DRAFT, VALIDATED, SUBMITTED
    data                    JSONB           NOT NULL DEFAULT '{}',
    validation_errors       JSONB           NOT NULL DEFAULT '[]',
    validation_warnings     JSONB           NOT NULL DEFAULT '[]',
    last_submission_date    TIMESTAMPTZ,
    last_submitted_by       VARCHAR(100),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version                 BIGINT          NOT NULL DEFAULT 0
);

-- Seed standard returns
INSERT INTO cbs.alm_regulatory_return (code, name, frequency, due_date, next_due) VALUES
    ('IRRBB', 'IRRBB Report', 'QUARTERLY', '2026-03-31', '2026-06-30'),
    ('LCR',   'LCR Return',   'DAILY',     '2026-03-21', '2026-03-22'),
    ('NSFR',  'NSFR Return',  'MONTHLY',   '2026-03-31', '2026-04-30'),
    ('SLR',   'Structural Liquidity Return', 'MONTHLY', '2026-03-31', '2026-04-30'),
    ('LER',   'Large Exposure Return', 'QUARTERLY', '2026-03-31', '2026-06-30')
ON CONFLICT (code) DO NOTHING;

-- ── ALM Regulatory Submission ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbs.alm_regulatory_submission (
    id                  BIGSERIAL       PRIMARY KEY,
    return_id           BIGINT          NOT NULL REFERENCES cbs.alm_regulatory_return(id),
    return_code         VARCHAR(20)     NOT NULL,
    submission_date     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    submitted_by        VARCHAR(100)    NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, ACCEPTED, REJECTED
    reference_number    VARCHAR(50)     NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version             BIGINT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alm_reg_submission_return ON cbs.alm_regulatory_submission(return_id);
