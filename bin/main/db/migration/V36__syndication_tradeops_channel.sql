SET search_path TO cbs;

-- =====================================================
-- V36: Syndication, Trade Operations & Cross-Channel (Batch 30)
-- =====================================================

-- 1. Syndicated Loan Facility
CREATE TABLE IF NOT EXISTS syndicated_loan_facility (
    id                      BIGSERIAL PRIMARY KEY,
    facility_code           VARCHAR(30)    NOT NULL UNIQUE,
    facility_name           VARCHAR(200)   NOT NULL,
    facility_type           VARCHAR(20)    NOT NULL CHECK (facility_type IN ('TERM_LOAN','REVOLVING_CREDIT','BRIDGE_LOAN','STANDBY','CLUB_DEAL','BILATERAL_SYNDICATED')),
    borrower_name           VARCHAR(200)   NOT NULL,
    borrower_id             BIGINT,
    lead_arranger           VARCHAR(200)   NOT NULL,
    our_role                VARCHAR(20)    NOT NULL CHECK (our_role IN ('LEAD_ARRANGER','CO_ARRANGER','PARTICIPANT','AGENT','BOOKRUNNER','MANDATED_LEAD')),
    currency                VARCHAR(3)     NOT NULL DEFAULT 'USD',
    total_facility_amount   NUMERIC(20,4)  NOT NULL,
    our_commitment          NUMERIC(20,4)  NOT NULL,
    our_share_pct           NUMERIC(6,2),
    drawn_amount            NUMERIC(20,4)  DEFAULT 0,
    undrawn_amount          NUMERIC(20,4),
    base_rate               VARCHAR(20)    DEFAULT 'SOFR',
    margin_bps              INT            NOT NULL,
    upfront_fee_pct         NUMERIC(5,4),
    commitment_fee_bps      INT,
    agent_fee               NUMERIC(12,4),
    tenor_months            INT            NOT NULL,
    signing_date            DATE,
    maturity_date           DATE,
    repayment_schedule      JSONB,
    financial_covenants     JSONB,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'STRUCTURING' CHECK (status IN ('STRUCTURING','MARKETING','COMMITTED','SIGNED','ACTIVE','AMORTIZING','MATURED','DEFAULTED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_synloan_status ON syndicated_loan_facility(status, our_role);

-- 2. Syndicate Participant
CREATE TABLE IF NOT EXISTS syndicate_participant (
    id                      BIGSERIAL PRIMARY KEY,
    facility_id             BIGINT         NOT NULL REFERENCES syndicated_loan_facility(id),
    participant_name        VARCHAR(200)   NOT NULL,
    participant_bic         VARCHAR(11),
    role                    VARCHAR(20)    NOT NULL CHECK (role IN ('LEAD','CO_LEAD','PARTICIPANT','AGENT','SUB_PARTICIPANT')),
    commitment_amount       NUMERIC(20,4)  NOT NULL,
    share_pct               NUMERIC(6,2)   NOT NULL,
    funded_amount           NUMERIC(20,4)  DEFAULT 0,
    settlement_account      VARCHAR(30),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('INVITED','COMMITTED','FUNDED','TRANSFERRED','WITHDRAWN')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 3. Syndicate Drawdown
CREATE TABLE IF NOT EXISTS syndicate_drawdown (
    id                      BIGSERIAL PRIMARY KEY,
    drawdown_ref            VARCHAR(30)    NOT NULL UNIQUE,
    facility_id             BIGINT         NOT NULL REFERENCES syndicated_loan_facility(id),
    drawdown_type           VARCHAR(15)    NOT NULL CHECK (drawdown_type IN ('INITIAL','INCREMENTAL','ROLLOVER','CONVERSION')),
    amount                  NUMERIC(20,4)  NOT NULL,
    currency                VARCHAR(3)     NOT NULL DEFAULT 'USD',
    interest_period         VARCHAR(10)    CHECK (interest_period IN ('1M','3M','6M','12M')),
    interest_rate           NUMERIC(8,4),
    value_date              DATE           NOT NULL,
    maturity_date           DATE           NOT NULL,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','FUNDED','REPAID','DEFAULTED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 4. Project Finance Facility
CREATE TABLE IF NOT EXISTS project_finance_facility (
    id                      BIGSERIAL PRIMARY KEY,
    facility_code           VARCHAR(30)    NOT NULL UNIQUE,
    project_name            VARCHAR(200)   NOT NULL,
    project_type            VARCHAR(25)    NOT NULL CHECK (project_type IN ('INFRASTRUCTURE','POWER_GENERATION','RENEWABLE_ENERGY','REAL_ESTATE','MINING','TELECOM','TRANSPORTATION','WATER','OIL_GAS','AGRICULTURE')),
    borrower_name           VARCHAR(200)   NOT NULL,
    spv_name                VARCHAR(200),
    country                 VARCHAR(3)     NOT NULL,
    currency                VARCHAR(3)     NOT NULL DEFAULT 'USD',
    total_project_cost      NUMERIC(20,4)  NOT NULL,
    debt_amount             NUMERIC(20,4)  NOT NULL,
    equity_amount           NUMERIC(20,4),
    our_share               NUMERIC(20,4),
    disbursed_amount        NUMERIC(20,4)  DEFAULT 0,
    tenor_months            INT            NOT NULL,
    grace_period_months     INT            DEFAULT 0,
    base_rate               VARCHAR(20)    DEFAULT 'SOFR',
    margin_bps              INT            NOT NULL,
    credit_rating           VARCHAR(10),
    country_risk            VARCHAR(10)    CHECK (country_risk IN ('LOW','MEDIUM','HIGH','VERY_HIGH')),
    environmental_category  VARCHAR(5)     CHECK (environmental_category IN ('A','B','C','FI')),
    financial_covenants     JSONB,
    security_package        JSONB,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'APPRAISAL' CHECK (status IN ('APPRAISAL','APPROVED','SIGNED','DISBURSING','CONSTRUCTION','OPERATING','AMORTIZING','MATURED','RESTRUCTURED','DEFAULTED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 5. Project Milestone
CREATE TABLE IF NOT EXISTS project_milestone (
    id                      BIGSERIAL PRIMARY KEY,
    milestone_code          VARCHAR(30)    NOT NULL UNIQUE,
    facility_id             BIGINT         NOT NULL REFERENCES project_finance_facility(id),
    milestone_name          VARCHAR(200)   NOT NULL,
    milestone_type          VARCHAR(20)    NOT NULL CHECK (milestone_type IN ('CONDITION_PRECEDENT','DISBURSEMENT_CONDITION','CONSTRUCTION','COMPLETION_TEST','COVENANT_TEST','INSURANCE','REGULATORY','ENVIRONMENTAL')),
    description             TEXT,
    due_date                DATE           NOT NULL,
    completed_date          DATE,
    disbursement_linked     BOOLEAN        DEFAULT FALSE,
    disbursement_amount     NUMERIC(20,4),
    evidence_ref            VARCHAR(200),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','WAIVED','FAILED','OVERDUE')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 6. Trade Confirmation
CREATE TABLE IF NOT EXISTS trade_confirmation (
    id                      BIGSERIAL PRIMARY KEY,
    confirmation_ref        VARCHAR(30)    NOT NULL UNIQUE,
    trade_ref               VARCHAR(30)    NOT NULL,
    instrument_type         VARCHAR(20)    NOT NULL CHECK (instrument_type IN ('FX_SPOT','FX_FORWARD','FX_SWAP','IRS','BOND','EQUITY','REPO','MONEY_MARKET')),
    our_side                VARCHAR(4)     NOT NULL CHECK (our_side IN ('BUY','SELL')),
    counterparty_code       VARCHAR(30)    NOT NULL,
    counterparty_name       VARCHAR(200)   NOT NULL,
    trade_date              DATE           NOT NULL,
    settlement_date         DATE,
    currency                VARCHAR(3)     NOT NULL,
    amount                  NUMERIC(20,4)  NOT NULL,
    price                   NUMERIC(20,8),
    our_details             JSONB          NOT NULL,
    counterparty_details    JSONB,
    match_status            VARCHAR(15)    NOT NULL DEFAULT 'UNMATCHED' CHECK (match_status IN ('UNMATCHED','MATCHED','ALLEGED','DISPUTED','CANCELLED')),
    break_fields            JSONB,
    matched_at              TIMESTAMP,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','REJECTED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 7. Order Allocation
CREATE TABLE IF NOT EXISTS order_allocation (
    id                      BIGSERIAL PRIMARY KEY,
    allocation_ref          VARCHAR(30)    NOT NULL UNIQUE,
    block_order_ref         VARCHAR(30)    NOT NULL,
    instrument_code         VARCHAR(30)    NOT NULL,
    instrument_name         VARCHAR(300),
    order_side              VARCHAR(4)     NOT NULL CHECK (order_side IN ('BUY','SELL')),
    total_quantity          NUMERIC(20,6)  NOT NULL,
    total_amount            NUMERIC(20,4)  NOT NULL,
    avg_price               NUMERIC(20,8)  NOT NULL,
    allocation_method       VARCHAR(15)    NOT NULL CHECK (allocation_method IN ('PRO_RATA','PRIORITY','MANUAL','ROUND_ROBIN','MINIMUM_FILL')),
    allocations             JSONB          NOT NULL,
    allocated_at            TIMESTAMP,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ALLOCATED','CONFIRMED','REJECTED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 8. Trade Report
CREATE TABLE IF NOT EXISTS trade_report (
    id                      BIGSERIAL PRIMARY KEY,
    report_ref              VARCHAR(30)    NOT NULL UNIQUE,
    trade_ref               VARCHAR(30)    NOT NULL,
    report_type             VARCHAR(20)    NOT NULL CHECK (report_type IN ('TRANSACTION_REPORT','POSITION_REPORT','VALUATION_REPORT','COLLATERAL_REPORT','LIFECYCLE_EVENT')),
    regime                  VARCHAR(20)    NOT NULL CHECK (regime IN ('EMIR','MIFID_II','DODD_FRANK','SFTR','CBN_REPORTING','SEC_REPORTING','CUSTOM')),
    trade_repository        VARCHAR(60),
    report_data             JSONB          NOT NULL,
    uti                     VARCHAR(60),
    lei                     VARCHAR(20),
    submitted_at            TIMESTAMP,
    submission_ref          VARCHAR(80),
    acknowledgement_ref     VARCHAR(80),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUBMITTED','ACCEPTED','REJECTED','AMENDED','CANCELLED')),
    rejection_reason        TEXT,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 9. Clearing Submission
CREATE TABLE IF NOT EXISTS clearing_submission (
    id                      BIGSERIAL PRIMARY KEY,
    submission_ref          VARCHAR(30)    NOT NULL UNIQUE,
    trade_ref               VARCHAR(30)    NOT NULL,
    ccp_name                VARCHAR(100)   NOT NULL,
    ccp_code                VARCHAR(20),
    instrument_type         VARCHAR(20)    NOT NULL,
    clearing_member_id      VARCHAR(30),
    trade_date              DATE           NOT NULL,
    settlement_date         DATE,
    currency                VARCHAR(3)     NOT NULL,
    notional_amount         NUMERIC(20,4)  NOT NULL,
    initial_margin          NUMERIC(15,4),
    variation_margin        NUMERIC(15,4),
    margin_currency         VARCHAR(3),
    submitted_at            TIMESTAMP,
    cleared_at              TIMESTAMP,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUBMITTED','ACCEPTED','REJECTED','CLEARED','FAILED','CANCELLED')),
    rejection_reason        TEXT,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_clearingsub_ccp ON clearing_submission(ccp_name, status);

-- 10. Dialogue Session
CREATE TABLE IF NOT EXISTS dialogue_session (
    id                      BIGSERIAL PRIMARY KEY,
    session_code            VARCHAR(30)    NOT NULL UNIQUE,
    customer_id             BIGINT,
    channel                 VARCHAR(20)    NOT NULL CHECK (channel IN ('CHATBOT','LIVE_CHAT','VOICE_BOT','VIDEO','SOCIAL_MEDIA','WHATSAPP','IN_APP','WEB')),
    language                VARCHAR(10)    DEFAULT 'en',
    intent                  VARCHAR(60),
    context                 JSONB,
    customer_sentiment      VARCHAR(15)    CHECK (customer_sentiment IN ('POSITIVE','NEUTRAL','FRUSTRATED','ANGRY')),
    escalated_to_human      BOOLEAN        DEFAULT FALSE,
    agent_id                VARCHAR(80),
    messages_count          INT            DEFAULT 0,
    resolution_status       VARCHAR(15)    CHECK (resolution_status IN ('RESOLVED','UNRESOLVED','ESCALATED','ABANDONED')),
    started_at              TIMESTAMP      NOT NULL DEFAULT now(),
    ended_at                TIMESTAMP,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','ABANDONED','ESCALATED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

CREATE INDEX idx_dialogue_customer ON dialogue_session(customer_id, started_at DESC);

-- 11. Dialogue Message (standalone, immutable)
CREATE TABLE IF NOT EXISTS dialogue_message (
    id                      BIGSERIAL PRIMARY KEY,
    message_ref             VARCHAR(30)    NOT NULL UNIQUE,
    session_id              BIGINT         NOT NULL REFERENCES dialogue_session(id),
    sender_type             VARCHAR(10)    NOT NULL CHECK (sender_type IN ('CUSTOMER','BOT','AGENT','SYSTEM')),
    content                 TEXT           NOT NULL,
    content_type            VARCHAR(15)    DEFAULT 'TEXT' CHECK (content_type IN ('TEXT','IMAGE','FILE','CARD','QUICK_REPLY','CAROUSEL')),
    attachments             JSONB,
    intent_detected         VARCHAR(60),
    confidence_score        NUMERIC(5,4),
    suggested_actions       JSONB,
    created_at              TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_dlgmsg_session ON dialogue_message(session_id, created_at ASC);

-- 12. Help Article
CREATE TABLE IF NOT EXISTS help_article (
    id                      BIGSERIAL PRIMARY KEY,
    article_code            VARCHAR(30)    NOT NULL UNIQUE,
    title                   VARCHAR(300)   NOT NULL,
    article_type            VARCHAR(20)    NOT NULL CHECK (article_type IN ('FAQ','HOW_TO','TROUBLESHOOTING','GLOSSARY','POLICY','VIDEO_TUTORIAL','QUICK_TIP','PRODUCT_GUIDE')),
    category                VARCHAR(40)    NOT NULL,
    content                 TEXT           NOT NULL,
    summary                 VARCHAR(500),
    tags                    JSONB,
    product_family          VARCHAR(30),
    language                VARCHAR(10)    DEFAULT 'en',
    view_count              INT            DEFAULT 0,
    helpfulness_yes         INT            DEFAULT 0,
    helpfulness_no          INT            DEFAULT 0,
    related_articles        JSONB,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEWED','PUBLISHED','ARCHIVED')),
    published_at            TIMESTAMP,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);

-- 13. Guided Flow
CREATE TABLE IF NOT EXISTS guided_flow (
    id                      BIGSERIAL PRIMARY KEY,
    flow_code               VARCHAR(30)    NOT NULL UNIQUE,
    flow_name               VARCHAR(200)   NOT NULL,
    flow_type               VARCHAR(20)    NOT NULL CHECK (flow_type IN ('ONBOARDING','PRODUCT_SELECTOR','TROUBLESHOOTING','APPLICATION','SETTINGS','KYC_GUIDE','COMPLAINT_FLOW','FAQ_TREE')),
    description             TEXT,
    steps                   JSONB          NOT NULL,
    decision_tree           JSONB,
    estimated_duration_min  INT,
    completion_rate_pct     NUMERIC(5,2)   DEFAULT 0,
    total_starts            INT            DEFAULT 0,
    total_completions       INT            DEFAULT 0,
    target_channel          VARCHAR(20)    CHECK (target_channel IN ('MOBILE','WEB','CHATBOT','BRANCH','ALL')),
    status                  VARCHAR(15)    NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','ARCHIVED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);
