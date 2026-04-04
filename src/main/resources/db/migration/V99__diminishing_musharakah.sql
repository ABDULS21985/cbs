SET search_path TO cbs;

-- ============================================================================
-- V99: Diminishing Musharakah financing, unit tracking, diminishing rentals,
--      buyout schedules, and ST-005 loss allocation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS musharakah_applications (
    id                              BIGSERIAL PRIMARY KEY,
    application_ref                 VARCHAR(50) NOT NULL UNIQUE,
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    product_code                    VARCHAR(30) NOT NULL,
    musharakah_type                 VARCHAR(40) NOT NULL CHECK (musharakah_type IN (
                                        'DIMINISHING_MUSHARAKAH','CONSTANT_MUSHARAKAH','MUDARABAH_MUSHARAKAH')),
    requested_financing_amount      NUMERIC(18,2) NOT NULL,
    customer_equity_amount          NUMERIC(18,2) NOT NULL,
    total_property_value            NUMERIC(18,2) NOT NULL,
    currency_code                   VARCHAR(3) NOT NULL,
    requested_tenor_months          INT NOT NULL,
    asset_description               TEXT NOT NULL,
    asset_category                  VARCHAR(40) NOT NULL CHECK (asset_category IN (
                                        'RESIDENTIAL_PROPERTY','COMMERCIAL_PROPERTY','LAND',
                                        'VEHICLE','EQUIPMENT','BUSINESS_VENTURE','OTHER')),
    asset_address                   TEXT,
    estimated_asset_value           NUMERIC(18,2),
    valuation_reference             VARCHAR(120),
    monthly_income                  NUMERIC(18,2),
    existing_obligations            NUMERIC(18,2),
    estimated_monthly_payment       NUMERIC(18,2),
    dsr                             NUMERIC(10,4),
    credit_score                    INT,
    proposed_bank_contribution      NUMERIC(18,2),
    proposed_customer_contribution  NUMERIC(18,2),
    proposed_bank_percentage        NUMERIC(10,4),
    proposed_customer_percentage    NUMERIC(10,4),
    proposed_rental_rate            NUMERIC(10,4),
    proposed_tenor_months           INT,
    proposed_units_total            INT,
    proposed_profit_sharing_bank    NUMERIC(10,4),
    proposed_profit_sharing_customer NUMERIC(10,4),
    status                          VARCHAR(30) NOT NULL CHECK (status IN (
                                        'DRAFT','SUBMITTED','CREDIT_ASSESSMENT','ASSET_VALUATION',
                                        'PRICING','APPROVED','REJECTED','CANCELLED','CONVERTED')),
    assigned_officer_id             BIGINT,
    branch_id                       BIGINT,
    approved_by                     VARCHAR(100),
    approved_at                     TIMESTAMPTZ,
    rejection_reason                TEXT,
    contract_id                     BIGINT,
    submitted_at                    TIMESTAMPTZ,
    expires_at                      TIMESTAMPTZ,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_musharakah_app_customer_status
    ON musharakah_applications (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_musharakah_app_officer_status
    ON musharakah_applications (assigned_officer_id, status);

CREATE TABLE IF NOT EXISTS musharakah_contracts (
    id                              BIGSERIAL PRIMARY KEY,
    contract_ref                    VARCHAR(50) NOT NULL UNIQUE,
    application_id                  BIGINT NOT NULL REFERENCES musharakah_applications(id),
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    account_id                      BIGINT REFERENCES account(id),
    islamic_product_template_id     BIGINT NOT NULL REFERENCES islamic_product_templates(id),
    product_code                    VARCHAR(30) NOT NULL,
    contract_type_code              VARCHAR(30) NOT NULL DEFAULT 'MUSHARAKAH',
    musharakah_type                 VARCHAR(40) NOT NULL CHECK (musharakah_type IN (
                                        'DIMINISHING_MUSHARAKAH','CONSTANT_MUSHARAKAH','MUDARABAH_MUSHARAKAH')),
    asset_description               TEXT,
    asset_category                  VARCHAR(40) CHECK (asset_category IN (
                                        'RESIDENTIAL_PROPERTY','COMMERCIAL_PROPERTY','LAND',
                                        'VEHICLE','EQUIPMENT','BUSINESS_VENTURE','OTHER')),
    asset_address                   TEXT,
    asset_title_deed_ref            VARCHAR(120),
    asset_purchase_price            NUMERIC(18,2) NOT NULL,
    asset_current_market_value      NUMERIC(18,2),
    asset_last_valuation_date       DATE,
    currency_code                   VARCHAR(3) NOT NULL,
    bank_capital_contribution       NUMERIC(18,2) NOT NULL,
    customer_capital_contribution   NUMERIC(18,2) NOT NULL,
    total_capital                   NUMERIC(18,2) NOT NULL,
    total_ownership_units           INT NOT NULL,
    bank_current_units              NUMERIC(19,4) NOT NULL,
    customer_current_units          NUMERIC(19,4) NOT NULL,
    bank_ownership_percentage       NUMERIC(10,4) NOT NULL,
    customer_ownership_percentage   NUMERIC(10,4) NOT NULL,
    unit_value                      NUMERIC(18,6) NOT NULL,
    unit_pricing_method             VARCHAR(30) NOT NULL CHECK (unit_pricing_method IN (
                                        'FIXED_AT_INCEPTION','PERIODIC_FAIR_VALUE','AGREED_SCHEDULE')),
    profit_sharing_ratio_bank       NUMERIC(10,4) NOT NULL,
    profit_sharing_ratio_customer   NUMERIC(10,4) NOT NULL,
    loss_sharing_method             VARCHAR(30) NOT NULL CHECK (loss_sharing_method IN ('PROPORTIONAL_TO_CAPITAL')),
    rental_frequency                VARCHAR(20) NOT NULL CHECK (rental_frequency IN ('MONTHLY','QUARTERLY')),
    base_rental_rate                NUMERIC(10,4) NOT NULL,
    rental_rate_type                VARCHAR(30) CHECK (rental_rate_type IN ('FIXED','VARIABLE_BENCHMARK','STEPPED')),
    rental_benchmark                VARCHAR(40),
    rental_margin                   NUMERIC(10,4),
    rental_review_frequency         VARCHAR(20) CHECK (rental_review_frequency IN ('NONE','ANNUAL','BI_ANNUAL')),
    next_rental_review_date         DATE,
    total_rental_expected           NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_rental_received           NUMERIC(18,2) NOT NULL DEFAULT 0,
    buyout_frequency                VARCHAR(20) NOT NULL CHECK (buyout_frequency IN ('MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY')),
    units_per_buyout                INT,
    units_per_buyout_decimal        NUMERIC(19,4),
    total_buyout_payments_expected  NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_buyout_payments_received  NUMERIC(18,2) NOT NULL DEFAULT 0,
    tenor_months                    INT NOT NULL,
    start_date                      DATE,
    maturity_date                   DATE,
    first_payment_date              DATE,
    estimated_monthly_payment       NUMERIC(18,2),
    grace_period_days               INT NOT NULL DEFAULT 0,
    late_penalty_to_charity         BOOLEAN NOT NULL DEFAULT TRUE,
    total_late_penalties            NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_charity_donations         NUMERIC(18,2) NOT NULL DEFAULT 0,
    insurance_responsibility        VARCHAR(20) CHECK (insurance_responsibility IN ('PROPORTIONAL','BANK_FULL','CUSTOMER_FULL')),
    major_maintenance_sharing       VARCHAR(40) CHECK (major_maintenance_sharing IN ('PROPORTIONAL_TO_OWNERSHIP','BANK_RESPONSIBILITY')),
    current_insurance_policy_ref    VARCHAR(120),
    current_insurance_expiry        DATE,
    early_buyout_allowed            BOOLEAN NOT NULL DEFAULT TRUE,
    early_buyout_pricing_method     VARCHAR(30) CHECK (early_buyout_pricing_method IN (
                                        'REMAINING_UNITS_AT_FIXED','REMAINING_AT_FAIR_VALUE','NEGOTIATED')),
    early_buyout_date               DATE,
    early_buyout_amount             NUMERIC(18,2),
    status                          VARCHAR(30) NOT NULL CHECK (status IN (
                                        'DRAFT','ASSET_PROCUREMENT','JOINT_OWNERSHIP_REGISTERED',
                                        'PENDING_EXECUTION','ACTIVE','RENTAL_ARREARS','BUYOUT_ARREARS',
                                        'DEFAULTED','FULLY_BOUGHT_OUT','TERMINATED_EARLY','TERMINATED',
                                        'DISSOLVED','CLOSED')),
    executed_at                     TIMESTAMPTZ,
    executed_by                     VARCHAR(100),
    fully_bought_out_at             DATE,
    dissolved_at                    DATE,
    investment_pool_id              BIGINT REFERENCES investment_pool(id),
    pool_asset_assignment_id        BIGINT REFERENCES pool_asset_assignment(id),
    last_screening_ref              VARCHAR(50),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_musharakah_contract_customer_status
    ON musharakah_contracts (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_musharakah_contract_type_status
    ON musharakah_contracts (musharakah_type, status);
CREATE INDEX IF NOT EXISTS idx_musharakah_contract_maturity_status
    ON musharakah_contracts (maturity_date, status);
CREATE INDEX IF NOT EXISTS idx_musharakah_contract_pool
    ON musharakah_contracts (investment_pool_id);

CREATE TABLE IF NOT EXISTS musharakah_ownership_units (
    id                              BIGSERIAL PRIMARY KEY,
    contract_id                     BIGINT NOT NULL UNIQUE REFERENCES musharakah_contracts(id) ON DELETE CASCADE,
    total_units                     INT NOT NULL,
    bank_units                      NUMERIC(19,4) NOT NULL,
    customer_units                  NUMERIC(19,4) NOT NULL,
    bank_percentage                 NUMERIC(10,4) NOT NULL,
    customer_percentage             NUMERIC(10,4) NOT NULL,
    unit_value_at_inception         NUMERIC(18,6) NOT NULL,
    current_unit_value              NUMERIC(18,6) NOT NULL,
    last_unit_value_update_date     DATE,
    bank_share_value                NUMERIC(18,2) NOT NULL,
    customer_share_value            NUMERIC(18,2) NOT NULL,
    last_transfer_date              DATE,
    last_transfer_units             NUMERIC(19,4),
    total_units_transferred         NUMERIC(19,4) NOT NULL DEFAULT 0,
    is_fully_bought_out             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS musharakah_unit_transfers (
    id                              BIGSERIAL PRIMARY KEY,
    contract_id                     BIGINT NOT NULL REFERENCES musharakah_contracts(id) ON DELETE CASCADE,
    ownership_unit_id               BIGINT NOT NULL REFERENCES musharakah_ownership_units(id) ON DELETE CASCADE,
    transfer_number                 INT NOT NULL,
    transfer_date                   DATE NOT NULL,
    transfer_date_hijri             VARCHAR(20),
    units_transferred               NUMERIC(19,4) NOT NULL,
    price_per_unit                  NUMERIC(18,6) NOT NULL,
    total_transfer_price            NUMERIC(18,2) NOT NULL,
    pricing_method                  VARCHAR(20) NOT NULL CHECK (pricing_method IN ('FIXED','FAIR_VALUE','AGREED')),
    bank_units_before               NUMERIC(19,4) NOT NULL,
    bank_units_after                NUMERIC(19,4) NOT NULL,
    customer_units_before           NUMERIC(19,4) NOT NULL,
    customer_units_after            NUMERIC(19,4) NOT NULL,
    bank_percentage_before          NUMERIC(10,4) NOT NULL,
    bank_percentage_after           NUMERIC(10,4) NOT NULL,
    customer_percentage_before      NUMERIC(10,4) NOT NULL,
    customer_percentage_after       NUMERIC(10,4) NOT NULL,
    book_value_of_units_transferred NUMERIC(18,2) NOT NULL,
    gain_on_transfer                NUMERIC(18,2) NOT NULL DEFAULT 0,
    loss_on_transfer                NUMERIC(18,2) NOT NULL DEFAULT 0,
    journal_ref                     VARCHAR(40),
    payment_transaction_ref         VARCHAR(80),
    payment_amount                  NUMERIC(18,2),
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED','DUE','PAID','PARTIAL','OVERDUE','WAIVED','CANCELLED')),
    paid_date                       DATE,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_musharakah_unit_transfer_contract_number
    ON musharakah_unit_transfers (contract_id, transfer_number);
CREATE INDEX IF NOT EXISTS idx_musharakah_unit_transfer_contract_status
    ON musharakah_unit_transfers (contract_id, status);
CREATE INDEX IF NOT EXISTS idx_musharakah_unit_transfer_date
    ON musharakah_unit_transfers (transfer_date);

CREATE TABLE IF NOT EXISTS musharakah_rental_installments (
    id                              BIGSERIAL PRIMARY KEY,
    contract_id                     BIGINT NOT NULL REFERENCES musharakah_contracts(id) ON DELETE CASCADE,
    installment_number              INT NOT NULL,
    due_date                        DATE NOT NULL,
    due_date_hijri                  VARCHAR(20),
    rental_period_from              DATE,
    rental_period_to                DATE,
    bank_ownership_at_period_start  NUMERIC(10,4) NOT NULL,
    bank_share_value_at_period_start NUMERIC(18,2) NOT NULL,
    applicable_rental_rate          NUMERIC(10,4) NOT NULL,
    days_in_period                  INT,
    rental_amount                   NUMERIC(18,2) NOT NULL,
    calculation_method              TEXT,
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED','DUE','PAID','PARTIAL','OVERDUE','WAIVED','CANCELLED')),
    paid_amount                     NUMERIC(18,2) NOT NULL DEFAULT 0,
    paid_date                       DATE,
    transaction_ref                 VARCHAR(80),
    journal_ref                     VARCHAR(40),
    days_overdue                    INT NOT NULL DEFAULT 0,
    late_penalty_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
    late_penalty_charity_journal_ref VARCHAR(40),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(contract_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_musharakah_rental_contract_status
    ON musharakah_rental_installments (contract_id, status);
CREATE INDEX IF NOT EXISTS idx_musharakah_rental_due_status
    ON musharakah_rental_installments (due_date, status);

CREATE TABLE IF NOT EXISTS musharakah_buyout_installments (
    id                              BIGSERIAL PRIMARY KEY,
    contract_id                     BIGINT NOT NULL REFERENCES musharakah_contracts(id) ON DELETE CASCADE,
    installment_number              INT NOT NULL,
    due_date                        DATE NOT NULL,
    due_date_hijri                  VARCHAR(20),
    units_to_transfer               NUMERIC(19,4) NOT NULL,
    price_per_unit                  NUMERIC(18,6) NOT NULL,
    total_buyout_amount             NUMERIC(18,2) NOT NULL,
    cumulative_units_bought         NUMERIC(19,4) NOT NULL,
    bank_units_after_this_installment NUMERIC(19,4) NOT NULL,
    bank_percentage_after           NUMERIC(10,4) NOT NULL,
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED','DUE','PAID','PARTIAL','OVERDUE','WAIVED','CANCELLED')),
    paid_amount                     NUMERIC(18,2) NOT NULL DEFAULT 0,
    paid_date                       DATE,
    actual_units_transferred        NUMERIC(19,4),
    transaction_ref                 VARCHAR(80),
    unit_transfer_id                BIGINT REFERENCES musharakah_unit_transfers(id),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(contract_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_musharakah_buyout_contract_status
    ON musharakah_buyout_installments (contract_id, status);
CREATE INDEX IF NOT EXISTS idx_musharakah_buyout_due_status
    ON musharakah_buyout_installments (due_date, status);

CREATE TABLE IF NOT EXISTS musharakah_loss_events (
    id                              BIGSERIAL PRIMARY KEY,
    contract_id                     BIGINT NOT NULL REFERENCES musharakah_contracts(id) ON DELETE CASCADE,
    loss_event_ref                  VARCHAR(50) NOT NULL UNIQUE,
    loss_date                       DATE NOT NULL,
    loss_type                       VARCHAR(30) NOT NULL CHECK (loss_type IN (
                                        'ASSET_IMPAIRMENT','ASSET_DAMAGE','ASSET_TOTAL_LOSS','MARKET_DECLINE',
                                        'OPERATIONAL_LOSS','FORCED_SALE_LOSS','WRITE_OFF')),
    total_loss_amount               NUMERIC(18,2) NOT NULL,
    currency_code                   VARCHAR(3),
    description                     TEXT,
    cause                           TEXT,
    evidence_reference              VARCHAR(120),
    bank_capital_ratio_at_loss      NUMERIC(10,4),
    customer_capital_ratio_at_loss  NUMERIC(10,4),
    bank_loss_share                 NUMERIC(18,2),
    customer_loss_share             NUMERIC(18,2),
    allocation_method               TEXT,
    verified_by_compliance          BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by                     VARCHAR(100),
    verified_at                     TIMESTAMPTZ,
    bank_loss_journal_ref           VARCHAR(40),
    customer_loss_journal_ref       VARCHAR(40),
    bank_share_value_after_loss     NUMERIC(18,2),
    customer_share_value_after_loss NUMERIC(18,2),
    asset_value_after_loss          NUMERIC(18,2),
    insured                         BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_claim_ref             VARCHAR(120),
    insurance_recovery_expected     NUMERIC(18,2),
    insurance_recovery_received     NUMERIC(18,2),
    net_loss_after_insurance        NUMERIC(18,2),
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('DETECTED','ASSESSED','ALLOCATED','POSTED','DISPUTED','RESOLVED')),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_musharakah_loss_contract
    ON musharakah_loss_events (contract_id);
CREATE INDEX IF NOT EXISTS idx_musharakah_loss_type_status
    ON musharakah_loss_events (loss_type, status);

-- ---------------------------------------------------------------------------
-- Product seeds
-- ---------------------------------------------------------------------------

INSERT INTO product (
    code, name, description, product_category, currency_code, min_opening_balance, min_operating_balance,
    max_balance, allows_overdraft, max_overdraft_limit, allows_cheque_book, allows_debit_card,
    allows_mobile, allows_internet, allows_sweep, dormancy_days, interest_bearing, base_interest_rate,
    interest_calc_method, interest_posting_frequency, interest_accrual_method, monthly_maintenance_fee,
    sms_alert_fee, gl_account_code, gl_interest_expense_code, gl_interest_payable_code, gl_fee_income_code,
    is_active, effective_from, created_by, updated_by
)
VALUES
    ('MSH-HOME-SAR-001', 'Diminishing Musharakah Home Financing', 'Islamic home finance under diminishing Musharakah', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0, 'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0,
        '1500-MSH-001', NULL, NULL, NULL, TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MSH-COMM-SAR-001', 'Commercial Property Musharakah', 'Islamic commercial property Musharakah financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0, 'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0,
        '1500-MSH-001', NULL, NULL, NULL, TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MSH-VEH-SAR-001', 'Vehicle Musharakah Financing', 'Islamic vehicle financing under diminishing Musharakah', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0, 'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0,
        '1500-MSH-001', NULL, NULL, NULL, TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

INSERT INTO product_template (
    template_code, template_name, product_category, interest_config, fee_config, limit_config,
    eligibility_rules, lifecycle_rules, gl_mapping, status, approved_by, approved_at, activated_at,
    template_version, created_by
)
VALUES
    ('MSH-HOME-SAR-001', 'Diminishing Musharakah Home Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED","VALUATION_COMPLETED"]'::jsonb,
        '{"contract":"MUSHARAKAH","jointOwnershipRequired":true,"diminishing":true}'::jsonb,
        '{"financingAssetGl":"1500-MSH-001","profitIncomeGl":"5100-MSH-001","rentalIncomeGl":"5100-MSH-002","charityGl":"2300-000-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('MSH-COMM-SAR-001', 'Commercial Property Musharakah', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED","VALUATION_COMPLETED"]'::jsonb,
        '{"contract":"MUSHARAKAH","jointOwnershipRequired":true,"diminishing":true}'::jsonb,
        '{"financingAssetGl":"1500-MSH-001","profitIncomeGl":"5100-MSH-001","rentalIncomeGl":"5100-MSH-002","charityGl":"2300-000-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('MSH-VEH-SAR-001', 'Vehicle Musharakah Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED","VALUATION_COMPLETED"]'::jsonb,
        '{"contract":"MUSHARAKAH","jointOwnershipRequired":true,"diminishing":true}'::jsonb,
        '{"financingAssetGl":"1500-MSH-001","profitIncomeGl":"5100-MSH-001","rentalIncomeGl":"5100-MSH-002","charityGl":"2300-000-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM')
ON CONFLICT (template_code) DO NOTHING;

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method, profit_rate_type,
    base_rate_reference, margin, bank_share_percentage, customer_share_percentage,
    profit_sharing_ratio_bank, profit_sharing_ratio_customer, loss_sharing_method,
    diminishing_schedule, diminishing_frequency, diminishing_units_total,
    grace_period_days, late_penalty_to_charity, charity_gl_account_code,
    asset_ownership_during_tenor, maintenance_responsibility, insurance_responsibility,
    aaoifi_standard, fatwa_required, shariah_compliance_status, shariah_rule_group_code,
    status, effective_from, product_version, min_amount, max_amount, min_tenor_months, max_tenor_months,
    currencies, eligible_customer_types, eligible_segments, financing_asset_gl, profit_income_gl,
    charity_gl, tenant_id, created_by, updated_by
)
SELECT pt.id, seed.product_code, seed.name, seed.name_ar, seed.description, seed.description_ar,
       ict.id, 'FINANCING', seed.sub_category, 'RENTAL_RATE', 'VARIABLE',
       seed.base_rate_reference, seed.margin, seed.bank_share_percentage, seed.customer_share_percentage,
       seed.profit_ratio_bank, seed.profit_ratio_customer, 'PROPORTIONAL_TO_CAPITAL',
       TRUE, 'MONTHLY', 100,
       5, TRUE, '2300-000-001',
       'JOINT', 'SHARED', 'CUSTOMER',
       'FAS 4/FAS 8', TRUE, 'COMPLIANT', 'MUSHARAKAH_RULES',
       'ACTIVE', CURRENT_DATE, 1, seed.min_amount, seed.max_amount, seed.min_tenor, seed.max_tenor,
       '["SAR"]'::jsonb, seed.customer_types::jsonb, seed.eligible_segments::jsonb, '1500-MSH-001', '5100-MSH-001',
       '2300-000-001', NULL, 'SYSTEM', 'SYSTEM'
FROM product_template pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'musharakah' AND ict.tenant_id IS NULL
JOIN (
    VALUES
        ('MSH-HOME-SAR-001', 'Diminishing Musharakah Home Financing', 'التمويل السكني بالمشاركة المتناقصة',
            'Islamic home finance under diminishing Musharakah', 'تمويل سكني إسلامي بالمشاركة المتناقصة',
            'HOME_FINANCING', 'SAIBOR_6M', 1.7500, 80.0000, 20.0000, 30.0000, 70.0000, 200000::numeric, 5000000::numeric, 60, 300,
            '["INDIVIDUAL"]', '["RETAIL","AFFLUENT","HNW"]'),
        ('MSH-COMM-SAR-001', 'Commercial Property Musharakah', 'مشاركة متناقصة للعقار التجاري',
            'Islamic commercial property Musharakah financing', 'تمويل مشاركة متناقصة للعقار التجاري',
            'COMMERCIAL_PROPERTY', 'SAIBOR_6M', 2.0000, 70.0000, 30.0000, 35.0000, 65.0000, 500000::numeric, 20000000::numeric, 36, 180,
            '["CORPORATE","SME"]', '["SME","CORPORATE"]'),
        ('MSH-VEH-SAR-001', 'Vehicle Musharakah Financing', 'مشاركة متناقصة للمركبات',
            'Islamic vehicle financing under diminishing Musharakah', 'تمويل إسلامي للمركبات بالمشاركة المتناقصة',
            'VEHICLE_FINANCING', 'SAIBOR_6M', 1.5000, 80.0000, 20.0000, 30.0000, 70.0000, 50000::numeric, 500000::numeric, 12, 84,
            '["INDIVIDUAL","SME"]', '["RETAIL","SME"]')
) AS seed(product_code, name, name_ar, description, description_ar, sub_category, base_rate_reference, margin,
          bank_share_percentage, customer_share_percentage, profit_ratio_bank, profit_ratio_customer,
          min_amount, max_amount, min_tenor, max_tenor, customer_types, eligible_segments)
    ON pt.template_code = seed.product_code
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = LOWER(seed.product_code)
);

-- ---------------------------------------------------------------------------
-- GL accounts and posting rules
-- ---------------------------------------------------------------------------

INSERT INTO chart_of_accounts (
    gl_code, gl_name, gl_category, level_number, is_header, is_postable, is_multi_currency, is_inter_branch,
    normal_balance, allow_manual_posting, requires_cost_centre, is_active, islamic_account_category,
    contract_type_code, shariah_classification, is_islamic_account, aaoifi_reference, aaoifi_line_item,
    profit_distribution_eligible, zakat_applicable, contra_account_code, is_reserve_account, reserve_type,
    created_by, updated_at
)
VALUES
    ('5100-MSH-002', 'Musharakah Rental Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'MUSHARAKAH_INCOME', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 4', 'Rental on bank share in Musharakah', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('6270-MSH-001', 'Musharakah Loss — Bank Share', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_EXPENSE', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 4', 'Bank share of Musharakah loss', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('6275-MSH-001', 'Musharakah Loss — Customer Share', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_EXPENSE', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 4', 'Customer share of Musharakah loss', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('1650-MSH-001', 'Insurance Receivable — Musharakah Assets', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_ASSETS', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 4', 'Insurance claim receivable on Musharakah asset', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW())
ON CONFLICT (gl_code) DO NOTHING;

INSERT INTO islamic_posting_rule (
    rule_code, name, contract_type_code, transaction_type, description, entries, condition_expression,
    priority, enabled, effective_from, aaoifi_reference, approved_by, approved_at, rule_version
)
VALUES
    ('MSH-RENT-001', 'Musharakah Rental Income', 'MUSHARAKAH', 'RENTAL_PAYMENT',
        'Rental paid by customer for the bank''s share of the Musharakah asset',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"RENTAL","narrationTemplate":"Musharakah rental cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"5100-MSH-002","amountExpression":"RENTAL","narrationTemplate":"Musharakah rental income {{reference}}"}]'::jsonb,
        NULL,
        180, TRUE, CURRENT_DATE, 'FAS 4', 'SYSTEM', NOW(), 1),
    ('MSH-LOSS-BANK-001', 'Bank''s Share of Musharakah Loss', 'MUSHARAKAH', 'LOSS_ALLOCATION',
        'Reduce bank Musharakah investment for its proportional share of partnership loss',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6270-MSH-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Bank Musharakah loss {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1500-MSH-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Musharakah investment reduction {{reference}}"}]'::jsonb,
        '#lossPhase == ''BANK''',
        200, TRUE, CURRENT_DATE, 'FAS 4', 'SYSTEM', NOW(), 1),
    ('MSH-LOSS-CUST-001', 'Customer''s Share of Musharakah Loss', 'MUSHARAKAH', 'LOSS_ALLOCATION',
        'Recognise customer proportional share of Musharakah loss',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6275-MSH-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Customer Musharakah loss {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1500-MSH-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Customer capital reduction {{reference}}"}]'::jsonb,
        '#lossPhase == ''CUSTOMER''',
        190, TRUE, CURRENT_DATE, 'FAS 4', 'SYSTEM', NOW(), 1),
    ('MSH-SALE-001', 'Musharakah Asset Forced Sale', 'MUSHARAKAH', 'CONTRACT_CANCELLATION',
        'Forced sale settlement for Musharakah asset',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Forced sale proceeds {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1500-MSH-001","amountExpression":"PRINCIPAL","narrationTemplate":"Musharakah investment release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"5100-MSH-001","amountExpression":"PROFIT","narrationTemplate":"Musharakah forced sale gain {{reference}}"}]'::jsonb,
        NULL,
        170, TRUE, CURRENT_DATE, 'FAS 4', 'SYSTEM', NOW(), 1),
    ('MSH-INS-001', 'Insurance Recovery on Musharakah Asset', 'MUSHARAKAH', 'IMPAIRMENT_REVERSAL',
        'Insurance claim receivable for Musharakah asset loss',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1650-MSH-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Musharakah insurance receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6270-MSH-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Musharakah insurance recovery {{reference}}"}]'::jsonb,
        NULL,
        160, TRUE, CURRENT_DATE, 'FAS 4', 'SYSTEM', NOW(), 1)
ON CONFLICT (rule_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Shariah business rules and decision table
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, category, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at,
    tenant_id, created_by, updated_by
)
VALUES
    ('SHARIAH-MSH-001', 'Musharakah losses proportional to capital', 'خسائر المشاركة تكون بنسبة رأس المال',
        'Losses in Musharakah must always follow current capital contribution, not the agreed profit ratio', 'SHARIAH_COMPLIANCE',
        'MUSHARAKAH_LOSS', 'CONSTRAINT', 'BLOCKING', '#lossAllocation.bankShare / #lossAmount == #bankCapitalRatio / 100', '{}'::jsonb,
        'ST-005 violation: Musharakah losses must be proportional to capital contribution, not profit ratio', '["MUSHARAKAH"]'::jsonb,
        '["musharakah","loss"]'::jsonb, CURRENT_DATE, 'ACTIVE', 10, 'ST-005', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-MSH-002', 'Profit ratio can differ from capital ratio', 'نسبة الربح قد تختلف عن نسبة رأس المال',
        'Profit sharing ratio may differ from capital contribution ratio in Musharakah', 'SHARIAH_COMPLIANCE',
        'MUSHARAKAH_PROFIT_RATIO', 'VALIDATION', 'INFORMATIONAL', '#profitRatioBank + #profitRatioCustomer == 100', '{}'::jsonb,
        'Profit sharing ratios must still sum to 100.00', '["MUSHARAKAH"]'::jsonb,
        '["musharakah","pricing"]'::jsonb, CURRENT_DATE, 'ACTIVE', 20, 'ST-005', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-MSH-003', 'Both partners must share in asset risk', 'يجب أن يشترك الطرفان في مخاطر الأصل',
        'The bank cannot shift all asset risk to the customer in Musharakah', 'SHARIAH_COMPLIANCE',
        'MUSHARAKAH_RISK_SHARING', 'VALIDATION', 'WARNING', '#bankOwnership > 0 and #customerOwnership > 0', '{}'::jsonb,
        'Both partners must retain genuine ownership risk throughout Musharakah', '["MUSHARAKAH"]'::jsonb,
        '["musharakah","contract"]'::jsonb, CURRENT_DATE, 'ACTIVE', 30, 'ST-005', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-MSH-004', 'Rental only on bank''s share', 'الأجرة تكون على حصة البنك فقط',
        'Customer may only pay rent for using the bank''s remaining share of the asset', 'SHARIAH_COMPLIANCE',
        'MUSHARAKAH_RENTAL', 'CONSTRAINT', 'BLOCKING', '#rental.bankShareValue > 0 and #rental.customerShareValue == null', '{}'::jsonb,
        'Rental may only be calculated on the bank''s current share in the Musharakah asset', '["MUSHARAKAH"]'::jsonb,
        '["musharakah","rentals"]'::jsonb, CURRENT_DATE, 'ACTIVE', 40, 'ST-005', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-MSH-005', 'Unit buyout is genuine sale', 'شراء الحصص يجب أن يكون بيعاً حقيقياً',
        'Each unit transfer must be recognised as a genuine sale of ownership units, not disguised debt repayment', 'SHARIAH_COMPLIANCE',
        'MUSHARAKAH_UNIT_SALE', 'VALIDATION', 'WARNING', '#transfer.unitsTransferred > 0 and #transfer.totalTransferPrice > 0', '{}'::jsonb,
        'Each Musharakah unit transfer must carry real sale consideration', '["MUSHARAKAH"]'::jsonb,
        '["musharakah","units"]'::jsonb, CURRENT_DATE, 'ACTIVE', 50, 'ST-005', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('MSH_RENTAL_RATE_BY_AMOUNT_TENOR', 'Musharakah rental rate by tenor and amount', 'معدل إيجار المشاركة حسب المبلغ والمدة',
        'Diminishing Musharakah rental rate lookup by amount and tenor', 'PRICING', 'MUSHARAKAH_RENTAL_RATE', 'CALCULATION', 'INFORMATIONAL',
        'decisionTable("MSH_RENTAL_RATE_BY_AMOUNT_TENOR")', '{}'::jsonb,
        'No Musharakah rental rate tier matched the supplied inputs', '["MUSHARAKAH"]'::jsonb,
        '["musharakah","pricing"]'::jsonb, CURRENT_DATE, 'ACTIVE', 60, 'ST-005', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT ((LOWER(rule_code)), COALESCE(tenant_id, -1)) DO NOTHING;

INSERT INTO decision_table (
    rule_id, table_name, description, input_columns, output_columns,
    hit_policy, status, table_version, tenant_id, created_by, updated_by
)
SELECT br.id,
       'MSH_RENTAL_RATE_BY_AMOUNT_TENOR',
       'Musharakah rental rate bands by tenor and amount',
       '[{"name":"tenor_months","type":"INTEGER_RANGE"},{"name":"amount","type":"DECIMAL_RANGE"}]'::jsonb,
       '[{"name":"rental_rate","type":"DECIMAL"}]'::jsonb,
       'FIRST_MATCH', 'ACTIVE', 1, NULL, 'SYSTEM', 'SYSTEM'
FROM business_rule br
WHERE br.rule_code = 'MSH_RENTAL_RATE_BY_AMOUNT_TENOR'
  AND br.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM decision_table dt WHERE dt.rule_id = br.id AND dt.table_name = 'MSH_RENTAL_RATE_BY_AMOUNT_TENOR'
  );

INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values,
    description, is_active, priority, created_by, updated_by
)
SELECT dt.id, seed.row_number, seed.input_values::jsonb, seed.output_values::jsonb,
       seed.description, TRUE, seed.priority, 'SYSTEM', 'SYSTEM'
FROM decision_table dt
JOIN (
    VALUES
        (1, '[{"from":1,"to":60},{"from":0,"to":500000}]', '[{"value":5.25}]', 'Retail short and medium tenor', 1),
        (2, '[{"from":61,"to":180},{"from":0,"to":5000000}]', '[{"value":5.75}]', 'Long tenor home finance', 2),
        (3, '[{"from":36,"to":180},{"from":500001,"to":20000000}]', '[{"value":6.00}]', 'Commercial property tier', 3),
        (4, '[{"from":12,"to":84},{"from":0,"to":500000}]', '[{"value":5.10}]', 'Vehicle Musharakah tier', 4)
) AS seed(row_number, input_values, output_values, description, priority)
  ON TRUE
WHERE dt.table_name = 'MSH_RENTAL_RATE_BY_AMOUNT_TENOR'
  AND NOT EXISTS (
      SELECT 1 FROM decision_table_row dtr WHERE dtr.decision_table_id = dt.id AND dtr.row_number = seed.row_number
  );
