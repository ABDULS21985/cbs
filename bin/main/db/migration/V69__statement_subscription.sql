-- Statement subscriptions: recurring scheduled statement delivery
CREATE TABLE IF NOT EXISTS statement_subscription (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT        NOT NULL,
    customer_id     BIGINT,
    account_number  VARCHAR(30),
    frequency       VARCHAR(15)   NOT NULL CHECK (frequency IN ('WEEKLY','MONTHLY','QUARTERLY')),
    delivery        VARCHAR(10)   NOT NULL CHECK (delivery IN ('EMAIL','PORTAL')),
    format          VARCHAR(10)   NOT NULL DEFAULT 'PDF' CHECK (format IN ('PDF','CSV','EXCEL')),
    email           VARCHAR(200),
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    next_delivery   DATE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT        DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stmt_sub_account ON statement_subscription(account_id);
CREATE INDEX IF NOT EXISTS idx_stmt_sub_customer ON statement_subscription(customer_id);
