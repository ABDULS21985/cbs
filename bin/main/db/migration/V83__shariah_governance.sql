-- V83: Shariah Governance Foundation
-- SSB Board Members, Fatwa Registry, Review Workflow, Voting, Audit Log

CREATE TABLE cbs.ssb_board_member (
    id                  BIGSERIAL       PRIMARY KEY,
    member_id           VARCHAR(30)     NOT NULL UNIQUE,
    full_name           VARCHAR(150)    NOT NULL,
    title               VARCHAR(80),
    qualifications      JSONB,
    specializations     JSONB,
    appointment_date    DATE            NOT NULL,
    expiry_date         DATE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    is_chairman         BOOLEAN         NOT NULL DEFAULT FALSE,
    voting_weight       INT             NOT NULL DEFAULT 1,
    contact_email       VARCHAR(150),
    contact_phone       VARCHAR(30),
    nationality         VARCHAR(60),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW(),
    version             BIGINT          DEFAULT 0
);

CREATE TABLE cbs.fatwa_record (
    id                          BIGSERIAL       PRIMARY KEY,
    fatwa_number                VARCHAR(30)     NOT NULL UNIQUE,
    fatwa_title                 VARCHAR(300)    NOT NULL,
    fatwa_category              VARCHAR(30)     NOT NULL,
    subject                     VARCHAR(500)    NOT NULL,
    full_text                   TEXT,
    aaoifi_references           JSONB,
    applicable_contract_types   JSONB,
    conditions                  TEXT,
    effective_date              DATE,
    expiry_date                 DATE,
    superseded_by_fatwa_id      BIGINT          REFERENCES cbs.fatwa_record(id),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    issued_by_board_id          BIGINT,
    approved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     DEFAULT NOW(),
    created_by                  VARCHAR(80),
    updated_by                  VARCHAR(80),
    version                     BIGINT          DEFAULT 0
);

CREATE INDEX idx_fatwa_record_status ON cbs.fatwa_record(status);
CREATE INDEX idx_fatwa_record_category ON cbs.fatwa_record(fatwa_category);

CREATE TABLE cbs.ssb_review_request (
    id                      BIGSERIAL       PRIMARY KEY,
    request_code            VARCHAR(30)     NOT NULL UNIQUE,
    request_type            VARCHAR(30)     NOT NULL,
    title                   VARCHAR(300)    NOT NULL,
    description             TEXT,
    submitted_by            VARCHAR(80),
    submitted_at            TIMESTAMPTZ,
    assigned_member_ids     JSONB,
    required_quorum         INT             NOT NULL DEFAULT 1,
    current_approvals       INT             NOT NULL DEFAULT 0,
    current_rejections      INT             NOT NULL DEFAULT 0,
    linked_fatwa_id         BIGINT          REFERENCES cbs.fatwa_record(id),
    linked_product_code     VARCHAR(60),
    linked_transaction_ref  VARCHAR(60),
    review_notes            TEXT,
    resolution_notes        TEXT,
    resolved_at             TIMESTAMPTZ,
    resolved_by             VARCHAR(80),
    status                  VARCHAR(25)     NOT NULL DEFAULT 'DRAFT',
    priority                VARCHAR(15)     NOT NULL DEFAULT 'NORMAL',
    sla_deadline            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     DEFAULT NOW(),
    version                 BIGINT          DEFAULT 0
);

CREATE INDEX idx_ssb_review_status ON cbs.ssb_review_request(status);
CREATE INDEX idx_ssb_review_code ON cbs.ssb_review_request(request_code);

CREATE TABLE cbs.ssb_vote (
    id                  BIGSERIAL       PRIMARY KEY,
    review_request_id   BIGINT          NOT NULL REFERENCES cbs.ssb_review_request(id),
    member_id           BIGINT          NOT NULL REFERENCES cbs.ssb_board_member(id),
    vote                VARCHAR(20)     NOT NULL,
    comments            TEXT,
    voted_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (review_request_id, member_id)
);

CREATE INDEX idx_ssb_vote_request ON cbs.ssb_vote(review_request_id);

CREATE TABLE cbs.ssb_review_audit_log (
    id                  BIGSERIAL       PRIMARY KEY,
    review_request_id   BIGINT,
    fatwa_id            BIGINT,
    action              VARCHAR(60)     NOT NULL,
    performed_by        VARCHAR(80)     NOT NULL,
    details             JSONB,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ssb_audit_review ON cbs.ssb_review_audit_log(review_request_id);
CREATE INDEX idx_ssb_audit_fatwa ON cbs.ssb_review_audit_log(fatwa_id);

-- Sequences for concurrency-safe code generation
CREATE SEQUENCE cbs.ssb_member_code_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE cbs.fatwa_code_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE cbs.ssb_review_code_seq START WITH 1 INCREMENT BY 1;
