-- V27: Channels & Sales Enablement (BIAN Gap Remediation Batch 22)
-- Contact Centre, IVR, ATM Network Mgmt/Ops, POS Terminal, Lead/Opportunity, Campaigns, Service Directory

SET search_path TO cbs;

-- ============================================================
-- BIAN SD: Contact Center Management + Operations
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_center (
    id                      BIGSERIAL PRIMARY KEY,
    center_code             VARCHAR(30)  NOT NULL UNIQUE,
    center_name             VARCHAR(200) NOT NULL,
    center_type             VARCHAR(20)  NOT NULL
                            CHECK (center_type IN ('INBOUND','OUTBOUND','BLENDED','VIRTUAL','OFFSHORE')),
    timezone                VARCHAR(40)  NOT NULL DEFAULT 'UTC',
    operating_hours         JSONB,       -- {"mon":{"start":"08:00","end":"20:00"},"sat":{"start":"09:00","end":"14:00"}}
    total_agents            INT          NOT NULL DEFAULT 0,
    active_agents           INT          NOT NULL DEFAULT 0,
    queue_capacity          INT          NOT NULL DEFAULT 100,
    avg_wait_time_sec       INT          DEFAULT 0,
    avg_handle_time_sec     INT          DEFAULT 0,
    service_level_target    NUMERIC(5,2) NOT NULL DEFAULT 80.00,  -- % answered within SLA
    current_service_level   NUMERIC(5,2) DEFAULT 0,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_interaction (
    id                      BIGSERIAL PRIMARY KEY,
    interaction_id          VARCHAR(30)  NOT NULL UNIQUE,
    center_id               BIGINT       REFERENCES contact_center(id),
    customer_id             BIGINT,
    agent_id                VARCHAR(80),
    channel                 VARCHAR(20)  NOT NULL
                            CHECK (channel IN ('PHONE','EMAIL','CHAT','VIDEO','SOCIAL_MEDIA','SMS','CALLBACK','WHATSAPP')),
    direction               VARCHAR(10)  NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
    contact_reason          VARCHAR(60),
    queue_name              VARCHAR(60),
    wait_time_sec           INT          DEFAULT 0,
    handle_time_sec         INT          DEFAULT 0,
    wrap_up_time_sec        INT          DEFAULT 0,
    transfer_count          INT          DEFAULT 0,
    disposition             VARCHAR(30)
                            CHECK (disposition IN ('RESOLVED','ESCALATED','CALLBACK_SCHEDULED','TRANSFERRED',
                                   'ABANDONED','VOICEMAIL','NO_ANSWER','FOLLOW_UP_REQUIRED')),
    sentiment               VARCHAR(15)
                            CHECK (sentiment IN ('POSITIVE','NEUTRAL','NEGATIVE','VERY_NEGATIVE')),
    first_contact_resolution BOOLEAN     DEFAULT FALSE,
    case_id                 BIGINT,      -- linked customer_case
    notes                   TEXT,
    recording_ref           VARCHAR(200),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('QUEUED','ACTIVE','ON_HOLD','WRAP_UP','COMPLETED','ABANDONED')),
    started_at              TIMESTAMP    NOT NULL DEFAULT now(),
    ended_at                TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_interaction_customer ON contact_interaction(customer_id, created_at DESC);
CREATE INDEX idx_interaction_agent ON contact_interaction(agent_id, status, created_at DESC);

-- ============================================================
-- BIAN SD: Advanced Voice Services (IVR)
-- ============================================================
CREATE TABLE IF NOT EXISTS ivr_menu (
    id                      BIGSERIAL PRIMARY KEY,
    menu_code               VARCHAR(30)  NOT NULL UNIQUE,
    menu_name               VARCHAR(200) NOT NULL,
    language                VARCHAR(10)  NOT NULL DEFAULT 'en',
    parent_menu_id          BIGINT       REFERENCES ivr_menu(id),
    menu_level              INT          NOT NULL DEFAULT 0,
    prompt_text             TEXT         NOT NULL,
    prompt_audio_ref        VARCHAR(200),
    input_type              VARCHAR(15)  NOT NULL DEFAULT 'DTMF'
                            CHECK (input_type IN ('DTMF','VOICE','BOTH')),
    options                 JSONB        NOT NULL,  -- [{"key":"1","label":"Account Balance","action":"NAVIGATE","target":"BAL_MENU"},...]
    timeout_seconds         INT          NOT NULL DEFAULT 10,
    max_retries             INT          NOT NULL DEFAULT 3,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ivr_session (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              VARCHAR(30)  NOT NULL UNIQUE,
    caller_number           VARCHAR(30)  NOT NULL,
    customer_id             BIGINT,
    language                VARCHAR(10)  NOT NULL DEFAULT 'en',
    current_menu_id         BIGINT       REFERENCES ivr_menu(id),
    navigation_path         JSONB,       -- ["MAIN","ACCOUNTS","BALANCE"]
    authenticated           BOOLEAN      NOT NULL DEFAULT FALSE,
    self_service_completed  BOOLEAN      NOT NULL DEFAULT FALSE,
    transferred_to_agent    BOOLEAN      NOT NULL DEFAULT FALSE,
    transfer_reason         VARCHAR(100),
    duration_sec            INT          DEFAULT 0,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','COMPLETED','TRANSFERRED','ABANDONED','TIMEOUT')),
    started_at              TIMESTAMP    NOT NULL DEFAULT now(),
    ended_at                TIMESTAMP
);

-- ============================================================
-- BIAN SD: ATM Network Management + Operations
-- ============================================================
CREATE TABLE IF NOT EXISTS atm_network_node (
    id                      BIGSERIAL PRIMARY KEY,
    terminal_id             VARCHAR(30)  NOT NULL UNIQUE,
    terminal_type           VARCHAR(20)  NOT NULL
                            CHECK (terminal_type IN ('CASH_DISPENSER','FULL_FUNCTION','RECYCLER','DEPOSIT_ONLY',
                                   'KIOSK','CDM','SMART_TELLER')),
    network_zone            VARCHAR(40),
    branch_id               BIGINT,
    location_address        TEXT         NOT NULL,
    latitude                NUMERIC(10,7),
    longitude               NUMERIC(10,7),
    manufacturer            VARCHAR(60),
    model                   VARCHAR(60),
    software_version        VARCHAR(30),
    -- Cash management
    cash_capacity           NUMERIC(15,4),
    current_cash_level      NUMERIC(15,4) DEFAULT 0,
    low_cash_threshold      NUMERIC(15,4),
    last_replenished_at     TIMESTAMP,
    next_replenishment_due  DATE,
    -- Performance
    uptime_pct_mtd          NUMERIC(5,2) DEFAULT 100.00,
    transactions_today      INT          DEFAULT 0,
    transactions_mtd        INT          DEFAULT 0,
    last_transaction_at     TIMESTAMP,
    -- Maintenance
    last_maintenance_at     TIMESTAMP,
    next_maintenance_due    DATE,
    firmware_update_pending BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Status
    operational_status      VARCHAR(20)  NOT NULL DEFAULT 'ONLINE'
                            CHECK (operational_status IN ('ONLINE','OFFLINE','OUT_OF_CASH','DEGRADED',
                                   'MAINTENANCE','SUPERVISOR_MODE','TAMPER_ALERT')),
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_atm_network_status ON atm_network_node(operational_status, network_zone);

-- ============================================================
-- BIAN SD: Card Terminal Administration + Operation (POS)
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_terminal (
    id                      BIGSERIAL PRIMARY KEY,
    terminal_id             VARCHAR(30)  NOT NULL UNIQUE,
    terminal_type           VARCHAR(20)  NOT NULL
                            CHECK (terminal_type IN ('COUNTERTOP','MOBILE','VIRTUAL','UNATTENDED','SOFTPOS','PIN_PAD','INTEGRATED')),
    merchant_id             VARCHAR(80)  NOT NULL,
    merchant_name           VARCHAR(200) NOT NULL,
    merchant_category_code  VARCHAR(10),  -- MCC
    location_address        TEXT,
    -- Capabilities
    supports_contactless    BOOLEAN      NOT NULL DEFAULT TRUE,
    supports_chip           BOOLEAN      NOT NULL DEFAULT TRUE,
    supports_magstripe      BOOLEAN      NOT NULL DEFAULT FALSE,
    supports_pin            BOOLEAN      NOT NULL DEFAULT TRUE,
    supports_qr             BOOLEAN      NOT NULL DEFAULT FALSE,
    max_transaction_amount  NUMERIC(15,4),
    -- Configuration
    acquiring_bank_code     VARCHAR(20),
    settlement_account_id   BIGINT,
    batch_settlement_time   VARCHAR(10)  DEFAULT '23:00',
    -- Status
    last_transaction_at     TIMESTAMP,
    transactions_today      INT          DEFAULT 0,
    operational_status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (operational_status IN ('ACTIVE','INACTIVE','SUSPENDED','TAMPERED','DECOMMISSIONED')),
    last_heartbeat_at       TIMESTAMP,
    software_version        VARCHAR(30),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_terminal_merchant ON pos_terminal(merchant_id, operational_status);

-- ============================================================
-- BIAN SD: Lead and Opportunity Management
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_lead (
    id                      BIGSERIAL PRIMARY KEY,
    lead_number             VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT,      -- null for prospects
    prospect_name           VARCHAR(200) NOT NULL,
    prospect_phone          VARCHAR(30),
    prospect_email          VARCHAR(200),
    lead_source             VARCHAR(30)  NOT NULL
                            CHECK (lead_source IN ('WEBSITE','REFERRAL','BRANCH_WALK_IN','PHONE_INQUIRY',
                                   'CAMPAIGN','PARTNER','EVENT','SOCIAL_MEDIA','EXISTING_CUSTOMER','AGENT')),
    product_interest        VARCHAR(60),
    estimated_value         NUMERIC(15,4),
    assigned_to             VARCHAR(80),
    lead_score              INT          DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
    stage                   VARCHAR(20)  NOT NULL DEFAULT 'NEW'
                            CHECK (stage IN ('NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION',
                                   'WON','LOST','DISQUALIFIED')),
    lost_reason             VARCHAR(200),
    next_follow_up          DATE,
    notes                   TEXT,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_lead_stage ON sales_lead(stage, assigned_to, lead_score DESC);

-- ============================================================
-- BIAN SD: Customer/Prospect Campaign Design + Execution
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_campaign (
    id                      BIGSERIAL PRIMARY KEY,
    campaign_code           VARCHAR(30)  NOT NULL UNIQUE,
    campaign_name           VARCHAR(200) NOT NULL,
    campaign_type           VARCHAR(20)  NOT NULL
                            CHECK (campaign_type IN ('ACQUISITION','CROSS_SELL','UP_SELL','RETENTION',
                                   'REACTIVATION','AWARENESS','EVENT','SEASONAL','REGULATORY')),
    target_audience         VARCHAR(30)  NOT NULL
                            CHECK (target_audience IN ('PROSPECT','EXISTING_CUSTOMER','SEGMENT','ALL')),
    channel                 VARCHAR(20)  NOT NULL
                            CHECK (channel IN ('EMAIL','SMS','PUSH_NOTIFICATION','IN_APP','BRANCH',
                                   'CALL_CENTER','SOCIAL_MEDIA','DIRECT_MAIL','MULTI_CHANNEL')),
    target_segment          VARCHAR(60),
    target_count            INT,
    -- Content
    message_template        TEXT,
    offer_details           JSONB,
    call_to_action          VARCHAR(200),
    landing_url             VARCHAR(500),
    -- Schedule
    start_date              DATE         NOT NULL,
    end_date                DATE,
    send_time               VARCHAR(10),
    -- Budget
    budget_amount           NUMERIC(15,4),
    spent_amount            NUMERIC(15,4) DEFAULT 0,
    -- Performance
    sent_count              INT          DEFAULT 0,
    delivered_count         INT          DEFAULT 0,
    opened_count            INT          DEFAULT 0,
    clicked_count           INT          DEFAULT 0,
    converted_count         INT          DEFAULT 0,
    unsubscribed_count      INT          DEFAULT 0,
    revenue_generated       NUMERIC(20,4) DEFAULT 0,
    -- Status
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','APPROVED','SCHEDULED','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
    approved_by             VARCHAR(80),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_status ON marketing_campaign(status, start_date);

-- ============================================================
-- BIAN SD: Service Directory
-- ============================================================
CREATE TABLE IF NOT EXISTS service_directory_entry (
    id                      BIGSERIAL PRIMARY KEY,
    service_code            VARCHAR(40)  NOT NULL UNIQUE,
    service_name            VARCHAR(200) NOT NULL,
    service_category        VARCHAR(30)  NOT NULL
                            CHECK (service_category IN ('ACCOUNT','PAYMENT','LENDING','CARD','INVESTMENT',
                                   'INSURANCE','TRADE_FINANCE','TREASURY','SUPPORT','DIGITAL','COMPLIANCE')),
    description             TEXT,
    available_channels      JSONB,       -- ["BRANCH","MOBILE","WEB","ATM","CALL_CENTER"]
    eligibility_rules       JSONB,
    requires_appointment    BOOLEAN      NOT NULL DEFAULT FALSE,
    sla_minutes             INT,
    fee_applicable          BOOLEAN      NOT NULL DEFAULT FALSE,
    fee_amount              NUMERIC(12,4),
    documentation_url       VARCHAR(500),
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);
