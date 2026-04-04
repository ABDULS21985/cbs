SET search_path TO cbs;

-- ============================================================================
-- V87: Mudarabah Investment Deposits module
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. mudarabah_account — Islamic extension of account (one-to-one)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mudarabah_account (
    id                              BIGSERIAL PRIMARY KEY,
    account_id                      BIGINT NOT NULL UNIQUE REFERENCES account(id),
    contract_reference              VARCHAR(50) NOT NULL UNIQUE,
    contract_signed_date            DATE,
    contract_version                INT DEFAULT 1,
    islamic_product_template_id     BIGINT,
    contract_type_code              VARCHAR(30) DEFAULT 'MUDARABAH',
    mudarabah_type                  VARCHAR(20) NOT NULL CHECK (mudarabah_type IN ('UNRESTRICTED', 'RESTRICTED')),
    restriction_details             TEXT,
    account_sub_type                VARCHAR(30) NOT NULL CHECK (account_sub_type IN ('SAVINGS', 'TERM_DEPOSIT', 'RECURRING_DEPOSIT', 'NOTICE_DEPOSIT')),
    profit_sharing_ratio_customer   DECIMAL(8,4) NOT NULL,
    profit_sharing_ratio_bank       DECIMAL(8,4) NOT NULL,
    psr_agreed_at                   TIMESTAMP WITH TIME ZONE,
    psr_agreed_version              INT DEFAULT 1,
    psr_tier_decision_table_code    VARCHAR(100),
    investment_pool_id              BIGINT,
    pool_join_date                  DATE,
    current_weight                  DECIMAL(18,8),
    weightage_method                VARCHAR(30) DEFAULT 'DAILY_PRODUCT',
    last_profit_distribution_date   DATE,
    last_profit_distribution_amount DECIMAL(18,4),
    cumulative_profit_received      DECIMAL(18,4) DEFAULT 0,
    indicative_profit_rate          DECIMAL(8,4),
    profit_distribution_account_id  BIGINT,
    profit_reinvest                 BOOLEAN DEFAULT true,
    loss_exposure                   BOOLEAN DEFAULT true,
    loss_disclosure_accepted        BOOLEAN NOT NULL DEFAULT false,
    loss_disclosure_date            DATE,
    maximum_loss_exposure           DECIMAL(8,4),
    tenor_days                      INT,
    maturity_date                   DATE,
    maturity_instruction            VARCHAR(40),
    rollover_count                  INT DEFAULT 0,
    zakat_applicable                BOOLEAN DEFAULT true,
    last_zakat_calculation_date     DATE,
    notice_period_days              INT,
    early_withdrawal_allowed        BOOLEAN DEFAULT true,
    early_withdrawal_penalty        VARCHAR(30),
    last_activity_date              DATE,
    preferred_language              VARCHAR(10) DEFAULT 'EN',
    statement_frequency             VARCHAR(20) DEFAULT 'MONTHLY',
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT DEFAULT 0,

    CONSTRAINT chk_psr_sum   CHECK (profit_sharing_ratio_customer + profit_sharing_ratio_bank = 100.0000),
    CONSTRAINT chk_psr_range CHECK (profit_sharing_ratio_customer > 0
                                AND profit_sharing_ratio_customer <= 100
                                AND profit_sharing_ratio_bank > 0
                                AND profit_sharing_ratio_bank <= 100)
);

CREATE INDEX IF NOT EXISTS idx_mudarabah_account_account_id
    ON mudarabah_account (account_id);
CREATE INDEX IF NOT EXISTS idx_mudarabah_account_pool_id
    ON mudarabah_account (investment_pool_id);
CREATE INDEX IF NOT EXISTS idx_mudarabah_account_sub_type
    ON mudarabah_account (account_sub_type);
CREATE INDEX IF NOT EXISTS idx_mudarabah_account_tenant_id
    ON mudarabah_account (tenant_id);

