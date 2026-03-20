-- V50: Customer onboarding draft persistence

CREATE TABLE IF NOT EXISTS customer_onboarding_draft (
    id              BIGSERIAL       PRIMARY KEY,
    created_by      VARCHAR(100)    NOT NULL DEFAULT 'SYSTEM',
    form_data       JSONB           NOT NULL DEFAULT '{}',
    current_step    INT             NOT NULL DEFAULT 1,
    customer_type   VARCHAR(20),
    display_label   VARCHAR(200),
    created_at      TIMESTAMP       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT now()
);

CREATE INDEX idx_draft_created_by ON customer_onboarding_draft(created_by, created_at DESC);
