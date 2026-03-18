SET search_path TO cbs;

-- V35: Marketing, Sales Enablement & Surveys (Batch 29)

-- ============================================================
-- Business Development
-- ============================================================
CREATE TABLE IF NOT EXISTS biz_dev_initiative (
    id                      BIGSERIAL PRIMARY KEY,
    initiative_code         VARCHAR(30)  NOT NULL UNIQUE,
    initiative_name         VARCHAR(200) NOT NULL,
    initiative_type         VARCHAR(25)  NOT NULL CHECK (initiative_type IN ('MARKET_EXPANSION','PARTNERSHIP','NEW_PRODUCT','DIGITAL_TRANSFORMATION','CHANNEL_GROWTH','GEOGRAPHIC_EXPANSION','ACQUISITION','JOINT_VENTURE')),
    description             TEXT,
    sponsor                 VARCHAR(200),
    lead_owner              VARCHAR(200),
    target_segment          VARCHAR(60),
    target_region           VARCHAR(60),
    estimated_revenue       NUMERIC(20,4),
    estimated_cost          NUMERIC(20,4),
    actual_revenue          NUMERIC(20,4) DEFAULT 0,
    actual_cost             NUMERIC(20,4) DEFAULT 0,
    roi_target_pct          NUMERIC(8,4),
    planned_start_date      DATE,
    planned_end_date        DATE,
    actual_start_date       DATE,
    actual_end_date         DATE,
    milestones              JSONB,
    progress_pct            NUMERIC(5,2) DEFAULT 0,
    kpis                    JSONB,
    risks                   JSONB,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','APPROVED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_bizdev_status ON biz_dev_initiative(status, planned_start_date);

-- ============================================================
-- Brand Management
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_guideline (
    id                      BIGSERIAL PRIMARY KEY,
    guideline_code          VARCHAR(30)  NOT NULL UNIQUE,
    guideline_name          VARCHAR(200) NOT NULL,
    guideline_type          VARCHAR(20)  NOT NULL CHECK (guideline_type IN ('LOGO_USAGE','COLOR_PALETTE','TYPOGRAPHY','TONE_OF_VOICE','PHOTOGRAPHY','TEMPLATE','SOCIAL_MEDIA','SIGNAGE','MERCHANDISE','CO_BRANDING')),
    description             TEXT,
    brand_tier              VARCHAR(15)  DEFAULT 'PRIMARY' CHECK (brand_tier IN ('PRIMARY','SUB_BRAND','CO_BRAND','PARTNER')),
    content                 JSONB        NOT NULL,
    asset_references        JSONB,
    applicable_channels     JSONB,
    effective_from          DATE         NOT NULL,
    effective_to            DATE,
    approval_status         VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT','REVIEWED','APPROVED','ACTIVE','SUPERSEDED','ARCHIVED')),
    approved_by             VARCHAR(80),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Advertising
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_placement (
    id                      BIGSERIAL PRIMARY KEY,
    placement_code          VARCHAR(30)  NOT NULL UNIQUE,
    campaign_id             BIGINT,
    placement_name          VARCHAR(200) NOT NULL,
    media_type              VARCHAR(20)  NOT NULL CHECK (media_type IN ('DIGITAL_DISPLAY','SOCIAL_MEDIA','SEARCH_ENGINE','VIDEO','RADIO','PRINT','OUTDOOR','TV','INFLUENCER','EMAIL_AD','IN_APP','SMS_AD')),
    platform                VARCHAR(60),
    target_audience         JSONB,
    budget_amount           NUMERIC(15,4) NOT NULL,
    spent_amount            NUMERIC(15,4) DEFAULT 0,
    cost_model              VARCHAR(15)  NOT NULL CHECK (cost_model IN ('CPM','CPC','CPA','CPV','FLAT_RATE','PERFORMANCE')),
    unit_cost               NUMERIC(12,6),
    impressions             BIGINT       DEFAULT 0,
    clicks                  BIGINT       DEFAULT 0,
    conversions             INT          DEFAULT 0,
    ctr_pct                 NUMERIC(8,4),
    conversion_rate_pct     NUMERIC(8,4),
    cost_per_acquisition    NUMERIC(12,4),
    revenue_attributed      NUMERIC(15,4) DEFAULT 0,
    roas_pct                NUMERIC(8,4),
    start_date              DATE         NOT NULL,
    end_date                DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','LIVE','PAUSED','COMPLETED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_adplace_status ON ad_placement(status, media_type);

-- ============================================================
-- Promotional Events
-- ============================================================
CREATE TABLE IF NOT EXISTS promotional_event (
    id                      BIGSERIAL PRIMARY KEY,
    event_code              VARCHAR(30)  NOT NULL UNIQUE,
    event_name              VARCHAR(200) NOT NULL,
    event_type              VARCHAR(20)  NOT NULL CHECK (event_type IN ('PRODUCT_LAUNCH','SEASONAL_OFFER','SPONSORSHIP','SEMINAR','WEBINAR','TRADE_SHOW','COMMUNITY_EVENT','LOYALTY_PROMO','REFERRAL_DRIVE','BRANCH_OPENING')),
    description             TEXT,
    target_segment          VARCHAR(60),
    channels                JSONB,
    offer_details           JSONB,
    terms_and_conditions    TEXT,
    promo_code              VARCHAR(30),
    discount_type           VARCHAR(15)  CHECK (discount_type IN ('PERCENTAGE','FLAT_AMOUNT','FEE_WAIVER','RATE_REDUCTION','CASHBACK','BONUS_POINTS')),
    discount_value          NUMERIC(12,4),
    max_redemptions         INT,
    current_redemptions     INT          DEFAULT 0,
    start_date              DATE         NOT NULL,
    end_date                DATE,
    registration_url        VARCHAR(500),
    budget_amount           NUMERIC(15,4),
    spent_amount            NUMERIC(15,4) DEFAULT 0,
    leads_generated         INT          DEFAULT 0,
    conversions             INT          DEFAULT 0,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','APPROVED','ACTIVE','COMPLETED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Customer Surveys
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_survey (
    id                      BIGSERIAL PRIMARY KEY,
    survey_code             VARCHAR(30)  NOT NULL UNIQUE,
    survey_name             VARCHAR(200) NOT NULL,
    survey_type             VARCHAR(20)  NOT NULL CHECK (survey_type IN ('NPS','CSAT','CES','PRODUCT_FEEDBACK','SERVICE_QUALITY','ONBOARDING','EXIT','BRANCH_EXPERIENCE','DIGITAL_EXPERIENCE','GENERAL')),
    description             TEXT,
    target_segment          VARCHAR(60),
    delivery_channel        VARCHAR(20)  NOT NULL CHECK (delivery_channel IN ('EMAIL','SMS','IN_APP','BRANCH','CALL_CENTER','WEB','PUSH_NOTIFICATION')),
    questions               JSONB        NOT NULL,
    start_date              DATE         NOT NULL,
    end_date                DATE,
    total_sent              INT          DEFAULT 0,
    total_responses         INT          DEFAULT 0,
    response_rate_pct       NUMERIC(5,2) DEFAULT 0,
    avg_score               NUMERIC(5,2),
    nps_score               INT          CHECK (nps_score BETWEEN -100 AND 100),
    score_distribution      JSONB,
    key_themes              JSONB,
    action_items            JSONB,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ACTIVE','CLOSED','ANALYSED','ARCHIVED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_survey_type ON customer_survey(survey_type, status);

CREATE TABLE IF NOT EXISTS survey_response (
    id                      BIGSERIAL PRIMARY KEY,
    response_ref            VARCHAR(30)  NOT NULL UNIQUE,
    survey_id               BIGINT       NOT NULL REFERENCES customer_survey(id),
    customer_id             BIGINT,
    channel                 VARCHAR(20)  NOT NULL,
    answers                 JSONB        NOT NULL,
    overall_score           NUMERIC(5,2),
    nps_category            VARCHAR(10)  CHECK (nps_category IN ('PROMOTER','PASSIVE','DETRACTOR')),
    sentiment               VARCHAR(10)  CHECK (sentiment IN ('POSITIVE','NEUTRAL','NEGATIVE')),
    verbatim_feedback       TEXT,
    completed_at            TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_survresp_survey ON survey_response(survey_id, created_at DESC);

-- ============================================================
-- Sales Planning
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_plan (
    id                      BIGSERIAL PRIMARY KEY,
    plan_code               VARCHAR(30)  NOT NULL UNIQUE,
    plan_name               VARCHAR(200) NOT NULL,
    plan_period             VARCHAR(10)  NOT NULL CHECK (plan_period IN ('MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL')),
    period_start            DATE         NOT NULL,
    period_end              DATE         NOT NULL,
    region                  VARCHAR(60),
    branch_id               BIGINT,
    revenue_target          NUMERIC(20,4) NOT NULL,
    revenue_actual          NUMERIC(20,4) DEFAULT 0,
    new_customer_target     INT          DEFAULT 0,
    new_customer_actual     INT          DEFAULT 0,
    product_targets         JSONB,
    team_lead               VARCHAR(200),
    team_members            JSONB,
    territory_assignments   JSONB,
    achievement_pct         NUMERIC(5,2) DEFAULT 0,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ACTIVE','CLOSED','SUPERSEDED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_target (
    id                      BIGSERIAL PRIMARY KEY,
    target_code             VARCHAR(30)  NOT NULL UNIQUE,
    plan_id                 BIGINT       NOT NULL REFERENCES sales_plan(id),
    officer_id              VARCHAR(80)  NOT NULL,
    officer_name            VARCHAR(200) NOT NULL,
    product_code            VARCHAR(30),
    product_name            VARCHAR(200),
    target_type             VARCHAR(20)  NOT NULL CHECK (target_type IN ('REVENUE','VOLUME','NEW_ACCOUNTS','CROSS_SELL','RETENTION','COLLECTION')),
    currency                VARCHAR(3)   DEFAULT 'USD',
    target_value            NUMERIC(20,4) NOT NULL,
    actual_value            NUMERIC(20,4) DEFAULT 0,
    achievement_pct         NUMERIC(5,2) DEFAULT 0,
    period_start            DATE         NOT NULL,
    period_end              DATE         NOT NULL,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ACHIEVED','MISSED','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_salestarget_officer ON sales_target(officer_id, period_start DESC);

-- ============================================================
-- Commission Management
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_agreement (
    id                      BIGSERIAL PRIMARY KEY,
    agreement_code          VARCHAR(30)  NOT NULL UNIQUE,
    agreement_name          VARCHAR(200) NOT NULL,
    agreement_type          VARCHAR(20)  NOT NULL CHECK (agreement_type IN ('SALES_OFFICER','AGENT_BANKING','REFERRAL','PARTNER','BROKER','INSURANCE_AGENT','MERCHANT')),
    party_id                VARCHAR(80)  NOT NULL,
    party_name              VARCHAR(200) NOT NULL,
    commission_basis        VARCHAR(20)  NOT NULL CHECK (commission_basis IN ('PERCENTAGE','FLAT_PER_UNIT','TIERED','MILESTONE','REVENUE_SHARE','HYBRID')),
    base_rate_pct           NUMERIC(6,4),
    tier_structure          JSONB,
    applicable_products     JSONB,
    min_payout              NUMERIC(12,4),
    max_payout_monthly      NUMERIC(15,4),
    max_payout_annual       NUMERIC(15,4),
    clawback_period_days    INT,
    clawback_conditions     JSONB,
    effective_from          DATE         NOT NULL,
    effective_to            DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','TERMINATED','EXPIRED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commission_payout (
    id                      BIGSERIAL PRIMARY KEY,
    payout_code             VARCHAR(30)  NOT NULL UNIQUE,
    agreement_id            BIGINT       NOT NULL REFERENCES commission_agreement(id),
    party_id                VARCHAR(80)  NOT NULL,
    party_name              VARCHAR(200) NOT NULL,
    payout_period           VARCHAR(10)  NOT NULL CHECK (payout_period IN ('WEEKLY','MONTHLY','QUARTERLY')),
    period_start            DATE         NOT NULL,
    period_end              DATE         NOT NULL,
    currency                VARCHAR(3)   DEFAULT 'USD',
    gross_sales             NUMERIC(20,4) DEFAULT 0,
    qualifying_sales        NUMERIC(20,4) DEFAULT 0,
    commission_rate_applied NUMERIC(6,4),
    gross_commission        NUMERIC(15,4) NOT NULL,
    deductions              NUMERIC(15,4) DEFAULT 0,
    clawback_amount         NUMERIC(15,4) DEFAULT 0,
    tax_amount              NUMERIC(15,4) DEFAULT 0,
    net_commission          NUMERIC(15,4) NOT NULL,
    payment_account_id      BIGINT,
    payment_reference       VARCHAR(80),
    paid_at                 TIMESTAMP,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('CALCULATED','APPROVED','PAID','REVERSED','ON_HOLD')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_commpay_party ON commission_payout(party_id, period_start DESC);

-- ============================================================
-- Sales Support / Knowledge Base
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_knowledge_article (
    id                      BIGSERIAL PRIMARY KEY,
    article_code            VARCHAR(30)  NOT NULL UNIQUE,
    title                   VARCHAR(300) NOT NULL,
    article_type            VARCHAR(20)  NOT NULL CHECK (article_type IN ('PRODUCT_BRIEF','SALES_SCRIPT','FAQ','OBJECTION_HANDLER','COMPETITIVE_POSITION','PRICING_GUIDE','COMPLIANCE_NOTE','ONBOARDING_GUIDE','CROSS_SELL_TIP','CASE_STUDY')),
    product_family          VARCHAR(30),
    product_code            VARCHAR(30),
    content                 TEXT         NOT NULL,
    key_points              JSONB,
    target_audience         VARCHAR(20)  CHECK (target_audience IN ('SALES_OFFICER','RELATIONSHIP_MANAGER','BRANCH_STAFF','CALL_CENTER','AGENT','ALL')),
    tags                    JSONB,
    view_count              INT          DEFAULT 0,
    helpfulness_score       NUMERIC(3,1),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEWED','PUBLISHED','ARCHIVED')),
    published_at            TIMESTAMP,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_collateral (
    id                      BIGSERIAL PRIMARY KEY,
    collateral_code         VARCHAR(30)  NOT NULL UNIQUE,
    title                   VARCHAR(300) NOT NULL,
    collateral_type         VARCHAR(20)  NOT NULL CHECK (collateral_type IN ('BROCHURE','PRESENTATION','ONE_PAGER','INFOGRAPHIC','VIDEO','DEMO','CASE_STUDY','WHITE_PAPER','RATE_CARD','COMPARISON_SHEET')),
    product_family          VARCHAR(30),
    product_code            VARCHAR(30),
    description             TEXT,
    file_reference          VARCHAR(500),
    file_format             VARCHAR(10)  CHECK (file_format IN ('PDF','PPTX','DOCX','MP4','PNG','HTML','LINK')),
    file_size_kb            INT,
    target_audience         VARCHAR(20)  CHECK (target_audience IN ('CUSTOMER','PROSPECT','INTERNAL','PARTNER','ALL')),
    language                VARCHAR(10)  DEFAULT 'en',
    tags                    JSONB,
    download_count          INT          DEFAULT 0,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','PUBLISHED','ARCHIVED','EXPIRED')),
    published_at            TIMESTAMP,
    expires_at              TIMESTAMP,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);