-- --------------------------------------------------------------------------
-- 2. mudarabah_term_deposit — term deposit details
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mudarabah_term_deposit (
    id                              BIGSERIAL PRIMARY KEY,
    mudarabah_account_id            BIGINT NOT NULL UNIQUE REFERENCES mudarabah_account(id),
    deposit_ref                     VARCHAR(50) NOT NULL UNIQUE,
    principal_amount                DECIMAL(18,2) NOT NULL,
    currency_code                   VARCHAR(3) NOT NULL,
    tenor_days                      INT NOT NULL,
    tenor_months                    INT,
    start_date                      DATE NOT NULL,
    maturity_date                   DATE NOT NULL,
    maturity_date_hijri             VARCHAR(30),
    psr_customer                    DECIMAL(8,4) NOT NULL,
    psr_bank                        DECIMAL(8,4) NOT NULL,
    profit_distribution_frequency   VARCHAR(20) DEFAULT 'AT_MATURITY',
    last_profit_distribution_date   DATE,
    accumulated_profit              DECIMAL(18,4) DEFAULT 0,
    estimated_maturity_amount       DECIMAL(18,4),
    actual_maturity_amount          DECIMAL(18,4),
    investment_pool_id              BIGINT,
    pool_entry_date                 DATE,
    pool_exit_date                  DATE,
    maturity_instruction            VARCHAR(40) NOT NULL,
    payout_account_id               BIGINT,
    auto_renew                      BOOLEAN DEFAULT false,
    renewal_psr_customer            DECIMAL(8,4),
    renewal_psr_bank                DECIMAL(8,4),
    renewal_tenor_days              INT,
    rollover_count                  INT DEFAULT 0,
    original_deposit_ref            VARCHAR(50),
    early_withdrawal_allowed        BOOLEAN DEFAULT true,
    early_withdrawal_penalty_type   VARCHAR(30),
    early_withdrawal_reduced_psr    DECIMAL(8,4),
    early_withdrawn_at              DATE,
    early_withdrawal_reason         TEXT,
    status                          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    matured_at                      DATE,
    cancelled_at                    DATE,
    cancellation_reason             TEXT,
    has_lien                        BOOLEAN DEFAULT false,
    lien_reference                  VARCHAR(100),
    lien_amount                     DECIMAL(18,2),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT DEFAULT 0,

    CONSTRAINT chk_td_psr_sum CHECK (psr_customer + psr_bank = 100.0000)
);

CREATE INDEX IF NOT EXISTS idx_mudarabah_td_account_id
    ON mudarabah_term_deposit (mudarabah_account_id);
CREATE INDEX IF NOT EXISTS idx_mudarabah_td_status
    ON mudarabah_term_deposit (status);
CREATE INDEX IF NOT EXISTS idx_mudarabah_td_maturity_date
    ON mudarabah_term_deposit (maturity_date);
CREATE INDEX IF NOT EXISTS idx_mudarabah_td_pool_id
    ON mudarabah_term_deposit (investment_pool_id);

-- --------------------------------------------------------------------------
-- 3. psr_schedule — profit sharing ratio schedule
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS psr_schedule (
    id                   BIGSERIAL PRIMARY KEY,
    product_template_id  BIGINT,
    schedule_name        VARCHAR(200) NOT NULL,
    schedule_type        VARCHAR(40) NOT NULL CHECK (schedule_type IN ('FLAT', 'TIERED_BY_BALANCE', 'TIERED_BY_TENOR', 'TIERED_BY_SEGMENT', 'CUSTOM_DECISION_TABLE')),
    flat_psr_customer    DECIMAL(8,4),
    flat_psr_bank        DECIMAL(8,4),
    decision_table_code  VARCHAR(100),
    effective_from       DATE NOT NULL,
    effective_to         DATE,
    approved_by          VARCHAR(100),
    approved_at          TIMESTAMP WITH TIME ZONE,
    status               VARCHAR(20) DEFAULT 'ACTIVE',
    tenant_id            BIGINT,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),
    version              BIGINT DEFAULT 0
);

