-- Approval workflow table
CREATE TABLE IF NOT EXISTS cbs.approval_request (
    id                  BIGSERIAL PRIMARY KEY,
    request_code        VARCHAR(30)  NOT NULL UNIQUE,
    entity_type         VARCHAR(50)  NOT NULL,
    entity_id           BIGINT       NOT NULL,
    requested_action    VARCHAR(30)  NOT NULL,
    requested_by        VARCHAR(100) NOT NULL,
    requested_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    approver_role       VARCHAR(50)  NOT NULL,
    approved_by         VARCHAR(100),
    approved_at         TIMESTAMPTZ,
    rejected_by         VARCHAR(100),
    rejected_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    priority            VARCHAR(10)  NOT NULL DEFAULT 'NORMAL',
    notes               TEXT,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version             BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX idx_approval_request_status ON cbs.approval_request(status);
CREATE INDEX idx_approval_request_requested_by ON cbs.approval_request(requested_by);
CREATE INDEX idx_approval_request_approver_role ON cbs.approval_request(approver_role);
CREATE INDEX idx_approval_request_entity ON cbs.approval_request(entity_type, entity_id);

CREATE SEQUENCE IF NOT EXISTS cbs.approval_request_code_seq START WITH 1000;
