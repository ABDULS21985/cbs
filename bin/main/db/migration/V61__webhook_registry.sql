-- V61: Webhook registry for Open Banking event delivery
-- Supports TPP webhook registration, event subscriptions, and delivery tracking

CREATE TABLE IF NOT EXISTS cbs.webhook_registration (
    id                  BIGSERIAL PRIMARY KEY,
    webhook_id          VARCHAR(80)  NOT NULL UNIQUE,
    url                 VARCHAR(500) NOT NULL,
    events              JSONB        NOT NULL DEFAULT '[]'::jsonb,
    tpp_client_id       BIGINT,
    tpp_client_name     VARCHAR(200),
    auth_type           VARCHAR(20)  NOT NULL DEFAULT 'NONE'
                        CHECK (auth_type IN ('NONE','BASIC','BEARER','HMAC')),
    secret_hash         VARCHAR(256),
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','DISABLED','FAILED')),
    success_rate        NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    total_deliveries    INT          NOT NULL DEFAULT 0,
    failed_deliveries   INT          NOT NULL DEFAULT 0,
    last_delivered_at   TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbs.webhook_delivery (
    id                  BIGSERIAL PRIMARY KEY,
    webhook_id          BIGINT       NOT NULL REFERENCES cbs.webhook_registration(id),
    event               VARCHAR(100) NOT NULL,
    http_status         INT          NOT NULL DEFAULT 0,
    duration_ms         INT          NOT NULL DEFAULT 0,
    request_body        TEXT,
    response_body       TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','SUCCESS','FAILED','TIMEOUT')),
    attempt_count       INT          NOT NULL DEFAULT 1,
    next_retry_at       TIMESTAMP,
    delivered_at        TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_reg_status ON cbs.webhook_registration(status);
CREATE INDEX idx_webhook_reg_tpp    ON cbs.webhook_registration(tpp_client_id);
CREATE INDEX idx_webhook_del_wh     ON cbs.webhook_delivery(webhook_id, delivered_at DESC);
CREATE INDEX idx_webhook_del_status ON cbs.webhook_delivery(status) WHERE status IN ('FAILED','TIMEOUT');
