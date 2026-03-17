-- V25: Cash Management & Corporate Banking (BIAN Gap Remediation Batch 20)
-- Cash Concentration/Pooling, Notional Pooling, Corporate Payroll, Cheque Lock Box, Bank Drafts

SET search_path TO cbs;

-- ============================================================
-- BIAN SD: Cash Concentration / Physical Cash Pooling
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_pool_structure (
    id                      BIGSERIAL PRIMARY KEY,
    pool_code               VARCHAR(30)  NOT NULL UNIQUE,
    pool_name               VARCHAR(200) NOT NULL,
    pool_type               VARCHAR(20)  NOT NULL
                            CHECK (pool_type IN ('ZERO_BALANCE','TARGET_BALANCE','THRESHOLD','REVERSE_SWEEP','TIERED')),
    header_account_id       BIGINT       NOT NULL,
    customer_id             BIGINT       NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    sweep_frequency         VARCHAR(15)  NOT NULL DEFAULT 'DAILY'
                            CHECK (sweep_frequency IN ('REAL_TIME','HOURLY','DAILY','WEEKLY','MONTHLY','ON_DEMAND')),
    sweep_time              VARCHAR(10),
    target_balance          NUMERIC(20,4),
    threshold_amount        NUMERIC(20,4),
    min_sweep_amount        NUMERIC(20,4) DEFAULT 0,
    interest_reallocation   BOOLEAN      NOT NULL DEFAULT FALSE,
    intercompany_loan       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_cross_border         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_pool_participant (
    id                      BIGSERIAL PRIMARY KEY,
    pool_id                 BIGINT       NOT NULL REFERENCES cash_pool_structure(id),
    account_id              BIGINT       NOT NULL,
    participant_name        VARCHAR(200) NOT NULL,
    participant_role        VARCHAR(20)  NOT NULL DEFAULT 'PARTICIPANT'
                            CHECK (participant_role IN ('HEADER','PARTICIPANT','SUB_HEADER')),
    sweep_direction         VARCHAR(20)  NOT NULL DEFAULT 'BIDIRECTIONAL'
                            CHECK (sweep_direction IN ('TO_HEADER','FROM_HEADER','BIDIRECTIONAL')),
    target_balance          NUMERIC(20,4) DEFAULT 0,
    priority                INT          NOT NULL DEFAULT 100,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_pool_sweep_log (
    id                      BIGSERIAL PRIMARY KEY,
    pool_id                 BIGINT       NOT NULL REFERENCES cash_pool_structure(id),
    participant_id          BIGINT       NOT NULL REFERENCES cash_pool_participant(id),
    sweep_direction         VARCHAR(15)  NOT NULL CHECK (sweep_direction IN ('CONCENTRATE','DISTRIBUTE')),
    amount                  NUMERIC(20,4) NOT NULL,
    from_account_id         BIGINT       NOT NULL,
    to_account_id           BIGINT       NOT NULL,
    balance_before          NUMERIC(20,4),
    balance_after           NUMERIC(20,4),
    sweep_type              VARCHAR(20)  NOT NULL,
    is_intercompany_loan    BOOLEAN      NOT NULL DEFAULT FALSE,
    value_date              DATE         NOT NULL DEFAULT CURRENT_DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'COMPLETED'
                            CHECK (status IN ('PENDING','COMPLETED','FAILED','REVERSED')),
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_sweep_log_pool ON cash_pool_sweep_log(pool_id, value_date DESC);

-- ============================================================
-- BIAN SD: Notional Pooling
-- ============================================================
CREATE TABLE IF NOT EXISTS notional_pool (
    id                      BIGSERIAL PRIMARY KEY,
    pool_code               VARCHAR(30)  NOT NULL UNIQUE,
    pool_name               VARCHAR(200) NOT NULL,
    pool_type               VARCHAR(20)  NOT NULL
                            CHECK (pool_type IN ('SINGLE_CURRENCY','MULTI_CURRENCY','INTEREST_OPTIMIZATION','HYBRID')),
    customer_id             BIGINT       NOT NULL,
    base_currency           VARCHAR(3)   NOT NULL DEFAULT 'USD',
    interest_calc_method    VARCHAR(20)  NOT NULL DEFAULT 'NET_BALANCE'
                            CHECK (interest_calc_method IN ('NET_BALANCE','ADVANTAGE_RATE','TIERED','BLENDED')),
    credit_rate             NUMERIC(8,4),
    debit_rate              NUMERIC(8,4),
    advantage_spread        NUMERIC(6,4),
    notional_limit          NUMERIC(20,4),
    individual_debit_limit  NUMERIC(20,4),
    last_calc_date          DATE,
    net_pool_balance        NUMERIC(20,4),
    total_credit_balances   NUMERIC(20,4),
    total_debit_balances    NUMERIC(20,4),
    interest_benefit_mtd    NUMERIC(15,4) DEFAULT 0,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notional_pool_member (
    id                      BIGSERIAL PRIMARY KEY,
    pool_id                 BIGINT       NOT NULL REFERENCES notional_pool(id),
    account_id              BIGINT       NOT NULL,
    member_name             VARCHAR(200) NOT NULL,
    account_currency        VARCHAR(3)   NOT NULL,
    fx_rate_to_base         NUMERIC(15,8) DEFAULT 1.0,
    current_balance         NUMERIC(20,4),
    balance_in_base         NUMERIC(20,4),
    interest_allocation_pct NUMERIC(6,2),
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- BIAN SD: Corporate Payroll Services
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_batch (
    id                      BIGSERIAL PRIMARY KEY,
    batch_id                VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    company_name            VARCHAR(200) NOT NULL,
    debit_account_id        BIGINT       NOT NULL,
    payroll_type            VARCHAR(20)  NOT NULL
                            CHECK (payroll_type IN ('SALARY','BONUS','COMMISSION','ALLOWANCE','PENSION',
                                   'SEVERANCE','REIMBURSEMENT','ADVANCE')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    pay_period_start        DATE         NOT NULL,
    pay_period_end          DATE         NOT NULL,
    payment_date            DATE         NOT NULL,
    total_gross             NUMERIC(20,4) NOT NULL,
    total_deductions        NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_net               NUMERIC(20,4) NOT NULL,
    employee_count          INT          NOT NULL,
    total_tax               NUMERIC(15,4) DEFAULT 0,
    total_pension_employer  NUMERIC(15,4) DEFAULT 0,
    total_pension_employee  NUMERIC(15,4) DEFAULT 0,
    total_nhf               NUMERIC(15,4) DEFAULT 0,
    total_nsitf             NUMERIC(15,4) DEFAULT 0,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','VALIDATED','APPROVED','PROCESSING','COMPLETED',
                                   'PARTIALLY_COMPLETED','FAILED','CANCELLED')),
    approved_by             VARCHAR(80),
    approved_at             TIMESTAMP,
    processed_at            TIMESTAMP,
    failed_count            INT          DEFAULT 0,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_item (
    id                      BIGSERIAL PRIMARY KEY,
    batch_id                BIGINT       NOT NULL REFERENCES payroll_batch(id),
    employee_id             VARCHAR(40)  NOT NULL,
    employee_name           VARCHAR(200) NOT NULL,
    credit_account_number   VARCHAR(30)  NOT NULL,
    credit_bank_code        VARCHAR(20),
    gross_amount            NUMERIC(15,4) NOT NULL,
    tax_amount              NUMERIC(15,4) DEFAULT 0,
    pension_amount          NUMERIC(15,4) DEFAULT 0,
    other_deductions        NUMERIC(15,4) DEFAULT 0,
    net_amount              NUMERIC(15,4) NOT NULL,
    narration               VARCHAR(200),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','PAID','FAILED','RETURNED')),
    failure_reason          TEXT,
    payment_reference       VARCHAR(80),
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_batch_customer ON payroll_batch(customer_id, payment_date DESC);
CREATE INDEX idx_payroll_item_batch ON payroll_item(batch_id, status);

-- ============================================================
-- BIAN SD: Cheque Lock Box
-- ============================================================
CREATE TABLE IF NOT EXISTS lockbox (
    id                      BIGSERIAL PRIMARY KEY,
    lockbox_number          VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    credit_account_id       BIGINT       NOT NULL,
    lockbox_type            VARCHAR(20)  NOT NULL DEFAULT 'STANDARD'
                            CHECK (lockbox_type IN ('STANDARD','WHOLESALE','RETAIL','IMAGE','HYBRID')),
    lockbox_address         TEXT         NOT NULL,
    processing_cutoff_time  VARCHAR(10)  NOT NULL DEFAULT '14:00',
    auto_deposit            BOOLEAN      NOT NULL DEFAULT TRUE,
    ocr_enabled             BOOLEAN      NOT NULL DEFAULT TRUE,
    exception_handling      VARCHAR(20)  NOT NULL DEFAULT 'HOLD'
                            CHECK (exception_handling IN ('HOLD','RETURN','NOTIFY','AUTO_RESEARCH')),
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lockbox_item (
    id                      BIGSERIAL PRIMARY KEY,
    lockbox_id              BIGINT       NOT NULL REFERENCES lockbox(id),
    item_reference          VARCHAR(80)  NOT NULL UNIQUE,
    cheque_number           VARCHAR(30),
    drawer_name             VARCHAR(200),
    drawer_bank             VARCHAR(100),
    amount                  NUMERIC(15,4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    remitter_reference      VARCHAR(100),
    scanned_image_ref       VARCHAR(200),
    ocr_confidence          NUMERIC(5,2),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED'
                            CHECK (status IN ('RECEIVED','SCANNED','OCR_PROCESSED','VERIFIED','DEPOSITED',
                                   'EXCEPTION','RETURNED','REJECTED')),
    deposited_at            TIMESTAMP,
    exception_reason        TEXT,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_lockbox_item_status ON lockbox_item(lockbox_id, status, created_at DESC);

-- ============================================================
-- BIAN SD: Bank Drafts
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_draft (
    id                      BIGSERIAL PRIMARY KEY,
    draft_number            VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    debit_account_id        BIGINT       NOT NULL,
    draft_type              VARCHAR(20)  NOT NULL
                            CHECK (draft_type IN ('DEMAND_DRAFT','CASHIERS_CHECK','MANAGERS_CHECK',
                                   'CERTIFIED_CHECK','BANKERS_DRAFT','TRAVELLERS_CHECK')),
    payee_name              VARCHAR(200) NOT NULL,
    amount                  NUMERIC(15,4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    issue_branch_id         BIGINT,
    issue_date              DATE         NOT NULL DEFAULT CURRENT_DATE,
    expiry_date             DATE,
    delivery_method         VARCHAR(20)  NOT NULL DEFAULT 'BRANCH_PICKUP'
                            CHECK (delivery_method IN ('BRANCH_PICKUP','COURIER','REGISTERED_MAIL','ELECTRONIC')),
    delivery_address        TEXT,
    micr_line               VARCHAR(80),
    serial_number           VARCHAR(30),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'ISSUED'
                            CHECK (status IN ('REQUESTED','ISSUED','DISPATCHED','PRESENTED','PAID',
                                   'STOPPED','CANCELLED','EXPIRED','LOST','REISSUED')),
    presented_at            TIMESTAMP,
    paid_at                 TIMESTAMP,
    stop_reason             TEXT,
    reissued_as             VARCHAR(30),
    commission_amount       NUMERIC(12,4),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_draft_customer ON bank_draft(customer_id, status);