-- --------------------------------------------------------------------------
-- 4. psr_change_request — PSR change requests for existing accounts
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS psr_change_request (
    id                       BIGSERIAL PRIMARY KEY,
    account_id               BIGINT NOT NULL,
    mudarabah_account_id     BIGINT NOT NULL REFERENCES mudarabah_account(id),
    current_psr_customer     DECIMAL(8,4) NOT NULL,
    current_psr_bank         DECIMAL(8,4) NOT NULL,
    proposed_psr_customer    DECIMAL(8,4) NOT NULL,
    proposed_psr_bank        DECIMAL(8,4) NOT NULL,
    change_reason            VARCHAR(40) NOT NULL,
    reason_description       TEXT,
    customer_consent_required BOOLEAN DEFAULT true,
    customer_consent_given   BOOLEAN DEFAULT false,
    customer_consent_date    TIMESTAMP WITH TIME ZONE,
    customer_consent_method  VARCHAR(30),
    effective_date           DATE NOT NULL,
    status                   VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    approved_by              VARCHAR(100),
    approved_at              TIMESTAMP WITH TIME ZONE,
    applied_at               TIMESTAMP WITH TIME ZONE,
    tenant_id                BIGINT,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by               VARCHAR(100),
    updated_by               VARCHAR(100),
    version                  BIGINT DEFAULT 0,

    CONSTRAINT chk_proposed_psr_sum CHECK (proposed_psr_customer + proposed_psr_bank = 100.0000)
);

