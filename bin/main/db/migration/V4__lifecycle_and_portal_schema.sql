-- V4__lifecycle_and_portal_schema.sql
-- Account Lifecycle Management & Self-Service Portal

SET search_path TO cbs;

CREATE TABLE account_lifecycle_event (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT NOT NULL REFERENCES account(id),
    event_type      VARCHAR(30) NOT NULL CHECK (event_type IN (
                        'OPENED','ACTIVATED','STATUS_CHANGED','DORMANCY_DETECTED',
                        'REACTIVATED','FROZEN','UNFROZEN','PND_PLACED','PND_REMOVED',
                        'CLOSED','ESCHEAT','FEE_CHARGED','INTEREST_POSTED',
                        'MANDATE_CHANGED','SIGNATORY_ADDED','SIGNATORY_REMOVED')),
    old_status      VARCHAR(20),
    new_status      VARCHAR(20),
    reason          TEXT,
    performed_by    VARCHAR(100),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_account ON account_lifecycle_event(account_id);
CREATE INDEX idx_lifecycle_type ON account_lifecycle_event(event_type);
CREATE INDEX idx_lifecycle_date ON account_lifecycle_event(created_at);

CREATE TABLE portal_session (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(id),
    session_token   VARCHAR(200) NOT NULL UNIQUE,
    device_info     VARCHAR(500),
    ip_address      VARCHAR(45),
    channel         VARCHAR(20) NOT NULL CHECK (channel IN ('WEB','MOBILE','USSD')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_session_customer ON portal_session(customer_id);

CREATE TABLE profile_update_request (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(id),
    request_type    VARCHAR(30) NOT NULL CHECK (request_type IN (
                        'EMAIL_CHANGE','PHONE_CHANGE','ADDRESS_CHANGE',
                        'NAME_CHANGE','PHOTO_CHANGE','PREFERENCES')),
    old_value       TEXT,
    new_value       TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    submitted_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    reviewed_by     VARCHAR(100),
    rejection_reason TEXT,
    channel         VARCHAR(20) NOT NULL DEFAULT 'WEB',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_profile_update_customer ON profile_update_request(customer_id);
CREATE INDEX idx_profile_update_status ON profile_update_request(status);
