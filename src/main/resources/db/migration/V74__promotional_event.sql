SET search_path TO cbs;

-- Promotional events: campaign and promo code management
CREATE TABLE IF NOT EXISTS promotional_event (
    id                    BIGSERIAL PRIMARY KEY,
    event_code            VARCHAR(50)    NOT NULL UNIQUE,
    event_name            VARCHAR(150)   NOT NULL,
    event_type            VARCHAR(30)    NOT NULL CHECK (event_type IN ('SEASONAL','PRODUCT_LAUNCH','LOYALTY_BOOST','REFERRAL','CLEARANCE')),
    description           TEXT,
    target_segment        VARCHAR(100),
    channels              VARCHAR(500),
    offer_details         JSONB,
    terms_and_conditions  TEXT,
    promo_code            VARCHAR(50)    UNIQUE,
    discount_type         VARCHAR(20)    CHECK (discount_type IN ('PERCENTAGE','FLAT_AMOUNT','RATE_REDUCTION')),
    discount_value        NUMERIC(18,4),
    max_redemptions       INT            NOT NULL DEFAULT 0,
    current_redemptions   INT            NOT NULL DEFAULT 0,
    start_date            TIMESTAMPTZ,
    end_date              TIMESTAMPTZ,
    registration_url      VARCHAR(500),
    budget_amount         NUMERIC(18,4),
    spent_amount          NUMERIC(18,4)  DEFAULT 0,
    leads_generated       INT            NOT NULL DEFAULT 0,
    conversions           INT            NOT NULL DEFAULT 0,
    status                VARCHAR(20)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by            VARCHAR(100),
    updated_by            VARCHAR(100),
    version               BIGINT         DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_promo_event_code ON promotional_event(event_code);
CREATE INDEX IF NOT EXISTS idx_promo_promo_code ON promotional_event(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_status ON promotional_event(status);
CREATE INDEX IF NOT EXISTS idx_promo_event_type ON promotional_event(event_type);
CREATE INDEX IF NOT EXISTS idx_promo_dates ON promotional_event(start_date, end_date);