-- --------------------------------------------------------------------------
-- 5. pool_weightage_record — daily snapshot of participant balance in pool
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pool_weightage_record (
    id                       BIGSERIAL PRIMARY KEY,
    pool_id                  BIGINT NOT NULL,
    account_id               BIGINT NOT NULL,
    mudarabah_account_id     BIGINT NOT NULL,
    record_date              DATE NOT NULL,
    closing_balance          DECIMAL(18,4) NOT NULL,
    daily_product            DECIMAL(18,4) NOT NULL,
    cumulative_daily_product DECIMAL(18,4) DEFAULT 0,
    period_start_date        DATE NOT NULL,
    is_active                BOOLEAN DEFAULT true,
    tenant_id                BIGINT,
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (pool_id, account_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_pool_weightage_pool_id
    ON pool_weightage_record (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_weightage_record_date
    ON pool_weightage_record (record_date);
CREATE INDEX IF NOT EXISTS idx_pool_weightage_account_id
    ON pool_weightage_record (account_id);

-- --------------------------------------------------------------------------
-- 6. pool_profit_allocation — profit allocation per account per period
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pool_profit_allocation (
    id                        BIGSERIAL PRIMARY KEY,
    pool_id                   BIGINT NOT NULL,
    account_id                BIGINT NOT NULL,
    mudarabah_account_id      BIGINT NOT NULL,
    period_from               DATE NOT NULL,
    period_to                 DATE NOT NULL,
    total_daily_product       DECIMAL(18,4),
    pool_total_daily_product  DECIMAL(18,4),
    weightage_percentage      DECIMAL(12,8),
    pool_gross_profit         DECIMAL(18,4),
    gross_share_before_per    DECIMAL(18,4),
    per_adjustment            DECIMAL(18,4) DEFAULT 0,
    irr_deduction             DECIMAL(18,4) DEFAULT 0,
    net_share_after_reserves  DECIMAL(18,4),
    customer_psr              DECIMAL(8,4),
    customer_profit_share     DECIMAL(18,4),
    bank_profit_share         DECIMAL(18,4),
    effective_profit_rate     DECIMAL(8,4),
    distribution_status       VARCHAR(30) DEFAULT 'CALCULATED',
    distributed_at            TIMESTAMP WITH TIME ZONE,
    journal_ref               VARCHAR(50),
    tenant_id                 BIGINT,
    created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                VARCHAR(100),
    updated_by                VARCHAR(100),
    version                   BIGINT DEFAULT 0,

    UNIQUE (pool_id, account_id, period_from, period_to)
);

CREATE INDEX IF NOT EXISTS idx_pool_profit_alloc_pool_id
    ON pool_profit_allocation (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_profit_alloc_status
    ON pool_profit_allocation (distribution_status);
CREATE INDEX IF NOT EXISTS idx_pool_profit_alloc_period
    ON pool_profit_allocation (period_from);

-- --------------------------------------------------------------------------
-- 7. wakala_deposit_account — Wakala investment agency deposit
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wakala_deposit_account (
    id                          BIGSERIAL PRIMARY KEY,
    account_id                  BIGINT NOT NULL UNIQUE REFERENCES account(id),
    contract_reference          VARCHAR(50) NOT NULL UNIQUE,
    contract_signed_date        DATE,
    islamic_product_template_id BIGINT,
    contract_type_code          VARCHAR(30) DEFAULT 'WAKALAH',
    wakala_type                 VARCHAR(20) NOT NULL CHECK (wakala_type IN ('FIXED_FEE', 'PERCENTAGE_FEE', 'PERFORMANCE_FEE')),
    wakalah_fee_rate            DECIMAL(8,4),
    wakalah_fee_amount          DECIMAL(18,4),
    fee_frequency               VARCHAR(20) DEFAULT 'ANNUALLY',
    fee_accrued                 DECIMAL(18,4) DEFAULT 0,
    total_fees_charged          DECIMAL(18,4) DEFAULT 0,
    last_fee_charged_date       DATE,
    investment_mandate          TEXT,
    investment_mandate_ar       TEXT,
    target_return_rate          DECIMAL(8,4),
    expected_profit_rate        DECIMAL(8,4),
    risk_level                  VARCHAR(20) DEFAULT 'MEDIUM',
    account_sub_type            VARCHAR(20) NOT NULL CHECK (account_sub_type IN ('SAVINGS_WAKALA', 'TERM_WAKALA', 'NOTICE_WAKALA')),
    tenor_days                  INT,
    maturity_date               DATE,
    maturity_instruction        VARCHAR(30),
    investment_pool_id          BIGINT,
    pool_join_date              DATE,
    last_profit_distribution_date DATE,
    cumulative_profit_received  DECIMAL(18,4) DEFAULT 0,
    cumulative_fees_deducted    DECIMAL(18,4) DEFAULT 0,
    loss_exposure               BOOLEAN DEFAULT true,
    loss_disclosure_accepted    BOOLEAN NOT NULL DEFAULT false,
    bank_negligence_liability   BOOLEAN DEFAULT true,
    notice_period_days          INT,
    early_withdrawal_allowed    BOOLEAN DEFAULT true,
    preferred_language          VARCHAR(10) DEFAULT 'EN',
    statement_frequency         VARCHAR(20) DEFAULT 'MONTHLY',
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

-- ============================================================================
-- Seed data: Decision table for Mudarabah TD PSR by Tenor
-- ============================================================================

INSERT INTO business_rule (
    rule_code, name, name_ar, description,
    category, sub_category, rule_type, severity, status, priority,
    effective_from, tenant_id, created_at, updated_at, created_by
) VALUES (
    'MDR_TD_PSR_BY_TENOR',
    'Mudarabah TD PSR by Tenor',
    'نسبة المضاربة حسب المدة',
    'PSR tiers based on tenor and amount for Mudarabah term deposits',
    'PRICING', 'MUDARABAH_PSR', 'CALCULATION', 'BLOCKING', 'ACTIVE', 1,
    CURRENT_DATE, 1, NOW(), NOW(), 'SYSTEM'
);

INSERT INTO decision_table (
    rule_id, table_name, description,
    input_columns, output_columns,
    hit_policy, status, table_version,
    tenant_id, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM business_rule WHERE rule_code = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    'MDR_TD_PSR_BY_TENOR',
    'PSR tiers based on tenor and amount for Mudarabah term deposits',
    '[{"name":"tenor_months","type":"INTEGER_RANGE"},{"name":"amount","type":"DECIMAL_RANGE"},{"name":"customer_segment","type":"STRING"}]'::jsonb,
    '[{"name":"psr_customer","type":"DECIMAL"},{"name":"psr_bank","type":"DECIMAL"}]'::jsonb,
    'FIRST_MATCH', 'ACTIVE', 1,
    1, NOW(), NOW(), 'SYSTEM'
);

-- Row 1: tenor 1-3, amount >= 1,000,000, HNW → 68/32
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    1,
    '[{"from":1,"to":3},{"from":1000000,"to":null},{"value":"HNW"}]'::jsonb,
    '[{"value":68.00},{"value":32.00}]'::jsonb,
    'Short tenor, HNW, large amount', true, 1, NOW(), NOW(), 'SYSTEM'
);

-- Row 2: tenor 1-3, amount >= 100,000, * → 65/35
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    2,
    '[{"from":1,"to":3},{"from":100000,"to":null},{"value":"*"}]'::jsonb,
    '[{"value":65.00},{"value":35.00}]'::jsonb,
    'Short tenor, any segment, standard amount', true, 2, NOW(), NOW(), 'SYSTEM'
);

-- Row 3: tenor 4-6, amount >= 1,000,000, HNW → 72/28
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    3,
    '[{"from":4,"to":6},{"from":1000000,"to":null},{"value":"HNW"}]'::jsonb,
    '[{"value":72.00},{"value":28.00}]'::jsonb,
    'Medium tenor, HNW, large amount', true, 3, NOW(), NOW(), 'SYSTEM'
);

-- Row 4: tenor 4-6, amount >= 100,000, * → 70/30
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    4,
    '[{"from":4,"to":6},{"from":100000,"to":null},{"value":"*"}]'::jsonb,
    '[{"value":70.00},{"value":30.00}]'::jsonb,
    'Medium tenor, any segment, standard amount', true, 4, NOW(), NOW(), 'SYSTEM'
);

-- Row 5: tenor 7-12, amount >= 1,000,000, HNW → 76/24
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    5,
    '[{"from":7,"to":12},{"from":1000000,"to":null},{"value":"HNW"}]'::jsonb,
    '[{"value":76.00},{"value":24.00}]'::jsonb,
    'Long tenor, HNW, large amount', true, 5, NOW(), NOW(), 'SYSTEM'
);

