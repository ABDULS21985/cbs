-- V26: Customer Experience & Loyalty (BIAN Gap Remediation Batch 21)
-- Case Management, Customer Agreement, PFM, Rewards, Proposition, Product Bundling, Workbench, Session

SET search_path TO cbs;

-- ============================================================
-- BIAN SD: Customer Case Management (generic, cross-product)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_case (
    id                      BIGSERIAL PRIMARY KEY,
    case_number             VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    case_type               VARCHAR(30)  NOT NULL
                            CHECK (case_type IN ('COMPLAINT','INQUIRY','SERVICE_REQUEST','DISPUTE','FRAUD_REPORT',
                                   'ACCOUNT_ISSUE','PAYMENT_ISSUE','CARD_ISSUE','LOAN_ISSUE','FEE_REVERSAL',
                                   'DOCUMENT_REQUEST','PRODUCT_CHANGE','CLOSURE','REGULATORY','ESCALATION')),
    case_category           VARCHAR(30)  NOT NULL
                            CHECK (case_category IN ('ACCOUNTS','PAYMENTS','CARDS','LOANS','DEPOSITS',
                                   'TRADE_FINANCE','TREASURY','DIGITAL','FEES','GENERAL')),
    priority                VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM'
                            CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    subject                 VARCHAR(300) NOT NULL,
    description             TEXT,
    channel_originated      VARCHAR(20),
    assigned_to             VARCHAR(80),
    assigned_team           VARCHAR(80),
    -- SLA
    sla_due_at              TIMESTAMP,
    sla_breached            BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Resolution
    resolution_summary      TEXT,
    resolution_type         VARCHAR(20)
                            CHECK (resolution_type IN ('RESOLVED','ESCALATED','REJECTED','DUPLICATE','AUTO_RESOLVED','COMPENSATED')),
    compensation_amount     NUMERIC(12,4),
    -- Lifecycle
    status                  VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN ('OPEN','IN_PROGRESS','PENDING_CUSTOMER','PENDING_INTERNAL',
                                   'ESCALATED','RESOLVED','CLOSED','REOPENED')),
    root_cause              TEXT,
    linked_case_id          BIGINT,
    linked_transaction_id   BIGINT,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    resolved_at             TIMESTAMP,
    closed_at               TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_note (
    id                      BIGSERIAL PRIMARY KEY,
    case_id                 BIGINT       NOT NULL REFERENCES customer_case(id),
    note_type               VARCHAR(15)  NOT NULL DEFAULT 'INTERNAL'
                            CHECK (note_type IN ('INTERNAL','CUSTOMER_VISIBLE','SYSTEM','ESCALATION')),
    content                 TEXT         NOT NULL,
    created_by              VARCHAR(80)  NOT NULL,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_customer ON customer_case(customer_id, status, created_at DESC);
CREATE INDEX idx_case_assigned ON customer_case(assigned_to, status);
CREATE INDEX idx_case_sla ON customer_case(sla_breached, sla_due_at) WHERE status NOT IN ('RESOLVED','CLOSED');

-- ============================================================
-- BIAN SD: Customer Agreement
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_agreement (
    id                      BIGSERIAL PRIMARY KEY,
    agreement_number        VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    agreement_type          VARCHAR(30)  NOT NULL
                            CHECK (agreement_type IN ('MASTER_SERVICE','PRODUCT_SPECIFIC','FEE_SCHEDULE',
                                   'LIMIT_AGREEMENT','CHANNEL_ACCESS','DATA_SHARING','PRIVACY_CONSENT',
                                   'POWER_OF_ATTORNEY','GUARANTEE','COLLATERAL','NDA')),
    title                   VARCHAR(300) NOT NULL,
    description             TEXT,
    document_ref            VARCHAR(200),
    effective_from          DATE         NOT NULL,
    effective_to            DATE,
    auto_renew              BOOLEAN      NOT NULL DEFAULT FALSE,
    renewal_term_months     INT,
    notice_period_days      INT,
    -- Parties
    signed_by_customer      VARCHAR(200),
    signed_by_bank          VARCHAR(200),
    signed_date             DATE,
    -- Status
    status                  VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','PENDING_SIGNATURE','ACTIVE','SUSPENDED',
                                   'EXPIRED','TERMINATED','RENEWED')),
    termination_reason      TEXT,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_agreement_customer ON customer_agreement(customer_id, status);

