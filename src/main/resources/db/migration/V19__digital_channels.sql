-- V19__digital_channels.sql
-- Capabilities 52-58: Omnichannel, Mobile, Internet Banking, USSD, Chatbot, Agent, ATM

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 52: OMNICHANNEL ORCHESTRATION
-- ============================================================

CREATE TABLE channel_session (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              VARCHAR(50) NOT NULL UNIQUE,
    customer_id             BIGINT REFERENCES customer(id),
    channel                 VARCHAR(20) NOT NULL CHECK (channel IN (
                                'MOBILE','WEB','USSD','WHATSAPP','BRANCH','ATM','POS','AGENT','API','IVR')),
    -- Device / context
    device_id               VARCHAR(100),
    device_type             VARCHAR(20),
    ip_address              VARCHAR(45),
    user_agent              VARCHAR(500),
    geo_latitude            NUMERIC(10,7),
    geo_longitude           NUMERIC(10,7),
    -- Session
    started_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at                TIMESTAMP WITH TIME ZONE,
    timeout_seconds         INT NOT NULL DEFAULT 300,
    -- Continuity (for cross-channel handoff)
    parent_session_id       VARCHAR(50),
    handoff_from_channel    VARCHAR(20),
    context_data            JSONB DEFAULT '{}',
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','IDLE','HANDED_OFF','EXPIRED','ENDED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_customer ON channel_session(customer_id);
CREATE INDEX idx_session_channel ON channel_session(channel);
CREATE INDEX idx_session_status ON channel_session(status);

CREATE TABLE channel_config (
    id                      BIGSERIAL PRIMARY KEY,
    channel                 VARCHAR(20) NOT NULL UNIQUE,
    display_name            VARCHAR(50) NOT NULL,
    is_enabled              BOOLEAN NOT NULL DEFAULT TRUE,
    -- Features
    features_enabled        JSONB NOT NULL DEFAULT '[]',
    transaction_types       JSONB NOT NULL DEFAULT '[]',
    -- Limits
    max_transfer_amount     NUMERIC(18,2),
    daily_limit             NUMERIC(18,2),
    session_timeout_secs    INT NOT NULL DEFAULT 300,
    -- Operating hours
    operating_hours         VARCHAR(200) DEFAULT '24/7',
    maintenance_window      VARCHAR(100),
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

-- ============================================================
-- CAPABILITY 55: USSD BANKING
-- ============================================================

CREATE TABLE ussd_menu (
    id                      BIGSERIAL PRIMARY KEY,
    menu_code               VARCHAR(20) NOT NULL UNIQUE,
    parent_menu_code        VARCHAR(20),
    display_order           INT NOT NULL DEFAULT 0,
    title                   VARCHAR(100) NOT NULL,
    shortcode               VARCHAR(20),
    -- Action
    action_type             VARCHAR(20) NOT NULL CHECK (action_type IN (
                                'MENU','BALANCE','TRANSFER','AIRTIME','BILL_PAY',
                                'MINI_STATEMENT','PIN_CHANGE','ACCOUNT_OPEN','OTHER')),
    service_code            VARCHAR(50),
    requires_pin            BOOLEAN NOT NULL DEFAULT FALSE,
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE ussd_session (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              VARCHAR(50) NOT NULL,
    msisdn                  VARCHAR(20) NOT NULL,
    customer_id             BIGINT REFERENCES customer(id),
    current_menu_code       VARCHAR(20),
    session_data            JSONB DEFAULT '{}',
    input_history           JSONB DEFAULT '[]',
    started_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_input_at           TIMESTAMP WITH TIME ZONE,
    ended_at                TIMESTAMP WITH TIME ZONE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','COMPLETED','TIMEOUT','ERROR')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ussd_session_msisdn ON ussd_session(msisdn);

-- ============================================================
-- CAPABILITY 57: AGENT / AGENCY BANKING
-- ============================================================

CREATE TABLE banking_agent (
    id                      BIGSERIAL PRIMARY KEY,
    agent_code              VARCHAR(20) NOT NULL UNIQUE,
    agent_name              VARCHAR(200) NOT NULL,
    agent_type              VARCHAR(20) NOT NULL CHECK (agent_type IN (
                                'INDIVIDUAL','CORPORATE','SUPER_AGENT','SUB_AGENT')),
    -- Owner
    customer_id             BIGINT REFERENCES customer(id),
    -- Location
    address                 TEXT,
    city                    VARCHAR(100),
    state_province          VARCHAR(100),
    country_code            VARCHAR(3),
    geo_latitude            NUMERIC(10,7),
    geo_longitude           NUMERIC(10,7),
    -- Float
    float_account_id        BIGINT REFERENCES account(id),
    commission_account_id   BIGINT REFERENCES account(id),
    float_balance           NUMERIC(18,2) NOT NULL DEFAULT 0,
    min_float_balance       NUMERIC(18,2) DEFAULT 0,
    -- Commission
    commission_model        VARCHAR(20) CHECK (commission_model IN ('FLAT','PERCENTAGE','TIERED')),
    commission_rate         NUMERIC(8,4),
    -- Limits
    daily_txn_limit         NUMERIC(18,2),
    single_txn_limit        NUMERIC(18,2),
    monthly_txn_limit       NUMERIC(18,2),
    -- Parent
    parent_agent_code       VARCHAR(20),
    branch_code             VARCHAR(20),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','DEACTIVATED')),
    onboarded_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    last_transaction_date   DATE,
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_agent_status ON banking_agent(status);
CREATE INDEX idx_agent_geo ON banking_agent(geo_latitude, geo_longitude);

CREATE TABLE agent_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    agent_id                BIGINT NOT NULL REFERENCES banking_agent(id),
    transaction_type        VARCHAR(20) NOT NULL CHECK (transaction_type IN (
                                'CASH_IN','CASH_OUT','TRANSFER','BILL_PAY','AIRTIME',
                                'ACCOUNT_OPEN','FLOAT_TOP_UP','FLOAT_WITHDRAWAL')),
    customer_id             BIGINT REFERENCES customer(id),
    account_id              BIGINT REFERENCES account(id),
    amount                  NUMERIC(18,2) NOT NULL,
    commission_amount       NUMERIC(18,2) DEFAULT 0,
    currency_code           VARCHAR(3) NOT NULL DEFAULT 'USD',
    reference               VARCHAR(50),
    status                  VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    geo_latitude            NUMERIC(10,7),
    geo_longitude           NUMERIC(10,7),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_agent_txn ON agent_transaction(agent_id);

-- ============================================================
-- CAPABILITY 58: ATM / KIOSK MANAGEMENT
-- ============================================================

CREATE TABLE atm_terminal (
    id                      BIGSERIAL PRIMARY KEY,
    terminal_id             VARCHAR(20) NOT NULL UNIQUE,
    terminal_name           VARCHAR(100) NOT NULL,
    terminal_type           VARCHAR(20) NOT NULL CHECK (terminal_type IN (
                                'ATM','CRM','KIOSK','CASH_RECYCLER','SMART_ATM')),
    -- Location
    branch_code             VARCHAR(20),
    address                 TEXT,
    city                    VARCHAR(100),
    geo_latitude            NUMERIC(10,7),
    geo_longitude           NUMERIC(10,7),
    -- Cash
    vault_id                BIGINT REFERENCES vault(id),
    current_cash_balance    NUMERIC(18,2) NOT NULL DEFAULT 0,
    max_cash_capacity       NUMERIC(18,2),
    min_cash_threshold      NUMERIC(18,2),
    currency_code           VARCHAR(3) NOT NULL DEFAULT 'USD',
    last_replenished_at     TIMESTAMP WITH TIME ZONE,
    forecasted_empty_date   DATE,
    -- Hardware
    manufacturer            VARCHAR(50),
    model                   VARCHAR(50),
    serial_number           VARCHAR(50),
    software_version        VARCHAR(30),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ONLINE'
                                CHECK (status IN ('ONLINE','OFFLINE','OUT_OF_CASH','FAULT','MAINTENANCE','DECOMMISSIONED')),
    last_health_check       TIMESTAMP WITH TIME ZONE,
    -- Features
    supports_cardless       BOOLEAN NOT NULL DEFAULT FALSE,
    supports_deposit        BOOLEAN NOT NULL DEFAULT FALSE,
    supports_cheque_deposit BOOLEAN NOT NULL DEFAULT FALSE,
    -- Audit
    installed_date          DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_atm_status ON atm_terminal(status);
CREATE INDEX idx_atm_branch ON atm_terminal(branch_code);

CREATE TABLE atm_journal_entry (
    id                      BIGSERIAL PRIMARY KEY,
    terminal_id             VARCHAR(20) NOT NULL,
    journal_type            VARCHAR(20) NOT NULL CHECK (journal_type IN (
                                'WITHDRAWAL','DEPOSIT','BALANCE_INQUIRY','TRANSFER',
                                'REPLENISHMENT','FAULT','CARD_RETAINED')),
    card_number_masked      VARCHAR(20),
    amount                  NUMERIC(18,2),
    response_code           VARCHAR(4),
    status                  VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    error_description       VARCHAR(300),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_atm_journal_terminal ON atm_journal_entry(terminal_id);
CREATE INDEX idx_atm_journal_date ON atm_journal_entry(created_at);