-- Row 6: tenor 7-12, amount >= 100,000, * → 73/27
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    6,
    '[{"from":7,"to":12},{"from":100000,"to":null},{"value":"*"}]'::jsonb,
    '[{"value":73.00},{"value":27.00}]'::jsonb,
    'Long tenor, any segment, standard amount', true, 6, NOW(), NOW(), 'SYSTEM'
);

-- Row 7: tenor 13-36, amount >= 100,000, * → 75/25
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    7,
    '[{"from":13,"to":36},{"from":100000,"to":null},{"value":"*"}]'::jsonb,
    '[{"value":75.00},{"value":25.00}]'::jsonb,
    'Extended tenor, any segment, standard amount', true, 7, NOW(), NOW(), 'SYSTEM'
);

-- Row 8: tenor 37-60, amount >= 100,000, * → 78/22
INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_at, updated_at, created_by
) VALUES (
    (SELECT id FROM decision_table WHERE table_name = 'MDR_TD_PSR_BY_TENOR' AND COALESCE(tenant_id, -1) = 1),
    8,
    '[{"from":37,"to":60},{"from":100000,"to":null},{"value":"*"}]'::jsonb,
    '[{"value":78.00},{"value":22.00}]'::jsonb,
    'Maximum tenor, any segment, standard amount', true, 8, NOW(), NOW(), 'SYSTEM'
);
