-- V8__payments_microfinance_schema.sql
-- Capabilities 26-30: Microfinance, Real-Time Payments, Bulk, SWIFT, Standing Orders

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 26: MICROFINANCE & GROUP LENDING
-- ============================================================

CREATE TABLE lending_group (
    id                      BIGSERIAL PRIMARY KEY,
    group_number            VARCHAR(30) NOT NULL UNIQUE,
    group_name              VARCHAR(100) NOT NULL,
    group_type              VARCHAR(20) NOT NULL CHECK (group_type IN ('SOLIDARITY','VILLAGE_BANKING','SELF_HELP','COOPERATIVE')),
    -- Leader
    leader_customer_id      BIGINT REFERENCES customer(id),
    secretary_customer_id   BIGINT REFERENCES customer(id),
    -- Location
    meeting_location        VARCHAR(200),
    meeting_frequency       VARCHAR(20) CHECK (meeting_frequency IN ('WEEKLY','BI_WEEKLY','MONTHLY')),
    meeting_day             VARCHAR(10),
    -- Operational
    max_members             INT NOT NULL DEFAULT 30,
    current_members         INT NOT NULL DEFAULT 0,
    branch_code             VARCHAR(20),
    field_officer           VARCHAR(100),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('FORMING','ACTIVE','SUSPENDED','DISSOLVED')),
    formed_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE group_member (
    id                      BIGSERIAL PRIMARY KEY,
    group_id                BIGINT NOT NULL REFERENCES lending_group(id) ON DELETE CASCADE,
    customer_id             BIGINT NOT NULL REFERENCES customer(id),
    role                    VARCHAR(20) NOT NULL DEFAULT 'MEMBER'
                                CHECK (role IN ('LEADER','SECRETARY','TREASURER','MEMBER')),
    joined_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    left_date               DATE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    -- Guarantee
    guarantee_amount        NUMERIC(18,2) DEFAULT 0,
    savings_balance         NUMERIC(18,2) DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0,
    UNIQUE(group_id, customer_id)
);

CREATE INDEX idx_group_member_group ON group_member(group_id);
CREATE INDEX idx_group_member_customer ON group_member(customer_id);

CREATE TABLE group_meeting (
    id                      BIGSERIAL PRIMARY KEY,
    group_id                BIGINT NOT NULL REFERENCES lending_group(id) ON DELETE CASCADE,
    meeting_date            DATE NOT NULL,
    attendance_count        INT NOT NULL DEFAULT 0,
    total_collections       NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_disbursements     NUMERIC(18,2) NOT NULL DEFAULT 0,
    notes                   TEXT,
    conducted_by            VARCHAR(100),
    gps_latitude            NUMERIC(10,7),
    gps_longitude           NUMERIC(10,7),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_group_meeting_group ON group_meeting(group_id);

CREATE SEQUENCE lending_group_seq START WITH 1000001 INCREMENT BY 1;

-- ============================================================
-- CAPABILITY 27-28: PAYMENT ROUTING & BULK PAYMENTS
-- ============================================================

CREATE TABLE payment_instruction (
    id                      BIGSERIAL PRIMARY KEY,
    instruction_ref         VARCHAR(40) NOT NULL UNIQUE,
    payment_type            VARCHAR(30) NOT NULL CHECK (payment_type IN (
                                'INTERNAL_TRANSFER','DOMESTIC_INSTANT','DOMESTIC_BATCH',
                                'INTERNATIONAL_WIRE','DIRECT_DEBIT','STANDING_ORDER',
                                'BILL_PAYMENT','QR_PAYMENT','MOBILE_MONEY')),
    -- Source
    debit_account_id        BIGINT REFERENCES account(id),
    debit_account_number    VARCHAR(34) NOT NULL,
    -- Destination
    credit_account_id       BIGINT REFERENCES account(id),
    credit_account_number   VARCHAR(34) NOT NULL,
    beneficiary_name        VARCHAR(200),
    beneficiary_bank_code   VARCHAR(20),
    beneficiary_bank_name   VARCHAR(200),
    -- Amount
    amount                  NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- FX (for cross-currency)
    fx_rate                 NUMERIC(18,8),
    fx_source_currency      VARCHAR(3),
    fx_target_currency      VARCHAR(3),
    fx_converted_amount     NUMERIC(18,2),
    -- Routing
    payment_rail            VARCHAR(30),
    clearing_system         VARCHAR(50),
    routing_code            VARCHAR(30),
    -- Scheduling
    value_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    execution_date          DATE,
    -- SWIFT specific
    swift_message_type      VARCHAR(10),
    swift_uetr              VARCHAR(36),
    purpose_code            VARCHAR(10),
    remittance_info         TEXT,
    -- Charges
    charge_type             VARCHAR(10) DEFAULT 'SHA' CHECK (charge_type IN ('SHA','OUR','BEN')),
    charge_amount           NUMERIC(18,2) DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','VALIDATED','SCREENING','APPROVED',
                                    'SUBMITTED','PROCESSING','COMPLETED','FAILED','REJECTED',
                                    'RETURNED','CANCELLED')),
    failure_reason          TEXT,
    -- Sanctions
    screening_status        VARCHAR(20) DEFAULT 'PENDING'
                                CHECK (screening_status IN ('PENDING','CLEAR','HIT','FALSE_POSITIVE','ESCALATED')),
    screening_ref           VARCHAR(50),
    -- Batch
    batch_id                VARCHAR(30),
    batch_sequence          INT,
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_payment_status ON payment_instruction(status);
CREATE INDEX idx_payment_debit ON payment_instruction(debit_account_id);
CREATE INDEX idx_payment_credit ON payment_instruction(credit_account_id);
CREATE INDEX idx_payment_ref ON payment_instruction(instruction_ref);
CREATE INDEX idx_payment_batch ON payment_instruction(batch_id);
CREATE INDEX idx_payment_value_date ON payment_instruction(value_date);

