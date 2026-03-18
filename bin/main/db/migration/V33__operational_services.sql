SET search_path TO cbs;

-- V33: Operational Services (Batch 27)
-- Open Item Mgmt, Channel Activity, Accounts Receivable, Position Mgmt,
-- Securities Position, Product Inventory, Issued Device, Card Switch

-- ============================================================
-- Open Item Management
-- ============================================================
CREATE TABLE IF NOT EXISTS open_item (
    id                      BIGSERIAL PRIMARY KEY,
    item_code               VARCHAR(30)  NOT NULL UNIQUE,
    item_type               VARCHAR(25)  NOT NULL CHECK (item_type IN ('UNMATCHED_TRANSACTION','SUSPENSE_ENTRY','RECONCILIATION_BREAK','FAILED_PAYMENT','PENDING_CHARGE','RETURNED_ITEM','DISPUTED_ENTRY','MANUAL_ADJUSTMENT')),
    item_category           VARCHAR(20)  NOT NULL CHECK (item_category IN ('PAYMENT','CLEARING','SETTLEMENT','FEE','INTEREST','FX','CARD','INTERNAL')),
    description             TEXT         NOT NULL,
    reference_number        VARCHAR(80),
    related_account_id      BIGINT,
    related_transaction_id  BIGINT,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    amount                  NUMERIC(20,4) NOT NULL,
    value_date              DATE         NOT NULL,
    aging_days              INT          DEFAULT 0,
    assigned_to             VARCHAR(80),
    assigned_team           VARCHAR(80),
    priority                VARCHAR(10)  DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    resolution_action       VARCHAR(20)  CHECK (resolution_action IN ('MATCHED','WRITTEN_OFF','REVERSED','REBOOKED','RETURNED','FORCE_POSTED','ESCALATED')),
    resolution_notes        TEXT,
    resolved_at             TIMESTAMP,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','INVESTIGATING','PENDING_APPROVAL','RESOLVED','ESCALATED','WRITTEN_OFF')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Channel Activity History / Analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_activity_log (
    id                      BIGSERIAL PRIMARY KEY,
    log_id                  VARCHAR(40)  NOT NULL UNIQUE,
    customer_id             BIGINT,
    session_id              VARCHAR(80),
    channel                 VARCHAR(20)  NOT NULL CHECK (channel IN ('MOBILE','WEB','ATM','BRANCH','USSD','CALL_CENTER','API','WHATSAPP','POS','AGENT')),
    activity_type           VARCHAR(30)  NOT NULL CHECK (activity_type IN ('LOGIN','LOGOUT','BALANCE_INQUIRY','TRANSFER','PAYMENT','CARD_REQUEST','LOAN_APPLICATION','COMPLAINT','PROFILE_UPDATE','DOCUMENT_UPLOAD','STATEMENT_DOWNLOAD','BENEFICIARY_ADD')),
    activity_detail         JSONB,
    ip_address              VARCHAR(45),
    device_fingerprint      VARCHAR(200),
    geo_location            VARCHAR(100),
    response_time_ms        INT,
    result_status           VARCHAR(15)  NOT NULL DEFAULT 'SUCCESS' CHECK (result_status IN ('SUCCESS','FAILURE','TIMEOUT','PARTIAL','DECLINED')),
    error_code              VARCHAR(30),
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_chal_customer_channel ON channel_activity_log(customer_id, channel, created_at DESC);

CREATE TABLE IF NOT EXISTS channel_activity_summary (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT       NOT NULL,
    channel                 VARCHAR(20)  NOT NULL,
    period_type             VARCHAR(10)  NOT NULL CHECK (period_type IN ('DAILY','WEEKLY','MONTHLY')),
    period_date             DATE         NOT NULL,
    total_sessions          INT          DEFAULT 0,
    total_transactions      INT          DEFAULT 0,
    total_amount            NUMERIC(20,4) DEFAULT 0,
    avg_response_time_ms    INT          DEFAULT 0,
    failure_count           INT          DEFAULT 0,
    unique_activities       INT          DEFAULT 0,
    most_used_activity      VARCHAR(30),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0,
    UNIQUE(customer_id, channel, period_type, period_date)
);

-- ============================================================
-- Accounts Receivable
-- ============================================================
CREATE TABLE IF NOT EXISTS receivable_invoice (
    id                      BIGSERIAL PRIMARY KEY,
    invoice_number          VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    invoice_type            VARCHAR(20)  NOT NULL CHECK (invoice_type IN ('SERVICE_FEE','ADVISORY_FEE','COMMISSION','PENALTY','INSURANCE_PREMIUM','CUSTODY_FEE','TRUST_FEE','GUARANTEE_FEE','LC_FEE','PROCESSING_FEE')),
    description             TEXT,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    gross_amount            NUMERIC(15,4) NOT NULL,
    tax_amount              NUMERIC(15,4) DEFAULT 0,
    net_amount              NUMERIC(15,4) NOT NULL,
    debit_account_id        BIGINT,
    due_date                DATE         NOT NULL,
    overdue_days            INT          DEFAULT 0,
    payment_reference       VARCHAR(80),
    paid_amount             NUMERIC(15,4) DEFAULT 0,
    outstanding_amount      NUMERIC(15,4),
    paid_at                 TIMESTAMP,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','WRITTEN_OFF','CANCELLED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_recv_inv_customer ON receivable_invoice(customer_id, status, due_date);

-- ============================================================
-- Position Management
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_position (
    id                      BIGSERIAL PRIMARY KEY,
    position_code           VARCHAR(30)  NOT NULL UNIQUE,
    position_type           VARCHAR(25)  NOT NULL CHECK (position_type IN ('CURRENCY','INSTRUMENT','COUNTERPARTY','SECTOR','COUNTRY','NOSTRO','VOSTRO','CLEARING','COLLATERAL')),
    position_category       VARCHAR(20)  NOT NULL CHECK (position_category IN ('TRADING','BANKING','INVESTMENT','HEDGE','LIQUIDITY')),
    identifier              VARCHAR(80)  NOT NULL,
    identifier_name         VARCHAR(200),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    long_position           NUMERIC(20,4) DEFAULT 0,
    short_position          NUMERIC(20,4) DEFAULT 0,
    net_position            NUMERIC(20,4) DEFAULT 0,
    position_limit          NUMERIC(20,4),
    limit_utilization_pct   NUMERIC(6,2),
    limit_breach            BOOLEAN      DEFAULT FALSE,
    avg_cost                NUMERIC(20,6),
    mark_to_market          NUMERIC(20,4),
    unrealized_pnl          NUMERIC(15,4),
    position_date           DATE         NOT NULL,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_fin_position ON financial_position(position_type, position_date DESC);

-- ============================================================
-- Securities Position Keeping
-- ============================================================
CREATE TABLE IF NOT EXISTS securities_position (
    id                      BIGSERIAL PRIMARY KEY,
    position_id             VARCHAR(30)  NOT NULL UNIQUE,
    portfolio_code          VARCHAR(30),
    custody_account_code    VARCHAR(30),
    instrument_code         VARCHAR(30)  NOT NULL,
    instrument_name         VARCHAR(300) NOT NULL,
    isin                    VARCHAR(12),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    quantity                NUMERIC(20,6) NOT NULL DEFAULT 0,
    avg_cost                NUMERIC(20,6),
    cost_basis              NUMERIC(20,4),
    current_price           NUMERIC(20,6),
    market_value            NUMERIC(20,4),
    unrealized_gain_loss    NUMERIC(20,4),
    accrued_interest        NUMERIC(15,4) DEFAULT 0,
    settlement_t0_count     INT          DEFAULT 0,
    settlement_t1_count     INT          DEFAULT 0,
    settlement_t2_count     INT          DEFAULT 0,
    pledged_quantity        NUMERIC(20,6) DEFAULT 0,
    available_quantity      NUMERIC(20,6),
    last_priced_at          TIMESTAMP,
    position_date           DATE         NOT NULL,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE TABLE IF NOT EXISTS securities_movement (
    id                      BIGSERIAL PRIMARY KEY,
    movement_ref            VARCHAR(30)  NOT NULL UNIQUE,
    position_id             VARCHAR(30)  NOT NULL,
    movement_type           VARCHAR(20)  NOT NULL CHECK (movement_type IN ('BUY','SELL','TRANSFER_IN','TRANSFER_OUT','CORPORATE_ACTION','DIVIDEND','COUPON','MATURITY','MARGIN_CALL','REPO_IN','REPO_OUT','PLEDGE','RELEASE')),
    quantity                NUMERIC(20,6) NOT NULL,
    price                   NUMERIC(20,6),
    settlement_amount       NUMERIC(20,4),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    counterparty_code       VARCHAR(30),
    trade_date              DATE         NOT NULL,
    settlement_date         DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SETTLED','FAILED','CANCELLED','REVERSED')),
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_sec_movement ON securities_movement(position_id, trade_date DESC);

-- ============================================================
-- Product Inventory Distribution
-- ============================================================
CREATE TABLE IF NOT EXISTS product_inventory_item (
    id                      BIGSERIAL PRIMARY KEY,
    item_code               VARCHAR(30)  NOT NULL UNIQUE,
    item_type               VARCHAR(25)  NOT NULL CHECK (item_type IN ('CHEQUE_BOOK','CARD_BLANK','PIN_MAILER','OTP_TOKEN','CERTIFICATE','PREPAID_CARD','SIM_CARD','POS_TERMINAL','PASSBOOK','WELCOME_KIT')),
    item_name               VARCHAR(200) NOT NULL,
    sku                     VARCHAR(40),
    branch_id               BIGINT,
    warehouse_code          VARCHAR(30),
    total_stock             INT          NOT NULL DEFAULT 0,
    allocated_stock         INT          NOT NULL DEFAULT 0,
    available_stock         INT          NOT NULL DEFAULT 0,
    reorder_level           INT          NOT NULL DEFAULT 10,
    reorder_quantity        INT          NOT NULL DEFAULT 100,
    unit_cost               NUMERIC(12,4),
    last_replenished_at     TIMESTAMP,
    last_issued_at          TIMESTAMP,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOW_STOCK','OUT_OF_STOCK','DISCONTINUED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- Issued Device Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS issued_device (
    id                      BIGSERIAL PRIMARY KEY,
    device_code             VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    device_type             VARCHAR(20)  NOT NULL CHECK (device_type IN ('DEBIT_CARD','CREDIT_CARD','PREPAID_CARD','OTP_TOKEN','HARDWARE_TOKEN','USB_DONGLE','PIN_MAILER','CHEQUE_BOOK','PASSBOOK')),
    device_identifier       VARCHAR(80),
    linked_account_id       BIGINT,
    issued_branch_id        BIGINT,
    delivery_method         VARCHAR(20)  DEFAULT 'BRANCH_PICKUP' CHECK (delivery_method IN ('BRANCH_PICKUP','COURIER','REGISTERED_MAIL','DIGITAL')),
    delivery_address        TEXT,
    activation_status       VARCHAR(15)  NOT NULL DEFAULT 'INACTIVE' CHECK (activation_status IN ('INACTIVE','ACTIVE','SUSPENDED','BLOCKED','EXPIRED','DESTROYED')),
    activated_at            TIMESTAMP,
    expiry_date             DATE,
    replacement_reason      VARCHAR(30)  CHECK (replacement_reason IN ('EXPIRED','LOST','STOLEN','DAMAGED','UPGRADE','FRAUD','CUSTOMER_REQUEST')),
    replaced_by_code        VARCHAR(30),
    issued_at               TIMESTAMP    NOT NULL DEFAULT now(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_issued_device_customer ON issued_device(customer_id, device_type, activation_status);

-- ============================================================
-- Card Transaction Switch
-- ============================================================
CREATE TABLE IF NOT EXISTS card_switch_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    switch_ref              VARCHAR(40)  NOT NULL UNIQUE,
    transaction_type        VARCHAR(20)  NOT NULL CHECK (transaction_type IN ('AUTHORIZATION','REVERSAL','CLEARING','SETTLEMENT','CHARGEBACK','REPRESENTMENT','PRE_AUTH','COMPLETION','REFUND','BALANCE_INQUIRY')),
    card_hash               VARCHAR(64)  NOT NULL,
    card_scheme             VARCHAR(20)  NOT NULL CHECK (card_scheme IN ('VISA','MASTERCARD','VERVE','AMEX','UNIONPAY','JCB','INTERSWITCH','DISCOVER')),
    merchant_id             VARCHAR(40),
    merchant_name           VARCHAR(200),
    merchant_category_code  VARCHAR(10),
    terminal_id             VARCHAR(30),
    amount                  NUMERIC(15,4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    billing_amount          NUMERIC(15,4),
    billing_currency        VARCHAR(3),
    response_code           VARCHAR(4)   NOT NULL,
    auth_code               VARCHAR(10),
    acquirer_institution    VARCHAR(11),
    issuer_institution      VARCHAR(11),
    network_ref             VARCHAR(40),
    pos_entry_mode          VARCHAR(10)  CHECK (pos_entry_mode IN ('CHIP','CONTACTLESS','MAGSTRIPE','MANUAL','ECOMMERCE','RECURRING','TOKEN')),
    auth2_settlement_avg_ms INT,
    is_international        BOOLEAN      DEFAULT FALSE,
    is_declined             BOOLEAN      DEFAULT FALSE,
    decline_reason          VARCHAR(60),
    fraud_score             INT          CHECK (fraud_score BETWEEN 0 AND 100),
    processed_at            TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_switch_scheme ON card_switch_transaction(card_scheme, processed_at DESC);
CREATE INDEX idx_card_switch_merchant ON card_switch_transaction(merchant_id, processed_at DESC);
