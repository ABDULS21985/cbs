-- V88: AAOIFI chart of accounts, Islamic GL metadata, investment pools, reserves, and posting rules

SET search_path TO cbs;

-- ---------------------------------------------------------------------------
-- Extend existing chart_of_accounts with Islamic metadata
-- ---------------------------------------------------------------------------

ALTER TABLE chart_of_accounts
    ADD COLUMN IF NOT EXISTS islamic_account_category VARCHAR(80),
    ADD COLUMN IF NOT EXISTS contract_type_code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS investment_pool_id BIGINT,
    ADD COLUMN IF NOT EXISTS shariah_classification VARCHAR(30),
    ADD COLUMN IF NOT EXISTS is_islamic_account BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS aaoifi_reference VARCHAR(120),
    ADD COLUMN IF NOT EXISTS aaoifi_line_item VARCHAR(120),
    ADD COLUMN IF NOT EXISTS profit_distribution_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS profit_distribution_pool VARCHAR(60),
    ADD COLUMN IF NOT EXISTS zakat_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS purification_percentage NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS contra_account_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_reserve_account BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reserve_type VARCHAR(10) NOT NULL DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS last_review_date DATE,
    ADD COLUMN IF NOT EXISTS next_review_date DATE,
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_islamic_category
    ON chart_of_accounts (islamic_account_category);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_contract_type
    ON chart_of_accounts (contract_type_code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_investment_pool
    ON chart_of_accounts (investment_pool_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_is_islamic
    ON chart_of_accounts (is_islamic_account);

-- ---------------------------------------------------------------------------
-- Investment pools
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS investment_pool (
    id                              BIGSERIAL PRIMARY KEY,
    pool_code                       VARCHAR(60) NOT NULL,
    name                            VARCHAR(200) NOT NULL,
    name_ar                         VARCHAR(200),
    pool_type                       VARCHAR(20) NOT NULL CHECK (pool_type IN ('UNRESTRICTED','RESTRICTED')),
    currency_code                   VARCHAR(3) NOT NULL REFERENCES currency(code),
    description                     TEXT,
    investment_policy               TEXT,
    restriction_details             TEXT,
    total_pool_balance              NUMERIC(18,2) NOT NULL DEFAULT 0,
    bank_share_percentage           NUMERIC(8,4) NOT NULL DEFAULT 0,
    profit_sharing_ratio_bank       NUMERIC(8,4) NOT NULL DEFAULT 0,
    profit_sharing_ratio_investors  NUMERIC(8,4) NOT NULL DEFAULT 0,
    per_policy_id                   BIGINT,
    irr_policy_id                   BIGINT,
    management_fee_type             VARCHAR(30) CHECK (management_fee_type IN ('PERCENTAGE_OF_POOL','PERCENTAGE_OF_PROFIT','FIXED_AMOUNT','WAKALAH_FEE')),
    management_fee_rate             NUMERIC(18,6) NOT NULL DEFAULT 0,
    status                          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                        CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED','WINDING_DOWN')),
    inception_date                  DATE NOT NULL,
    maturity_date                   DATE,
    fatwa_id                        BIGINT REFERENCES fatwa_record(id),
    gl_asset_account_code           VARCHAR(20) REFERENCES chart_of_accounts(gl_code),
    gl_liability_account_code       VARCHAR(20) REFERENCES chart_of_accounts(gl_code),
    gl_profit_account_code          VARCHAR(20) REFERENCES chart_of_accounts(gl_code),
    gl_per_account_code             VARCHAR(20) REFERENCES chart_of_accounts(gl_code),
    gl_irr_account_code             VARCHAR(20) REFERENCES chart_of_accounts(gl_code),
    tenant_id                       BIGINT REFERENCES tenant(id),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_investment_pool_code_tenant
    ON investment_pool (LOWER(pool_code), COALESCE(tenant_id, -1));
CREATE INDEX IF NOT EXISTS idx_investment_pool_type_status
    ON investment_pool (pool_type, status);
CREATE INDEX IF NOT EXISTS idx_investment_pool_currency
    ON investment_pool (currency_code);

ALTER TABLE chart_of_accounts
    ADD CONSTRAINT fk_chart_of_accounts_investment_pool
    FOREIGN KEY (investment_pool_id) REFERENCES investment_pool(id);

CREATE TABLE IF NOT EXISTS investment_pool_participant (
    id                              BIGSERIAL PRIMARY KEY,
    pool_id                         BIGINT NOT NULL REFERENCES investment_pool(id) ON DELETE CASCADE,
    account_id                      BIGINT NOT NULL REFERENCES account(id),
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    participation_date              DATE NOT NULL,
    participation_balance           NUMERIC(18,2) NOT NULL DEFAULT 0,
    participation_weight            NUMERIC(18,8) NOT NULL DEFAULT 0,
    profit_distribution_method      VARCHAR(30) NOT NULL
                                        CHECK (profit_distribution_method IN ('DAILY_PRODUCT','MONTHLY_AVERAGE','MINIMUM_BALANCE')),
    last_profit_distribution_date   DATE,
    cumulative_profit_distributed   NUMERIC(18,2) NOT NULL DEFAULT 0,
    status                          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                        CHECK (status IN ('ACTIVE','SUSPENDED','WITHDRAWN')),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                         BIGINT NOT NULL DEFAULT 0,
    UNIQUE (pool_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_investment_pool_participant_pool_status
    ON investment_pool_participant (pool_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_pool_participant_customer
    ON investment_pool_participant (customer_id);

-- ---------------------------------------------------------------------------
-- PER / IRR policies and transactions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS per_policy (
    id                                  BIGSERIAL PRIMARY KEY,
    policy_code                         VARCHAR(40) NOT NULL UNIQUE,
    name                                VARCHAR(200) NOT NULL,
    name_ar                             VARCHAR(200),
    investment_pool_id                  BIGINT NOT NULL REFERENCES investment_pool(id),
    retention_rate                      NUMERIC(8,4) NOT NULL DEFAULT 0,
    maximum_retention_rate              NUMERIC(8,4) NOT NULL DEFAULT 0,
    release_threshold                   NUMERIC(8,4),
    target_distribution_rate            NUMERIC(8,4) NOT NULL DEFAULT 0,
    maximum_reserve_balance             NUMERIC(18,2),
    maximum_reserve_percent_of_pool     NUMERIC(8,4),
    retention_from_bank_share           BOOLEAN NOT NULL DEFAULT FALSE,
    retention_allocation                VARCHAR(30) NOT NULL
                                            CHECK (retention_allocation IN ('FROM_GROSS_BEFORE_SPLIT','FROM_BANK_SHARE_ONLY','FROM_BOTH_PROPORTIONAL')),
    approval_required                   BOOLEAN NOT NULL DEFAULT FALSE,
    fatwa_id                            BIGINT REFERENCES fatwa_record(id),
    ssb_review_date                     DATE,
    next_ssb_review_date                DATE,
    status                              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                            CHECK (status IN ('ACTIVE','SUSPENDED','UNDER_REVIEW')),
    effective_from                      DATE NOT NULL,
    effective_to                        DATE,
    tenant_id                           BIGINT REFERENCES tenant(id),
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                             BIGINT NOT NULL DEFAULT 0,
    UNIQUE (investment_pool_id)
);

CREATE INDEX IF NOT EXISTS idx_per_policy_investment_pool
    ON per_policy (investment_pool_id);
CREATE INDEX IF NOT EXISTS idx_per_policy_status
    ON per_policy (status);

CREATE TABLE IF NOT EXISTS per_transaction (
    id                              BIGSERIAL PRIMARY KEY,
    policy_id                        BIGINT NOT NULL REFERENCES per_policy(id) ON DELETE CASCADE,
    pool_id                          BIGINT NOT NULL REFERENCES investment_pool(id),
    transaction_type                 VARCHAR(25) NOT NULL CHECK (transaction_type IN ('RETENTION','RELEASE','ADJUSTMENT','WRITE_OFF')),
    amount                           NUMERIC(18,2) NOT NULL,
    balance_before                   NUMERIC(18,2) NOT NULL,
    balance_after                    NUMERIC(18,2) NOT NULL,
    period_from                      DATE,
    period_to                        DATE,
    gross_profit_for_period          NUMERIC(18,2),
    actual_profit_rate               NUMERIC(8,4),
    distributed_profit_rate          NUMERIC(8,4),
    journal_ref                      VARCHAR(30),
    narration                        TEXT,
    approved_by                      VARCHAR(100),
    processed_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_by                     VARCHAR(100) NOT NULL,
    version                          BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_per_transaction_policy_processed_at
    ON per_transaction (policy_id, processed_at);
CREATE INDEX IF NOT EXISTS idx_per_transaction_pool_period
    ON per_transaction (pool_id, period_from, period_to);

CREATE TABLE IF NOT EXISTS irr_policy (
    id                                  BIGSERIAL PRIMARY KEY,
    policy_code                         VARCHAR(40) NOT NULL UNIQUE,
    name                                VARCHAR(200) NOT NULL,
    name_ar                             VARCHAR(200),
    investment_pool_id                  BIGINT NOT NULL REFERENCES investment_pool(id),
    retention_rate                      NUMERIC(8,4) NOT NULL DEFAULT 0,
    maximum_retention_rate              NUMERIC(8,4) NOT NULL DEFAULT 0,
    maximum_reserve_balance             NUMERIC(18,2),
    maximum_reserve_percent_of_pool     NUMERIC(8,4),
    trigger_threshold                   NUMERIC(8,4),
    retention_allocation                VARCHAR(30) NOT NULL
                                            CHECK (retention_allocation IN ('FROM_INVESTOR_SHARE_ONLY','FROM_GROSS_BEFORE_SPLIT','FROM_BOTH_PROPORTIONAL')),
    approval_required                   BOOLEAN NOT NULL DEFAULT FALSE,
    fatwa_id                            BIGINT REFERENCES fatwa_record(id),
    ssb_review_date                     DATE,
    next_ssb_review_date                DATE,
    status                              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                            CHECK (status IN ('ACTIVE','SUSPENDED','UNDER_REVIEW')),
    effective_from                      DATE NOT NULL,
    effective_to                        DATE,
    tenant_id                           BIGINT REFERENCES tenant(id),
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                             BIGINT NOT NULL DEFAULT 0,
    UNIQUE (investment_pool_id)
);

CREATE INDEX IF NOT EXISTS idx_irr_policy_investment_pool
    ON irr_policy (investment_pool_id);
CREATE INDEX IF NOT EXISTS idx_irr_policy_status
    ON irr_policy (status);

CREATE TABLE IF NOT EXISTS irr_transaction (
    id                              BIGSERIAL PRIMARY KEY,
    policy_id                        BIGINT NOT NULL REFERENCES irr_policy(id) ON DELETE CASCADE,
    pool_id                          BIGINT NOT NULL REFERENCES investment_pool(id),
    transaction_type                 VARCHAR(30) NOT NULL
                                        CHECK (transaction_type IN ('RETENTION','RELEASE_LOSS_ABSORPTION','RELEASE_POOL_CLOSURE','ADJUSTMENT','WRITE_OFF')),
    amount                           NUMERIC(18,2) NOT NULL,
    balance_before                   NUMERIC(18,2) NOT NULL,
    balance_after                    NUMERIC(18,2) NOT NULL,
    period_from                      DATE,
    period_to                        DATE,
    trigger_event                    VARCHAR(200),
    loss_amount                      NUMERIC(18,2),
    loss_absorbed                    NUMERIC(18,2),
    remaining_loss                   NUMERIC(18,2),
    journal_ref                      VARCHAR(30),
    narration                        TEXT,
    approved_by                      VARCHAR(100),
    processed_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_by                     VARCHAR(100) NOT NULL,
    version                          BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_irr_transaction_policy_processed_at
    ON irr_transaction (policy_id, processed_at);
CREATE INDEX IF NOT EXISTS idx_irr_transaction_pool_period
    ON irr_transaction (pool_id, period_from, period_to);

-- ---------------------------------------------------------------------------
-- Islamic posting rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_posting_rule (
    id                              BIGSERIAL PRIMARY KEY,
    rule_code                       VARCHAR(40) NOT NULL UNIQUE,
    name                            VARCHAR(200) NOT NULL,
    name_ar                         VARCHAR(200),
    contract_type_code              VARCHAR(30) NOT NULL,
    transaction_type                VARCHAR(40) NOT NULL,
    description                     TEXT,
    description_ar                  TEXT,
    entries                         JSONB NOT NULL DEFAULT '[]'::jsonb,
    condition_expression            TEXT,
    priority                        INT NOT NULL DEFAULT 100,
    enabled                         BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from                  DATE NOT NULL,
    effective_to                    DATE,
    aaoifi_reference                VARCHAR(120),
    approved_by                     VARCHAR(100),
    approved_at                     TIMESTAMPTZ,
    rule_version                    INT NOT NULL DEFAULT 1,
    tenant_id                       BIGINT REFERENCES tenant(id),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_posting_rule_contract_txn
    ON islamic_posting_rule (contract_type_code, transaction_type);
CREATE INDEX IF NOT EXISTS idx_islamic_posting_rule_enabled_effective
    ON islamic_posting_rule (enabled, effective_from);

-- ---------------------------------------------------------------------------
-- Seed AAOIFI chart of accounts
-- ---------------------------------------------------------------------------

INSERT INTO chart_of_accounts (
    gl_code, gl_name, gl_category, level_number, is_header, is_postable,
    is_multi_currency, is_inter_branch, normal_balance, allow_manual_posting, requires_cost_centre, is_active,
    islamic_account_category, contract_type_code, shariah_classification, is_islamic_account,
    aaoifi_reference, aaoifi_line_item, profit_distribution_eligible, zakat_applicable,
    contra_account_code, is_reserve_account, reserve_type, created_by, created_at, updated_at
) VALUES
    ('1100-000-001', 'Cash and Bank Balances (Islamic Operations)', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'CASH_AND_EQUIVALENTS', NULL, 'HALAL', TRUE, 'FAS 1', 'Cash and equivalents', FALSE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-MRB-001', 'Murabaha Financing Receivable', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'FINANCING_RECEIVABLE_MURABAHA', 'MURABAHA', 'HALAL', TRUE, 'FAS 1', 'Murabaha financing receivable', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-MRB-002', 'Murabaha Deferred Profit (contra — unearned markup)', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'FINANCING_RECEIVABLE_MURABAHA', 'MURABAHA', 'HALAL', TRUE, 'FAS 28', 'Murabaha deferred profit', FALSE, FALSE, '1200-MRB-001', FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-IJR-001', 'Ijarah Financing Receivable', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'FINANCING_RECEIVABLE_IJARAH', 'IJARAH', 'HALAL', TRUE, 'FAS 1', 'Ijarah financing receivable', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-MSH-001', 'Musharakah Financing Receivable', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'FINANCING_RECEIVABLE_MUSHARAKAH', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 1', 'Musharakah financing receivable', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-MDR-001', 'Mudarabah Financing Receivable', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'FINANCING_RECEIVABLE_MUDARABAH', 'MUDARABAH', 'HALAL', TRUE, 'FAS 1', 'Mudarabah financing receivable', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-SLM-001', 'Salam Receivable', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'FINANCING_RECEIVABLE_SALAM', 'SALAM', 'HALAL', TRUE, 'FAS 1', 'Salam receivable', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-IST-001', 'Istisna''a Work-in-Progress', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'FINANCING_RECEIVABLE_ISTISNA', 'ISTISNA', 'HALAL', TRUE, 'FAS 1', 'Istisna work in progress', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1300-SKK-001', 'Investment in Sukuk', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'INVESTMENT_IN_SUKUK', 'SUKUK', 'HALAL', TRUE, 'FAS 1', 'Investment in Sukuk', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1300-EQT-001', 'Investment in Shariah-Compliant Equity', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'INVESTMENT_IN_EQUITY', NULL, 'HALAL', TRUE, 'FAS 1', 'Investment in equity', FALSE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1400-IJR-001', 'Ijarah Assets — Gross', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'IJARAH_ASSETS', 'IJARAH', 'HALAL', TRUE, 'FAS 1', 'Ijarah assets gross', FALSE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1400-IJR-002', 'Ijarah Assets — Accumulated Depreciation (contra)', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'IJARAH_ASSETS', 'IJARAH', 'HALAL', TRUE, 'FAS 1', 'Ijarah assets accumulated depreciation', FALSE, FALSE, '1400-IJR-001', FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1500-MSH-001', 'Musharakah Investment (Bank''s Capital Contribution)', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'MUSHARAKAH_INVESTMENT', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 1', 'Musharakah investments', FALSE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1500-MDR-001', 'Mudarabah Investment (Bank as Rab-ul-Maal)', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'MUDARABAH_INVESTMENT', 'MUDARABAH', 'HALAL', TRUE, 'FAS 1', 'Mudarabah investments', FALSE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1600-000-001', 'Profit Receivable — Financing', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'OTHER_ISLAMIC_ASSETS', NULL, 'HALAL', TRUE, 'FAS 1', 'Other Islamic assets', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1600-000-002', 'Profit Receivable — Investments', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'OTHER_ISLAMIC_ASSETS', NULL, 'HALAL', TRUE, 'FAS 1', 'Other Islamic assets', TRUE, TRUE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1700-000-001', 'Impairment Provision — Financing (contra)', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'OTHER_ISLAMIC_ASSETS', NULL, 'HALAL', TRUE, 'FAS 1', 'Financing impairment provision', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('2100-WAD-001', 'Current Accounts — Wadiah Yad Dhamanah', 'LIABILITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'CURRENT_ACCOUNT_WADIAH', 'WADIAH', 'HALAL', TRUE, 'FAS 1', 'Current accounts wadiah', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('2100-QRD-001', 'Current Accounts — Qard Hasan', 'LIABILITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'CURRENT_ACCOUNT_QARD', 'QARD', 'HALAL', TRUE, 'FAS 1', 'Current accounts qard', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('2200-000-001', 'Zakat Payable', 'LIABILITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'ZAKAT_PAYABLE', NULL, 'NOT_APPLICABLE', TRUE, 'FAS 9', 'Zakat payable', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('2300-000-001', 'Charity Fund (Late Payment Penalties)', 'LIABILITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'CHARITY_FUND', NULL, 'NOT_APPLICABLE', TRUE, 'FAS 1', 'Charity fund', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('2400-000-001', 'Other Islamic Liabilities', 'LIABILITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'OTHER_ISLAMIC_LIABILITIES', NULL, 'HALAL', TRUE, 'FAS 1', 'Other Islamic liabilities', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('3100-MDR-001', 'Unrestricted Investment Accounts — Mudarabah', 'EQUITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'UNRESTRICTED_INVESTMENT_ACCOUNT', 'MUDARABAH', 'HALAL', TRUE, 'FAS 1', 'Unrestricted investment accounts', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('3200-000-001', 'Profit Equalisation Reserve (PER)', 'EQUITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'PROFIT_EQUALISATION_RESERVE', NULL, 'HALAL', TRUE, 'FAS 11', 'Profit equalisation reserve', FALSE, FALSE, NULL, TRUE, 'PER', 'SYSTEM', NOW(), NOW()),
    ('3300-000-001', 'Investment Risk Reserve (IRR)', 'EQUITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'INVESTMENT_RISK_RESERVE', NULL, 'HALAL', TRUE, 'FAS 11', 'Investment risk reserve', FALSE, FALSE, NULL, TRUE, 'IRR', 'SYSTEM', NOW(), NOW()),
    ('3500-MDR-001', 'Restricted Investment Pool — Assets', 'CONTINGENT', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'RESTRICTED_INVESTMENT_POOL_ASSET', 'MUDARABAH', 'HALAL', TRUE, 'FAS 1', 'Restricted investment pool assets', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('3500-MDR-002', 'Restricted Investment Pool — Obligations to Investors', 'CONTINGENT', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'RESTRICTED_INVESTMENT_POOL_LIABILITY', 'MUDARABAH', 'HALAL', TRUE, 'FAS 1', 'Restricted investment pool liabilities', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('4100-000-001', 'Paid-up Capital (Islamic Operations)', 'EQUITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'OWNERS_EQUITY', NULL, 'HALAL', TRUE, 'FAS 1', 'Paid-up capital', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('4200-000-001', 'Statutory Reserve (Islamic)', 'EQUITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'OWNERS_EQUITY', NULL, 'HALAL', TRUE, 'FAS 1', 'Statutory reserve', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('4300-000-001', 'Retained Earnings (Islamic)', 'EQUITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'RETAINED_EARNINGS_ISLAMIC', NULL, 'HALAL', TRUE, 'FAS 1', 'Retained earnings', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('4400-000-001', 'Fair Value Reserve (Islamic Investments)', 'EQUITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'FAIR_VALUE_RESERVE_ISLAMIC', NULL, 'HALAL', TRUE, 'FAS 1', 'Fair value reserve', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5100-MRB-001', 'Murabaha Profit Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'MURABAHA_INCOME', 'MURABAHA', 'HALAL', TRUE, 'FAS 1', 'Murabaha income', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5100-IJR-001', 'Ijarah Rental Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'IJARAH_INCOME', 'IJARAH', 'HALAL', TRUE, 'FAS 1', 'Ijarah income', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5100-MSH-001', 'Musharakah Profit Income (Bank''s Share)', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'MUSHARAKAH_INCOME', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 1', 'Musharakah income', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5100-MDR-001', 'Mudarabah Profit Income (Mudarib''s Share)', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'MUDARABAH_INCOME', 'MUDARABAH', 'HALAL', TRUE, 'FAS 1', 'Mudarabah income', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5100-IST-001', 'Istisna''a Profit Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'ISTISNA_INCOME', 'ISTISNA', 'HALAL', TRUE, 'FAS 1', 'Istisna income', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5100-SLM-001', 'Salam Profit Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'SALAM_INCOME', 'SALAM', 'HALAL', TRUE, 'FAS 1', 'Salam income', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5200-SKK-001', 'Sukuk Returns', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'SUKUK_INCOME', 'SUKUK', 'HALAL', TRUE, 'FAS 1', 'Sukuk income', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5300-WKL-001', 'Wakalah Fee Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'WAKALAH_FEE_INCOME', 'WAKALAH', 'HALAL', TRUE, 'FAS 1', 'Wakalah fee income', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5400-TKF-001', 'Takaful Operator Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'TAKAFUL_INCOME', 'TAKAFUL', 'HALAL', TRUE, 'FAS 1', 'Takaful income', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5500-000-001', 'FX Income (Islamic Operations)', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'FX_INCOME_ISLAMIC', NULL, 'PURIFICATION_REQUIRED', TRUE, 'FAS 1', 'FX income', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5600-000-001', 'Other Islamic Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'OTHER_ISLAMIC_INCOME', NULL, 'UNDER_REVIEW', TRUE, 'FAS 1', 'Other Islamic income', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6100-000-001', 'Investment Account Holders'' Share of Profit', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'DEPOSITOR_PROFIT_DISTRIBUTION', NULL, 'HALAL', TRUE, 'FAS 1', 'Depositor profit distribution', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6200-IJR-001', 'Ijarah Asset Depreciation', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'IJARAH_DEPRECIATION', 'IJARAH', 'HALAL', TRUE, 'FAS 1', 'Ijarah depreciation', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6300-000-001', 'Financing Impairment Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'FINANCING_IMPAIRMENT', NULL, 'HALAL', TRUE, 'FAS 30', 'Financing impairment expense', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6400-TKF-001', 'Takaful Claims Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'TAKAFUL_CLAIMS', 'TAKAFUL', 'HALAL', TRUE, 'FAS 1', 'Takaful claims', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6500-000-001', 'Zakat Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'ZAKAT_EXPENSE', NULL, 'NOT_APPLICABLE', TRUE, 'FAS 9', 'Zakat expense', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6600-000-001', 'Charity Fund Distributions', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'CHARITY_DISTRIBUTION', NULL, 'NOT_APPLICABLE', TRUE, 'FAS 1', 'Charity distributions', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6700-000-001', 'Other Islamic Expenses', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'OTHER_ISLAMIC_EXPENSE', NULL, 'HALAL', TRUE, 'FAS 1', 'Other Islamic expenses', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('9100-000-001', 'Kafalah Commitments (Guarantees Issued)', 'CONTINGENT', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'GUARANTEES_KAFALAH', NULL, 'HALAL', TRUE, 'FAS 1', 'Guarantees kafalah', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('9200-000-001', 'Undrawn Financing Commitments (Islamic)', 'CONTINGENT', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'COMMITMENTS_ISLAMIC', NULL, 'HALAL', TRUE, 'FAS 1', 'Islamic commitments', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW())
ON CONFLICT (gl_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed Islamic posting rules
-- ---------------------------------------------------------------------------

INSERT INTO islamic_posting_rule (
    rule_code, name, contract_type_code, transaction_type, description, entries,
    priority, enabled, effective_from, aaoifi_reference, approved_by, approved_at, rule_version, created_at, updated_at
) VALUES
    ('MRB-DISB-001', 'Murabaha Disbursement', 'MURABAHA', 'FINANCING_DISBURSEMENT', 'Murabaha disbursement into receivable with deferred profit',
        '[{"entryType":"DEBIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"FINANCING_RECEIVABLE_MURABAHA","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha disbursement {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"PRINCIPAL","narrationTemplate":"Murabaha cash settlement {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1200-MRB-002","amountExpression":"MARKUP","narrationTemplate":"Murabaha deferred profit {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 28, Para 7', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MRB-REPAY-001', 'Murabaha Repayment', 'MURABAHA', 'FINANCING_REPAYMENT', 'Murabaha repayment and profit recognition',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha repayment cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"FINANCING_RECEIVABLE_MURABAHA","amountExpression":"PRINCIPAL","narrationTemplate":"Murabaha receivable principal {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1200-MRB-002","amountExpression":"PROFIT","narrationTemplate":"Murabaha deferred profit reversal {{reference}}"},{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1200-MRB-002","amountExpression":"PROFIT","narrationTemplate":"Murabaha deferred profit release {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"MURABAHA_INCOME","amountExpression":"PROFIT","narrationTemplate":"Murabaha income recognition {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MRB-LATE-001', 'Murabaha Late Payment Penalty', 'MURABAHA', 'LATE_PAYMENT_PENALTY', 'Late payment penalty booked to charity fund',
        '[{"entryType":"DEBIT","accountResolution":"BY_PARAMETER","accountParameter":"customerAccountGlCode","amountExpression":"PENALTY","narrationTemplate":"Late payment receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"2300-000-001","amountExpression":"PENALTY","narrationTemplate":"Late payment penalty to charity {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'Shariah late fee charity rule', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IJR-ACQ-001', 'Ijarah Asset Acquisition', 'IJARAH', 'ASSET_ACQUISITION', 'Acquire Ijarah asset',
        '[{"entryType":"DEBIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"IJARAH_ASSETS","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah asset acquisition {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah cash settlement {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IJR-RENT-001', 'Ijarah Rental Income', 'IJARAH', 'RENTAL_PAYMENT', 'Recognise Ijarah rental',
        '[{"entryType":"DEBIT","accountResolution":"BY_PARAMETER","accountParameter":"customerAccountGlCode","amountExpression":"RENTAL","narrationTemplate":"Ijarah rental receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"IJARAH_INCOME","amountExpression":"RENTAL","narrationTemplate":"Ijarah rental income {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IJR-DEPR-001', 'Ijarah Asset Depreciation', 'IJARAH', 'ASSET_DEPRECIATION', 'Depreciate Ijarah asset',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6200-IJR-001","amountExpression":"DEPRECIATION","narrationTemplate":"Ijarah depreciation {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-002","amountExpression":"DEPRECIATION","narrationTemplate":"Ijarah accumulated depreciation {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IJR-TRFR-001', 'Ijarah Asset Transfer to Customer', 'IJARAH', 'ASSET_TRANSFER', 'Transfer Ijarah asset to customer at term end',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-002","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah accumulated depreciation release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah asset transfer {{reference}}"}]'::jsonb,
        90, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MDR-DEP-001', 'Mudarabah Investment Deposit', 'MUDARABAH', 'INVESTMENT_POOL_ENTRY', 'Customer deposit into unrestricted investment pool',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarabah pool deposit cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"3100-MDR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarabah investment liability {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MDR-EXT-001', 'Mudarabah Investment Withdrawal', 'MUDARABAH', 'INVESTMENT_POOL_EXIT', 'Customer withdrawal from unrestricted investment pool',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"3100-MDR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarabah withdrawal liability {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarabah cash withdrawal {{reference}}"}]'::jsonb,
        95, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MDR-DIST-001', 'Profit Distribution to IAH', 'MUDARABAH', 'PROFIT_DISTRIBUTION', 'Profit distribution to investment account holders',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"IAH profit distribution expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_PARAMETER","accountParameter":"customerInvestmentAccountGlCode","amountExpression":"FULL_AMOUNT","narrationTemplate":"IAH customer credit {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 11', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('PER-RET-001', 'PER Retention', 'ALL', 'PER_RETENTION', 'Retention to PER reserve',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"PER retention expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_POOL","accountCategory":"PROFIT_EQUALISATION_RESERVE","amountExpression":"FULL_AMOUNT","narrationTemplate":"PER reserve funding {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 11', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('PER-REL-001', 'PER Release', 'ALL', 'PER_RELEASE', 'Release from PER reserve',
        '[{"entryType":"DEBIT","accountResolution":"BY_POOL","accountCategory":"PROFIT_EQUALISATION_RESERVE","amountExpression":"FULL_AMOUNT","narrationTemplate":"PER reserve release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"PER expense reversal {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 11', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IRR-RET-001', 'IRR Retention', 'ALL', 'IRR_RETENTION', 'Retention to IRR reserve',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"IRR retention expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_POOL","accountCategory":"INVESTMENT_RISK_RESERVE","amountExpression":"FULL_AMOUNT","narrationTemplate":"IRR reserve funding {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 11', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IRR-REL-001', 'IRR Release for Loss Absorption', 'ALL', 'IRR_RELEASE', 'Release IRR to absorb financing losses',
        '[{"entryType":"DEBIT","accountResolution":"BY_POOL","accountCategory":"INVESTMENT_RISK_RESERVE","amountExpression":"FULL_AMOUNT","narrationTemplate":"IRR reserve release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6300-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"IRR loss absorption offset {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 11', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IRR-CLS-001', 'IRR Release on Pool Closure', 'ALL', 'POOL_CLOSURE_RELEASE', 'Release IRR back on pool closure',
        '[{"entryType":"DEBIT","accountResolution":"BY_POOL","accountCategory":"INVESTMENT_RISK_RESERVE","amountExpression":"FULL_AMOUNT","narrationTemplate":"IRR reserve closure release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"IRR closure distribution {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 11', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MSH-CONT-001', 'Musharakah Capital Contribution', 'MUSHARAKAH', 'FINANCING_DISBURSEMENT', 'Bank capital contribution into Musharakah',
        '[{"entryType":"DEBIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"MUSHARAKAH_INVESTMENT","amountExpression":"FULL_AMOUNT","narrationTemplate":"Musharakah capital contribution {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Musharakah cash funding {{reference}}"}]'::jsonb,
        90, TRUE, DATE '2024-01-01', 'FAS 4', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MSH-DIM-001', 'Diminishing Musharakah Unit Transfer', 'MUSHARAKAH', 'OWNERSHIP_TRANSFER', 'Periodic ownership unit transfer in diminishing Musharakah',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Musharakah unit sale cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"MUSHARAKAH_INVESTMENT","amountExpression":"PRINCIPAL","narrationTemplate":"Musharakah investment reduction {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"MUSHARAKAH_INCOME","amountExpression":"PROFIT","narrationTemplate":"Musharakah unit transfer gain {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 4', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('ZKT-PROV-001', 'Zakat Provision', 'ALL', 'ZAKAT_PROVISION', 'Provide for Zakat',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6500-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Zakat expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"2200-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Zakat payable {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 9', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('CHR-DIST-001', 'Charity Fund Distribution', 'ALL', 'CHARITY_DISTRIBUTION', 'Disburse charity fund balance',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"2300-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Charity fund distribution {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Cash paid to charity {{reference}}"}]'::jsonb,
        100, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('SLM-DISB-001', 'Salam Disbursement', 'SALAM', 'FINANCING_DISBURSEMENT', 'Salam disbursement posting',
        '[{"entryType":"DEBIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"FINANCING_RECEIVABLE_SALAM","amountExpression":"FULL_AMOUNT","narrationTemplate":"Salam receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Salam cash settlement {{reference}}"}]'::jsonb,
        80, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('IST-DISB-001', 'Istisna Disbursement', 'ISTISNA', 'FINANCING_DISBURSEMENT', 'Istisna work-in-progress posting',
        '[{"entryType":"DEBIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"FINANCING_RECEIVABLE_ISTISNA","amountExpression":"FULL_AMOUNT","narrationTemplate":"Istisna work in progress {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Istisna cash settlement {{reference}}"}]'::jsonb,
        80, TRUE, DATE '2024-01-01', 'FAS 10', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('SKK-INC-001', 'Sukuk Coupon Receipt', 'SUKUK', 'SUKUK_COUPON', 'Recognise Sukuk return receipt',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Sukuk cash receipt {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"SUKUK_INCOME","amountExpression":"FULL_AMOUNT","narrationTemplate":"Sukuk return income {{reference}}"}]'::jsonb,
        80, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('FEE-WKL-001', 'Wakalah Fee Charge', 'WAKALAH', 'FEE_CHARGE', 'Recognise Wakalah fee',
        '[{"entryType":"DEBIT","accountResolution":"BY_PARAMETER","accountParameter":"customerAccountGlCode","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wakalah fee receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"WAKALAH_FEE_INCOME","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wakalah fee income {{reference}}"}]'::jsonb,
        70, TRUE, DATE '2024-01-01', 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MDR-ALLOC-001', 'Mudarabah Profit Sharing Allocation', 'MUDARABAH', 'PROFIT_SHARING_ALLOCATION', 'Allocate mudarabah profit share',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarabah profit allocation expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"3100-MDR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Mudarabah pool allocation {{reference}}"}]'::jsonb,
        70, TRUE, DATE '2024-01-01', 'FAS 11', 'SYSTEM', NOW(), 1, NOW(), NOW())
ON CONFLICT (rule_code) DO NOTHING;