-- ============================================================
-- BIAN SD: Customer Financial Insights (PFM)
-- ============================================================
CREATE TABLE IF NOT EXISTS pfm_category (
    id                      BIGSERIAL PRIMARY KEY,
    category_code           VARCHAR(40)  NOT NULL UNIQUE,
    category_name           VARCHAR(100) NOT NULL,
    parent_category_id      BIGINT       REFERENCES pfm_category(id),
    icon                    VARCHAR(40),
    color_hex               VARCHAR(7),
    is_system               BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pfm_snapshot (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT       NOT NULL,
    snapshot_date           DATE         NOT NULL,
    snapshot_type           VARCHAR(15)  NOT NULL DEFAULT 'MONTHLY'
                            CHECK (snapshot_type IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL')),
    -- Income
    total_income            NUMERIC(20,4) NOT NULL DEFAULT 0,
    salary_income           NUMERIC(20,4) DEFAULT 0,
    investment_income       NUMERIC(20,4) DEFAULT 0,
    other_income            NUMERIC(20,4) DEFAULT 0,
    -- Expenses
    total_expenses          NUMERIC(20,4) NOT NULL DEFAULT 0,
    expense_breakdown       JSONB,        -- {"housing":5000,"food":2000,"transport":1500,...}
    -- Savings
    savings_rate            NUMERIC(6,2),  -- (income - expenses) / income * 100
    net_worth               NUMERIC(20,4),
    total_assets            NUMERIC(20,4),
    total_liabilities       NUMERIC(20,4),
    -- Health score
    financial_health_score  INT CHECK (financial_health_score BETWEEN 0 AND 100),
    health_factors          JSONB,        -- {"savings_ratio":25,"debt_ratio":15,...}
    -- Insights
    insights                JSONB,        -- AI-generated insights
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (customer_id, snapshot_date, snapshot_type)
);

CREATE INDEX idx_pfm_snapshot ON pfm_snapshot(customer_id, snapshot_date DESC);

-- Seed: PFM categories
INSERT INTO pfm_category (category_code, category_name, icon, color_hex) VALUES
    ('SALARY', 'Salary & Wages', 'briefcase', '#4CAF50'),
    ('HOUSING', 'Housing & Rent', 'home', '#FF9800'),
    ('FOOD', 'Food & Groceries', 'shopping-cart', '#F44336'),
    ('TRANSPORT', 'Transportation', 'car', '#2196F3'),
    ('UTILITIES', 'Utilities & Bills', 'zap', '#9C27B0'),
    ('HEALTHCARE', 'Healthcare', 'heart', '#E91E63'),
    ('EDUCATION', 'Education', 'book', '#3F51B5'),
    ('ENTERTAINMENT', 'Entertainment', 'film', '#FF5722'),
    ('SHOPPING', 'Shopping', 'shopping-bag', '#795548'),
    ('SAVINGS', 'Savings & Investments', 'trending-up', '#009688'),
    ('DEBT_REPAYMENT', 'Debt Repayment', 'credit-card', '#607D8B'),
    ('INSURANCE', 'Insurance', 'shield', '#8BC34A'),
    ('CHARITY', 'Charity & Gifts', 'gift', '#CDDC39'),
    ('TRANSFER', 'Transfers', 'repeat', '#00BCD4'),
    ('OTHER', 'Other', 'more-horizontal', '#9E9E9E')
ON CONFLICT (category_code) DO NOTHING;

-- ============================================================
-- BIAN SD: Reward Points Account / Awards / Redemption
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_program (
    id                      BIGSERIAL PRIMARY KEY,
    program_code            VARCHAR(30)  NOT NULL UNIQUE,
    program_name            VARCHAR(200) NOT NULL,
    program_type            VARCHAR(20)  NOT NULL
                            CHECK (program_type IN ('POINTS','CASHBACK','MILES','TIERED','HYBRID')),
    points_currency_name    VARCHAR(30)  NOT NULL DEFAULT 'Points',
    earn_rate_per_unit      NUMERIC(8,4) NOT NULL DEFAULT 1.0,  -- points per currency unit spent
    earn_rate_unit          NUMERIC(10,2) NOT NULL DEFAULT 100,  -- per X currency units
    point_value             NUMERIC(10,6) NOT NULL DEFAULT 0.01, -- monetary value per point
    min_redemption_points   INT          NOT NULL DEFAULT 1000,
    expiry_months           INT,
    tier_levels             JSONB,        -- [{"name":"Silver","min_points":0},{"name":"Gold","min_points":50000}]
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_account (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT       NOT NULL,
    program_id              BIGINT       NOT NULL REFERENCES loyalty_program(id),
    loyalty_number          VARCHAR(30)  NOT NULL UNIQUE,
    current_balance         INT          NOT NULL DEFAULT 0,
    lifetime_earned         INT          NOT NULL DEFAULT 0,
    lifetime_redeemed       INT          NOT NULL DEFAULT 0,
    lifetime_expired        INT          NOT NULL DEFAULT 0,
    current_tier            VARCHAR(30)  DEFAULT 'STANDARD',
    tier_qualification_points INT        DEFAULT 0,
    tier_review_date        DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    loyalty_account_id      BIGINT       NOT NULL REFERENCES loyalty_account(id),
    transaction_type        VARCHAR(15)  NOT NULL
                            CHECK (transaction_type IN ('EARN','REDEEM','EXPIRE','ADJUST','BONUS','TRANSFER')),
    points                  INT          NOT NULL,
    description             VARCHAR(300),
    source_transaction_id   BIGINT,
    source_type             VARCHAR(30),  -- PURCHASE, BILL_PAYMENT, SIGNUP_BONUS, etc.
    partner_name            VARCHAR(200),
    expiry_date             DATE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_customer ON loyalty_account(customer_id, status);
CREATE INDEX idx_loyalty_txn ON loyalty_transaction(loyalty_account_id, created_at DESC);

-- ============================================================
-- BIAN SD: Customer Proposition
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_proposition (
    id                      BIGSERIAL PRIMARY KEY,
    proposition_code        VARCHAR(30)  NOT NULL UNIQUE,
    proposition_name        VARCHAR(200) NOT NULL,
    target_segment          VARCHAR(60),
    value_statement         TEXT         NOT NULL,
    included_products       JSONB        NOT NULL,  -- ["SAVINGS_PREMIUM","CREDIT_CARD_GOLD","INSURANCE"]
    pricing_summary         JSONB,
    channel_availability    JSONB,
    eligibility_rules       JSONB,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','RETIRED')),
    effective_from          DATE,
    effective_to            DATE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- BIAN SD: Product Combination (Bundling)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_bundle (
    id                      BIGSERIAL PRIMARY KEY,
    bundle_code             VARCHAR(30)  NOT NULL UNIQUE,
    bundle_name             VARCHAR(200) NOT NULL,
    bundle_type             VARCHAR(20)  NOT NULL
                            CHECK (bundle_type IN ('STARTER','PREMIUM','CORPORATE','STUDENT','SENIOR',
                                   'FAMILY','DIGITAL','WEALTH','SME','CUSTOM')),
    description             TEXT,
    included_products       JSONB        NOT NULL,
    bundle_discount_pct     NUMERIC(5,2) DEFAULT 0,
    bundle_monthly_fee      NUMERIC(12,4),
    min_products_required   INT          NOT NULL DEFAULT 2,
    cross_sell_incentive    TEXT,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','RETIRED')),
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_bundle_enrollment (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT       NOT NULL,
    bundle_id               BIGINT       NOT NULL REFERENCES product_bundle(id),
    enrolled_products       JSONB        NOT NULL,
    enrollment_date         DATE         NOT NULL DEFAULT CURRENT_DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','SUSPENDED','CANCELLED')),
    discount_applied        NUMERIC(5,2),
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- BIAN SD: Customer Workbench + Session Dialogue
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_workbench_session (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              VARCHAR(80)  NOT NULL UNIQUE,
    staff_user_id           VARCHAR(80)  NOT NULL,
    staff_name              VARCHAR(200),
    workbench_type          VARCHAR(20)  NOT NULL DEFAULT 'TELLER'
                            CHECK (workbench_type IN ('TELLER','RELATIONSHIP_MANAGER','BACK_OFFICE',
                                   'SUPERVISOR','COMPLIANCE','SUPPORT_AGENT')),
    customer_id             BIGINT,       -- currently serviced customer (null if idle)
    active_context          JSONB,        -- open products, recent actions, pending tasks
    session_status          VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (session_status IN ('ACTIVE','IDLE','LOCKED','TERMINATED')),
    started_at              TIMESTAMP    NOT NULL DEFAULT now(),
    last_activity_at        TIMESTAMP    NOT NULL DEFAULT now(),
    ended_at                TIMESTAMP
);

CREATE INDEX idx_workbench_staff ON staff_workbench_session(staff_user_id, session_status);

-- PFM Budget (referenced by PfmService)
CREATE TABLE IF NOT EXISTS pfm_budget (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT       NOT NULL,
    category_id             BIGINT       NOT NULL,
    budget_month            DATE         NOT NULL,
    budget_amount           NUMERIC(20,4) NOT NULL,
    spent_amount            NUMERIC(20,4) NOT NULL DEFAULT 0,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    alert_threshold_pct     INT          NOT NULL DEFAULT 80,
    alert_sent              BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- PFM Financial Health (referenced by PfmService)
CREATE TABLE IF NOT EXISTS pfm_financial_health (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT       NOT NULL,
    assessment_date         DATE         NOT NULL,
    overall_score           INT          NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    savings_ratio           NUMERIC(8,4),
    debt_to_income          NUMERIC(8,4),
    emergency_fund_months   NUMERIC(8,4),
    credit_utilization      NUMERIC(8,4),
    payment_consistency     NUMERIC(8,4),
    income_stability        NUMERIC(8,4),
    spending_trend          VARCHAR(20),
    risk_level              VARCHAR(20),
    recommendations         JSONB,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);
