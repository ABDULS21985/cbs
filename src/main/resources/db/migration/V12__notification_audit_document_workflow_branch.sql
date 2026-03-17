-- V12__notification_audit_document_workflow_branch.sql
-- Capabilities 46-50: Notifications, Audit, Documents, Workflow, Branch

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 46: NOTIFICATION ENGINE
-- ============================================================

CREATE TABLE notification_template (
    id                      BIGSERIAL PRIMARY KEY,
    template_code           VARCHAR(30) NOT NULL UNIQUE,
    template_name           VARCHAR(100) NOT NULL,
    channel                 VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','SMS','PUSH','IN_APP','WEBHOOK')),
    event_type              VARCHAR(50) NOT NULL,
    subject                 VARCHAR(300),
    body_template           TEXT NOT NULL,
    is_html                 BOOLEAN NOT NULL DEFAULT FALSE,
    locale                  VARCHAR(10) NOT NULL DEFAULT 'en',
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_notif_template_event ON notification_template(event_type);

CREATE TABLE notification_log (
    id                      BIGSERIAL PRIMARY KEY,
    template_code           VARCHAR(30),
    channel                 VARCHAR(20) NOT NULL,
    event_type              VARCHAR(50) NOT NULL,
    -- Recipient
    customer_id             BIGINT REFERENCES customer(id),
    recipient_address       VARCHAR(200) NOT NULL,
    recipient_name          VARCHAR(200),
    -- Content
    subject                 VARCHAR(300),
    body                    TEXT NOT NULL,
    -- Delivery
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','SENT','DELIVERED','FAILED','BOUNCED','OPTED_OUT')),
    provider                VARCHAR(50),
    provider_message_id     VARCHAR(100),
    failure_reason          VARCHAR(500),
    retry_count             INT NOT NULL DEFAULT 0,
    max_retries             INT NOT NULL DEFAULT 3,
    -- Timing
    scheduled_at            TIMESTAMP WITH TIME ZONE,
    sent_at                 TIMESTAMP WITH TIME ZONE,
    delivered_at            TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_notif_log_customer ON notification_log(customer_id);
CREATE INDEX idx_notif_log_status ON notification_log(status);
CREATE INDEX idx_notif_log_event ON notification_log(event_type);

CREATE TABLE notification_preference (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    channel                 VARCHAR(20) NOT NULL,
    event_type              VARCHAR(50) NOT NULL,
    is_enabled              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, channel, event_type)
);

CREATE INDEX idx_notif_pref_customer ON notification_preference(customer_id);

-- ============================================================
-- CAPABILITY 47: AUDIT TRAIL & COMPLIANCE LOGGING
-- ============================================================

CREATE TABLE audit_event (
    id                      BIGSERIAL PRIMARY KEY,
    event_type              VARCHAR(50) NOT NULL,
    entity_type             VARCHAR(50) NOT NULL,
    entity_id               BIGINT NOT NULL,
    -- Actor
    performed_by            VARCHAR(100) NOT NULL,
    performed_from_ip       VARCHAR(45),
    session_id              VARCHAR(100),
    channel                 VARCHAR(20),
    -- Changes
    action                  VARCHAR(20) NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','READ','APPROVE','REJECT','LOGIN','LOGOUT','EXPORT')),
    before_state            JSONB,
    after_state             JSONB,
    changed_fields          JSONB DEFAULT '[]',
    -- Context
    description             TEXT,
    metadata                JSONB DEFAULT '{}',
    -- Timing
    event_timestamp         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_event(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_event(performed_by);
CREATE INDEX idx_audit_timestamp ON audit_event(event_timestamp);
CREATE INDEX idx_audit_action ON audit_event(action);
CREATE INDEX idx_audit_type ON audit_event(event_type);

-- ============================================================
-- CAPABILITY 48: DOCUMENT MANAGEMENT
-- ============================================================

CREATE TABLE document (
    id                      BIGSERIAL PRIMARY KEY,
    document_ref            VARCHAR(30) NOT NULL UNIQUE,
    document_type           VARCHAR(30) NOT NULL CHECK (document_type IN (
                                'ID_DOCUMENT','ADDRESS_PROOF','INCOME_PROOF','BANK_STATEMENT',
                                'TAX_CERTIFICATE','REGISTRATION_CERT','FINANCIAL_STATEMENT',
                                'COLLATERAL_DOC','LOAN_AGREEMENT','GUARANTEE_LETTER',
                                'BOARD_RESOLUTION','MANDATE_FORM','OTHER')),
    -- Owner
    customer_id             BIGINT REFERENCES customer(id),
    account_id              BIGINT REFERENCES account(id),
    loan_account_id         BIGINT,
    -- File
    file_name               VARCHAR(300) NOT NULL,
    file_type               VARCHAR(20) NOT NULL,
    file_size_bytes         BIGINT,
    storage_path            VARCHAR(500) NOT NULL,
    checksum                VARCHAR(64),
    -- Metadata
    description             VARCHAR(500),
    tags                    JSONB DEFAULT '[]',
    expiry_date             DATE,
    -- Verification
    verification_status     VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
    verified_by             VARCHAR(100),
    verified_at             TIMESTAMP WITH TIME ZONE,
    rejection_reason        VARCHAR(300),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_doc_customer ON document(customer_id);
CREATE INDEX idx_doc_type ON document(document_type);
CREATE INDEX idx_doc_ref ON document(document_ref);

-- ============================================================
-- CAPABILITY 49: WORKFLOW & APPROVAL ENGINE
-- ============================================================

CREATE TABLE workflow_definition (
    id                      BIGSERIAL PRIMARY KEY,
    workflow_code           VARCHAR(30) NOT NULL UNIQUE,
    workflow_name           VARCHAR(100) NOT NULL,
    entity_type             VARCHAR(50) NOT NULL,
    trigger_event           VARCHAR(50) NOT NULL,
    -- Steps (ordered JSON array of approval steps)
    steps_config            JSONB NOT NULL DEFAULT '[]',
    auto_approve_below      NUMERIC(18,2),
    sla_hours               INT,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE workflow_instance (
    id                      BIGSERIAL PRIMARY KEY,
    workflow_code           VARCHAR(30) NOT NULL,
    entity_type             VARCHAR(50) NOT NULL,
    entity_id               BIGINT NOT NULL,
    entity_ref              VARCHAR(50),
    -- Progress
    current_step            INT NOT NULL DEFAULT 1,
    total_steps             INT NOT NULL,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','IN_PROGRESS','APPROVED','REJECTED','CANCELLED','EXPIRED')),
    -- Initiator
    initiated_by            VARCHAR(100) NOT NULL,
    initiated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Completion
    completed_at            TIMESTAMP WITH TIME ZONE,
    -- Amount (for threshold-based routing)
    amount                  NUMERIC(18,2),
    currency_code           VARCHAR(3),
    -- SLA
    sla_deadline            TIMESTAMP WITH TIME ZONE,
    is_sla_breached         BOOLEAN NOT NULL DEFAULT FALSE,
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_wf_instance_entity ON workflow_instance(entity_type, entity_id);
CREATE INDEX idx_wf_instance_status ON workflow_instance(status);

CREATE TABLE workflow_step_action (
    id                      BIGSERIAL PRIMARY KEY,
    instance_id             BIGINT NOT NULL REFERENCES workflow_instance(id) ON DELETE CASCADE,
    step_number             INT NOT NULL,
    step_name               VARCHAR(100) NOT NULL,
    required_role           VARCHAR(50),
    -- Action
    action                  VARCHAR(20) CHECK (action IN ('APPROVE','REJECT','RETURN','ESCALATE')),
    action_by               VARCHAR(100),
    action_at               TIMESTAMP WITH TIME ZONE,
    comments                TEXT,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','APPROVED','REJECTED','RETURNED','ESCALATED','SKIPPED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_wf_step_instance ON workflow_step_action(instance_id);

-- ============================================================
-- CAPABILITY 50: BRANCH MANAGEMENT
-- ============================================================

CREATE TABLE branch (
    id                      BIGSERIAL PRIMARY KEY,
    branch_code             VARCHAR(20) NOT NULL UNIQUE,
    branch_name             VARCHAR(100) NOT NULL,
    branch_type             VARCHAR(20) NOT NULL CHECK (branch_type IN (
                                'HEAD_OFFICE','REGIONAL','BRANCH','SUB_BRANCH','AGENCY','DIGITAL')),
    -- Hierarchy
    parent_branch_code      VARCHAR(20),
    region_code             VARCHAR(20),
    -- Location
    address_line1           VARCHAR(200),
    address_line2           VARCHAR(200),
    city                    VARCHAR(100),
    state_province          VARCHAR(100),
    postal_code             VARCHAR(20),
    country_code            VARCHAR(3),
    latitude                NUMERIC(10,7),
    longitude               NUMERIC(10,7),
    -- Contact
    phone_number            VARCHAR(20),
    email                   VARCHAR(100),
    -- Manager
    manager_name            VARCHAR(100),
    manager_employee_id     VARCHAR(20),
    -- Operations
    operating_hours         VARCHAR(200),
    services_offered        JSONB DEFAULT '[]',
    currency_code           VARCHAR(3) NOT NULL DEFAULT 'USD',
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    opened_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    closed_date             DATE,
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_branch_code ON branch(branch_code);
CREATE INDEX idx_branch_parent ON branch(parent_branch_code);
CREATE INDEX idx_branch_region ON branch(region_code);
CREATE INDEX idx_branch_type ON branch(branch_type);
