-- Bill favorites: saved biller + customer reference combinations for quick repeat payments
CREATE TABLE IF NOT EXISTS cbs.bill_favorite (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT        NOT NULL REFERENCES cbs.customer(id),
    biller_id       BIGINT        NOT NULL REFERENCES cbs.biller(id),
    biller_customer_id VARCHAR(50) NOT NULL,
    alias           VARCHAR(100),
    fields          JSONB         DEFAULT '{}',
    last_paid_amount NUMERIC(18,2),
    last_paid_at    TIMESTAMP WITH TIME ZONE,
    payment_count   INTEGER       DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT        DEFAULT 0,
    UNIQUE (customer_id, biller_id, biller_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_favorite_customer ON cbs.bill_favorite(customer_id);
CREATE INDEX IF NOT EXISTS idx_bill_favorite_biller   ON cbs.bill_favorite(biller_id);