CREATE TABLE payment_batch (
    id                      BIGSERIAL PRIMARY KEY,
    batch_ref               VARCHAR(30) NOT NULL UNIQUE,
    batch_type              VARCHAR(30) NOT NULL CHECK (batch_type IN ('SALARY','VENDOR','DIVIDEND','PENSION','TAX','CUSTOM')),
    debit_account_id        BIGINT NOT NULL REFERENCES account(id),
    -- Totals
    total_records           INT NOT NULL DEFAULT 0,
    total_amount            NUMERIC(18,2) NOT NULL DEFAULT 0,
    successful_count        INT NOT NULL DEFAULT 0,
    failed_count            INT NOT NULL DEFAULT 0,
    successful_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    failed_amount           NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Schedule
    value_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','VALIDATING','APPROVED','PROCESSING',
                                    'COMPLETED','PARTIAL','FAILED','CANCELLED')),
    -- Approval
    approved_by             VARCHAR(100),
    approved_at             TIMESTAMP WITH TIME ZONE,
    -- Audit
    narration               VARCHAR(300),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_batch_status ON payment_batch(status);

-- ============================================================
-- FX RATES (needed for SWIFT / cross-currency)
-- ============================================================

CREATE TABLE fx_rate (
    id                      BIGSERIAL PRIMARY KEY,
    source_currency         VARCHAR(3) NOT NULL REFERENCES currency(code),
    target_currency         VARCHAR(3) NOT NULL REFERENCES currency(code),
    buy_rate                NUMERIC(18,8) NOT NULL,
    sell_rate               NUMERIC(18,8) NOT NULL,
    mid_rate                NUMERIC(18,8) NOT NULL,
    rate_date               DATE NOT NULL DEFAULT CURRENT_DATE,
    rate_source             VARCHAR(50),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    UNIQUE(source_currency, target_currency, rate_date)
);

CREATE INDEX idx_fx_rate_pair ON fx_rate(source_currency, target_currency);
CREATE INDEX idx_fx_rate_date ON fx_rate(rate_date DESC);

-- ============================================================
-- CAPABILITY 30: DIRECT DEBIT & STANDING ORDERS
-- ============================================================

CREATE TABLE standing_instruction (
    id                      BIGSERIAL PRIMARY KEY,
    instruction_ref         VARCHAR(30) NOT NULL UNIQUE,
    instruction_type        VARCHAR(20) NOT NULL CHECK (instruction_type IN ('STANDING_ORDER','DIRECT_DEBIT')),
    -- Accounts
    debit_account_id        BIGINT NOT NULL REFERENCES account(id),
    credit_account_number   VARCHAR(34) NOT NULL,
    credit_account_name     VARCHAR(200),
    credit_bank_code        VARCHAR(20),
    -- Amount
    amount                  NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Schedule
    frequency               VARCHAR(20) NOT NULL CHECK (frequency IN ('WEEKLY','BI_WEEKLY','MONTHLY','QUARTERLY','ANNUALLY')),
    start_date              DATE NOT NULL,
    end_date                DATE,
    next_execution_date     DATE NOT NULL,
    last_execution_date     DATE,
    -- Execution tracking
    total_executions        INT NOT NULL DEFAULT 0,
    successful_executions   INT NOT NULL DEFAULT 0,
    failed_executions       INT NOT NULL DEFAULT 0,
    max_executions          INT,
    -- Retry
    max_retries             INT NOT NULL DEFAULT 3,
    retry_count             INT NOT NULL DEFAULT 0,
    -- Direct debit mandate
    mandate_ref             VARCHAR(50),
    mandate_holder_name     VARCHAR(200),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING','ACTIVE','PAUSED','COMPLETED','CANCELLED','EXPIRED')),
    narration               VARCHAR(300),
    -- Audit
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_standing_debit ON standing_instruction(debit_account_id);
CREATE INDEX idx_standing_next ON standing_instruction(next_execution_date) WHERE status = 'ACTIVE';
CREATE INDEX idx_standing_status ON standing_instruction(status);

CREATE TABLE standing_execution_log (
    id                      BIGSERIAL PRIMARY KEY,
    instruction_id          BIGINT NOT NULL REFERENCES standing_instruction(id) ON DELETE CASCADE,
    execution_date          DATE NOT NULL,
    amount                  NUMERIC(18,2) NOT NULL,
    status                  VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS','FAILED','RETRY_PENDING','SKIPPED')),
    failure_reason          VARCHAR(300),
    payment_instruction_id  BIGINT REFERENCES payment_instruction(id),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_standing_exec_instruction ON standing_execution_log(instruction_id);

CREATE SEQUENCE payment_instruction_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE payment_batch_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE standing_instruction_seq START WITH 1 INCREMENT BY 1;
