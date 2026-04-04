SET search_path TO cbs;

-- ============================================================================
-- V98: Ijarah financing, IMB transfer, asset registry, rental schedules, and
--      AAOIFI-aligned posting seeds
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ijarah_applications (
    id                              BIGSERIAL PRIMARY KEY,
    application_ref                 VARCHAR(50) NOT NULL UNIQUE,
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    product_code                    VARCHAR(30) NOT NULL,
    ijarah_type                     VARCHAR(40) NOT NULL CHECK (ijarah_type IN (
                                        'OPERATING_IJARAH','IJARAH_MUNTAHIA_BITTAMLEEK',
                                        'IJARAH_MAWSUFAH_FI_DHIMMAH','IJARAH_THUMMA_AL_BAI')),
    requested_asset_description     TEXT NOT NULL,
    requested_asset_category        VARCHAR(40) CHECK (requested_asset_category IN (
                                        'VEHICLE','RESIDENTIAL_PROPERTY','COMMERCIAL_PROPERTY','EQUIPMENT',
                                        'MACHINERY','AIRCRAFT','VESSEL','IT_EQUIPMENT','OFFICE_SPACE',
                                        'FURNITURE','OTHER')),
    estimated_asset_cost            NUMERIC(18,2) NOT NULL,
    requested_tenor_months          INT NOT NULL,
    currency_code                   VARCHAR(3) NOT NULL,
    purpose                         VARCHAR(30) CHECK (purpose IN (
                                        'VEHICLE','HOME','OFFICE_SPACE','EQUIPMENT','MACHINERY','OTHER')),
    monthly_income                  NUMERIC(18,2),
    existing_obligations            NUMERIC(18,2),
    proposed_monthly_rental         NUMERIC(18,2),
    dsr_with_proposed_rental        NUMERIC(10,4),
    credit_score                    INT,
    proposed_rental_amount          NUMERIC(18,2),
    proposed_rental_frequency       VARCHAR(20) CHECK (proposed_rental_frequency IN (
                                        'MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY')),
    proposed_advance_rentals        INT,
    proposed_security_deposit       NUMERIC(18,2),
    status                          VARCHAR(30) NOT NULL CHECK (status IN (
                                        'DRAFT','SUBMITTED','CREDIT_ASSESSMENT','ASSET_QUOTATION',
                                        'PRICING','APPROVED','REJECTED','CANCELLED','CONVERTED','EXPIRED')),
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

CREATE INDEX IF NOT EXISTS idx_ijarah_app_customer_status
    ON ijarah_applications (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_ijarah_app_officer_status
    ON ijarah_applications (assigned_officer_id, status);

CREATE TABLE IF NOT EXISTS ijarah_assets (
    id                              BIGSERIAL PRIMARY KEY,
    asset_ref                        VARCHAR(50) NOT NULL UNIQUE,
    ijarah_contract_id               BIGINT UNIQUE,
    asset_category                   VARCHAR(40) NOT NULL CHECK (asset_category IN (
                                        'VEHICLE','RESIDENTIAL_PROPERTY','COMMERCIAL_PROPERTY','EQUIPMENT',
                                        'MACHINERY','AIRCRAFT','VESSEL','IT_EQUIPMENT','OFFICE_SPACE',
                                        'FURNITURE','OTHER')),
    asset_description                TEXT NOT NULL,
    detailed_specification           JSONB NOT NULL DEFAULT '{}'::jsonb,
    acquisition_date                 DATE,
    acquisition_cost                 NUMERIC(18,2) NOT NULL,
    acquisition_method               VARCHAR(30) CHECK (acquisition_method IN (
                                        'DIRECT_PURCHASE','AUCTION','TRANSFER_FROM_CUSTOMER','CONSTRUCTION')),
    supplier_name                    VARCHAR(255),
    supplier_invoice_ref             VARCHAR(120),
    currency_code                    VARCHAR(3) NOT NULL,
    registered_owner                 VARCHAR(255) NOT NULL,
    registration_number              VARCHAR(120),
    registration_authority           VARCHAR(200),
    registration_date                DATE,
    ownership_evidence_ref           VARCHAR(120),
    depreciation_method              VARCHAR(30) NOT NULL CHECK (depreciation_method IN (
                                        'STRAIGHT_LINE','DECLINING_BALANCE','UNITS_OF_PRODUCTION')),
    useful_life_months               INT NOT NULL,
    residual_value                   NUMERIC(18,2) NOT NULL DEFAULT 0,
    depreciable_amount               NUMERIC(18,2) NOT NULL DEFAULT 0,
    monthly_depreciation             NUMERIC(18,2) NOT NULL DEFAULT 0,
    accumulated_depreciation         NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_book_value                   NUMERIC(18,2) NOT NULL DEFAULT 0,
    last_depreciation_date           DATE,
    current_condition                VARCHAR(20) CHECK (current_condition IN (
                                        'NEW','EXCELLENT','GOOD','FAIR','POOR','DAMAGED','TOTAL_LOSS')),
    last_inspection_date             DATE,
    last_inspection_notes            TEXT,
    next_inspection_due_date         DATE,
    insured                          BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_policy_ref             VARCHAR(120),
    insurance_provider               VARCHAR(200),
    insurance_coverage_amount        NUMERIC(18,2),
    insurance_premium_annual         NUMERIC(18,2),
    insurance_expiry_date            DATE,
    total_maintenance_cost           NUMERIC(18,2) NOT NULL DEFAULT 0,
    last_maintenance_date            DATE,
    next_maintenance_due_date        DATE,
    status                           VARCHAR(30) NOT NULL CHECK (status IN (
                                        'UNDER_PROCUREMENT','OWNED_UNLEASED','LEASED','RETURNED',
                                        'TRANSFERRED_TO_CUSTOMER','DISPOSED','TOTAL_LOSS')),
    leased_to_customer_id            BIGINT,
    leased_under                     VARCHAR(50),
    disposal_date                    DATE,
    disposal_method                  VARCHAR(30) CHECK (disposal_method IN (
                                        'SOLD','GIFTED_IMB','SCRAPPED','INSURANCE_WRITE_OFF')),
    disposal_proceeds                NUMERIC(18,2),
    disposal_journal_ref             VARCHAR(40),
    last_valuation_date              DATE,
    last_valuation_amount            NUMERIC(18,2),
    valuation_method                 VARCHAR(120),
    appraiser_name                   VARCHAR(200),
    tenant_id                        BIGINT,
    created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                       VARCHAR(100),
    updated_by                       VARCHAR(100),
    version                          BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ijarah_assets_category_status
    ON ijarah_assets (asset_category, status);
CREATE INDEX IF NOT EXISTS idx_ijarah_assets_insurance_expiry
    ON ijarah_assets (insurance_expiry_date);
CREATE INDEX IF NOT EXISTS idx_ijarah_assets_maintenance_due
    ON ijarah_assets (next_maintenance_due_date);

CREATE TABLE IF NOT EXISTS ijarah_asset_maintenance_records (
    id                              BIGSERIAL PRIMARY KEY,
    asset_id                        BIGINT NOT NULL REFERENCES ijarah_assets(id) ON DELETE CASCADE,
    maintenance_type                VARCHAR(30) NOT NULL CHECK (maintenance_type IN (
                                        'MAJOR_STRUCTURAL','MAJOR_MECHANICAL','ROUTINE_SCHEDULED',
                                        'EMERGENCY_REPAIR','REPLACEMENT_PART','INSURANCE_CLAIM')),
    responsible_party               VARCHAR(20) NOT NULL CHECK (responsible_party IN ('BANK','CUSTOMER')),
    description                     TEXT NOT NULL,
    cost                            NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_code                   VARCHAR(3) NOT NULL,
    vendor_name                     VARCHAR(255),
    invoice_ref                     VARCHAR(120),
    maintenance_date                DATE NOT NULL,
    completion_date                 DATE,
    journal_ref                     VARCHAR(40),
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ijarah_maint_asset_date
    ON ijarah_asset_maintenance_records (asset_id, maintenance_date);
CREATE INDEX IF NOT EXISTS idx_ijarah_maint_asset_party
    ON ijarah_asset_maintenance_records (asset_id, responsible_party);

CREATE TABLE IF NOT EXISTS ijarah_contracts (
    id                              BIGSERIAL PRIMARY KEY,
    contract_ref                    VARCHAR(50) NOT NULL UNIQUE,
    application_id                  BIGINT NOT NULL REFERENCES ijarah_applications(id),
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    account_id                      BIGINT UNIQUE REFERENCES account(id),
    islamic_product_template_id     BIGINT NOT NULL REFERENCES islamic_product_templates(id),
    product_code                    VARCHAR(30) NOT NULL,
    contract_type_code              VARCHAR(30) NOT NULL DEFAULT 'IJARAH',
    ijarah_type                     VARCHAR(40) NOT NULL CHECK (ijarah_type IN (
                                        'OPERATING_IJARAH','IJARAH_MUNTAHIA_BITTAMLEEK',
                                        'IJARAH_MAWSUFAH_FI_DHIMMAH','IJARAH_THUMMA_AL_BAI')),
    ijarah_asset_id                 BIGINT UNIQUE REFERENCES ijarah_assets(id),
    asset_description               TEXT,
    asset_category                  VARCHAR(40) CHECK (asset_category IN (
                                        'VEHICLE','RESIDENTIAL_PROPERTY','COMMERCIAL_PROPERTY','EQUIPMENT',
                                        'MACHINERY','AIRCRAFT','VESSEL','IT_EQUIPMENT','OFFICE_SPACE',
                                        'FURNITURE','OTHER')),
    asset_serial_number             VARCHAR(120),
    asset_location                  TEXT,
    asset_acquisition_cost          NUMERIC(18,2) NOT NULL,
    asset_fair_value_at_inception   NUMERIC(18,2),
    asset_residual_value            NUMERIC(18,2),
    currency_code                   VARCHAR(3) NOT NULL,
    lease_start_date                DATE,
    lease_end_date                  DATE,
    tenor_months                    INT NOT NULL,
    total_lease_periods             INT NOT NULL,
    rental_frequency                VARCHAR(20) NOT NULL CHECK (rental_frequency IN (
                                        'MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY')),
    base_rental_amount              NUMERIC(18,2) NOT NULL,
    rental_type                     VARCHAR(20) NOT NULL CHECK (rental_type IN ('FIXED','VARIABLE','STEPPED')),
    variable_rental_benchmark       VARCHAR(40),
    variable_rental_margin          NUMERIC(10,4),
    rental_review_frequency         VARCHAR(20) CHECK (rental_review_frequency IN ('NONE','ANNUAL','BI_ANNUAL','AS_PER_CONTRACT')),
    next_rental_review_date         DATE,
    rental_escalation_rate          NUMERIC(10,4),
    advance_rentals                 INT NOT NULL DEFAULT 0,
    advance_rental_amount           NUMERIC(18,2),
    security_deposit                NUMERIC(18,2),
    total_rentals_expected          NUMERIC(18,2),
    total_rentals_received          NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_rental_arrears            NUMERIC(18,2) NOT NULL DEFAULT 0,
    bank_return_on_asset            NUMERIC(10,4),
    asset_owned_by_bank             BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_responsibility        VARCHAR(30) CHECK (insurance_responsibility IN ('BANK','CUSTOMER_ON_BEHALF')),
    insurance_policy_ref            VARCHAR(120),
    insurance_provider              VARCHAR(200),
    insurance_coverage_amount       NUMERIC(18,2),
    insurance_expiry_date           DATE,
    major_maintenance_responsibility VARCHAR(20) CHECK (major_maintenance_responsibility IN ('BANK')),
    minor_maintenance_responsibility VARCHAR(20) CHECK (minor_maintenance_responsibility IN ('CUSTOMER')),
    last_major_maintenance_date     DATE,
    next_major_maintenance_due_date DATE,
    grace_period_days               INT NOT NULL DEFAULT 0,
    late_penalty_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
    late_penalty_to_charity         BOOLEAN NOT NULL DEFAULT TRUE,
    total_late_penalties            NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_charity_from_late_penalties NUMERIC(18,2) NOT NULL DEFAULT 0,
    imb_transfer_mechanism_id       BIGINT,
    imb_transfer_type               VARCHAR(30) CHECK (imb_transfer_type IN (
                                        'GIFT_HIBAH','SALE_AT_NOMINAL','SALE_AT_FAIR_VALUE','GRADUAL_TRANSFER')),
    imb_transfer_scheduled          BOOLEAN NOT NULL DEFAULT FALSE,
    imb_transfer_completed          BOOLEAN NOT NULL DEFAULT FALSE,
    imb_transfer_date               DATE,
    status                          VARCHAR(30) NOT NULL CHECK (status IN (
                                        'DRAFT','ASSET_PROCUREMENT','ASSET_OWNED','PENDING_EXECUTION',
                                        'ACTIVE','RENTAL_ARREARS','DEFAULTED','TERMINATED_EARLY',
                                        'TERMINATED_ASSET_LOSS','MATURED','TRANSFERRED_TO_CUSTOMER','CLOSED')),
    executed_at                     TIMESTAMPTZ,
    executed_by                     VARCHAR(100),
    terminated_at                   DATE,
    termination_reason              TEXT,
    investment_pool_id              BIGINT REFERENCES investment_pool(id),
    pool_asset_assignment_id        BIGINT REFERENCES pool_asset_assignment(id),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ijarah_contract_customer_status
    ON ijarah_contracts (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_ijarah_contract_type_status
    ON ijarah_contracts (ijarah_type, status);
CREATE INDEX IF NOT EXISTS idx_ijarah_contract_lease_end_status
    ON ijarah_contracts (lease_end_date, status);
CREATE INDEX IF NOT EXISTS idx_ijarah_contract_pool
    ON ijarah_contracts (investment_pool_id);
CREATE INDEX IF NOT EXISTS idx_ijarah_contract_insurance_expiry
    ON ijarah_contracts (insurance_expiry_date);
CREATE INDEX IF NOT EXISTS idx_ijarah_contract_rental_review
    ON ijarah_contracts (next_rental_review_date);

ALTER TABLE ijarah_assets
    DROP CONSTRAINT IF EXISTS fk_ijarah_assets_contract;
ALTER TABLE ijarah_assets
    ADD CONSTRAINT fk_ijarah_assets_contract
    FOREIGN KEY (ijarah_contract_id) REFERENCES ijarah_contracts(id);

CREATE TABLE IF NOT EXISTS ijarah_transfer_mechanisms (
    id                              BIGSERIAL PRIMARY KEY,
    transfer_ref                    VARCHAR(50) NOT NULL UNIQUE,
    ijarah_contract_id              BIGINT NOT NULL UNIQUE REFERENCES ijarah_contracts(id) ON DELETE CASCADE,
    ijarah_contract_ref             VARCHAR(50) NOT NULL,
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    transfer_type                   VARCHAR(30) NOT NULL CHECK (transfer_type IN (
                                        'GIFT_HIBAH','SALE_AT_NOMINAL','SALE_AT_FAIR_VALUE','GRADUAL_TRANSFER')),
    transfer_description            TEXT,
    transfer_description_ar         TEXT,
    is_separate_document            BOOLEAN NOT NULL DEFAULT TRUE,
    document_date                   DATE NOT NULL,
    document_reference              VARCHAR(80) NOT NULL,
    document_type                   VARCHAR(30) NOT NULL CHECK (document_type IN (
                                        'WAAD_PROMISE','SALE_AGREEMENT','GIFT_DEED','TRANSFER_SCHEDULE')),
    signed_by_bank                  BOOLEAN NOT NULL DEFAULT FALSE,
    signed_by_bank_date             DATE,
    signed_by_bank_representative   VARCHAR(100),
    signed_by_customer              BOOLEAN NOT NULL DEFAULT FALSE,
    signed_by_customer_date         DATE,
    gift_condition                  TEXT,
    gift_effective_date             DATE,
    nominal_sale_price              NUMERIC(18,2),
    sale_currency                   VARCHAR(3),
    sale_condition                  TEXT,
    fair_value_determination_method VARCHAR(200),
    fair_value_appraiser            VARCHAR(200),
    estimated_fair_value            NUMERIC(18,2),
    actual_fair_value               NUMERIC(18,2),
    actual_fair_value_date          DATE,
    total_transfer_units            INT,
    units_transferred_to_date       INT NOT NULL DEFAULT 0,
    unit_transfer_frequency         VARCHAR(20) CHECK (unit_transfer_frequency IN ('MONTHLY','QUARTERLY','ANNUALLY')),
    unit_transfer_amount            NUMERIC(18,2),
    next_unit_transfer_date         DATE,
    status                          VARCHAR(30) NOT NULL CHECK (status IN (
                                        'DRAFT','SIGNED','ACTIVE','PARTIALLY_TRANSFERRED','PENDING_EXECUTION',
                                        'EXECUTED','CANCELLED','VOID')),
    executed_at                     TIMESTAMPTZ,
    executed_by                     VARCHAR(100),
    cancellation_reason             TEXT,
    title_transfer_date             DATE,
    title_transfer_doc_ref          VARCHAR(120),
    registration_authority          VARCHAR(120),
    new_registration_number         VARCHAR(120),
    asset_condition_at_transfer     TEXT,
    customer_acknowledgment         BOOLEAN NOT NULL DEFAULT FALSE,
    customer_acknowledgment_date    DATE,
    transfer_journal_ref            VARCHAR(40),
    asset_net_book_value_at_transfer NUMERIC(18,2),
    gain_loss_on_transfer           NUMERIC(18,2),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ijarah_transfer_status
    ON ijarah_transfer_mechanisms (status);

CREATE TABLE IF NOT EXISTS ijarah_gradual_transfer_units (
    id                              BIGSERIAL PRIMARY KEY,
    transfer_mechanism_id           BIGINT NOT NULL REFERENCES ijarah_transfer_mechanisms(id) ON DELETE CASCADE,
    unit_number                     INT NOT NULL,
    scheduled_date                  DATE NOT NULL,
    unit_percentage                 NUMERIC(10,4) NOT NULL,
    unit_price                      NUMERIC(18,2) NOT NULL,
    cumulative_ownership            NUMERIC(10,4) NOT NULL,
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED','TRANSFERRED','OVERDUE','WAIVED')),
    transfer_date                   DATE,
    payment_amount                  NUMERIC(18,2),
    payment_transaction_ref         VARCHAR(100),
    journal_ref                     VARCHAR(40),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0,
    UNIQUE (transfer_mechanism_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_ijarah_gradual_units_date_status
    ON ijarah_gradual_transfer_units (scheduled_date, status);

CREATE TABLE IF NOT EXISTS ijarah_rental_installments (
    id                              BIGSERIAL PRIMARY KEY,
    contract_id                     BIGINT NOT NULL REFERENCES ijarah_contracts(id) ON DELETE CASCADE,
    installment_number              INT NOT NULL,
    due_date                        DATE NOT NULL,
    due_date_hijri                  VARCHAR(20),
    rental_amount                   NUMERIC(18,2) NOT NULL,
    maintenance_component           NUMERIC(18,2),
    net_rental_amount               NUMERIC(18,2) NOT NULL,
    is_advance_rental               BOOLEAN NOT NULL DEFAULT FALSE,
    rental_period_from              DATE NOT NULL,
    rental_period_to                DATE NOT NULL,
    status                          VARCHAR(20) NOT NULL CHECK (status IN (
                                        'SCHEDULED','DUE','PAID','PARTIAL','OVERDUE','WAIVED','CANCELLED')),
    paid_amount                     NUMERIC(18,2),
    paid_date                       DATE,
    transaction_ref                 VARCHAR(100),
    journal_ref                     VARCHAR(40),
    days_overdue                    INT NOT NULL DEFAULT 0,
    late_penalty_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
    late_penalty_charity_journal_ref VARCHAR(40),
    notes                           TEXT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0,
    UNIQUE (contract_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_ijarah_installments_contract_status
    ON ijarah_rental_installments (contract_id, status);
CREATE INDEX IF NOT EXISTS idx_ijarah_installments_due_status
    ON ijarah_rental_installments (due_date, status);

-- ---------------------------------------------------------------------------
-- Base products, product templates, and Islamic product templates
-- ---------------------------------------------------------------------------

INSERT INTO product (
    code, name, description, product_category, currency_code, min_opening_balance, min_operating_balance,
    max_balance, allows_overdraft, max_overdraft_limit, allows_cheque_book, allows_debit_card, allows_mobile,
    allows_internet, allows_sweep, dormancy_days, interest_bearing, base_interest_rate, interest_calc_method,
    interest_posting_frequency, interest_accrual_method, monthly_maintenance_fee, sms_alert_fee, gl_account_code,
    gl_interest_expense_code, gl_interest_payable_code, gl_fee_income_code, is_active, effective_from, created_by, updated_by
)
VALUES
    ('IJR-VEH-SAR-001', 'Vehicle Ijarah Financing', 'Islamic vehicle lease financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0, 'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0,
        '1200-IJR-001', NULL, NULL, NULL, TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('IJR-PROP-SAR-001', 'Property Ijarah IMB Financing', 'Islamic property lease to own financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0, 'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0,
        '1200-IJR-001', NULL, NULL, NULL, TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('IJR-EQUIP-SAR-001', 'Equipment Ijarah Financing', 'Islamic equipment lease financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0, 'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0,
        '1200-IJR-001', NULL, NULL, NULL, TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

INSERT INTO product_template (
    template_code, template_name, product_category, interest_config, fee_config, limit_config,
    eligibility_rules, lifecycle_rules, gl_mapping, status, approved_by, approved_at, activated_at,
    template_version, created_by
)
VALUES
    ('IJR-VEH-SAR-001', 'Vehicle Ijarah Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb,
        '{"contract":"IJARAH","assetOwnershipDuringTenor":"BANK_OWNED","maintenanceResponsibility":"BANK","insuranceResponsibility":"BANK"}'::jsonb,
        '{"financingAssetGl":"1400-IJR-001","profitReceivableGl":"1620-IJR-001","profitIncomeGl":"5100-IJR-001","charityGl":"2300-000-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('IJR-PROP-SAR-001', 'Property Ijarah IMB Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb,
        '{"contract":"IJARAH","assetOwnershipDuringTenor":"BANK_OWNED","assetTransferOnCompletion":true,"maintenanceResponsibility":"BANK","insuranceResponsibility":"BANK"}'::jsonb,
        '{"financingAssetGl":"1400-IJR-001","profitReceivableGl":"1620-IJR-001","profitIncomeGl":"5100-IJR-001","charityGl":"2300-000-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('IJR-EQUIP-SAR-001', 'Equipment Ijarah Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb,
        '{"contract":"IJARAH","assetOwnershipDuringTenor":"BANK_OWNED","maintenanceResponsibility":"BANK","insuranceResponsibility":"BANK"}'::jsonb,
        '{"financingAssetGl":"1400-IJR-001","profitReceivableGl":"1620-IJR-001","profitIncomeGl":"5100-IJR-001","charityGl":"2300-000-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM')
ON CONFLICT (template_code) DO NOTHING;

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method, profit_rate_type,
    late_penalty_to_charity, charity_gl_account_code, asset_ownership_during_tenor,
    asset_transfer_on_completion, rental_review_frequency, maintenance_responsibility, insurance_responsibility,
    aaoifi_standard, fatwa_required, shariah_compliance_status, shariah_rule_group_code,
    status, effective_from, product_version, min_amount, max_amount, min_tenor_months, max_tenor_months,
    currencies, eligible_customer_types, eligible_segments, financing_asset_gl, profit_receivable_gl,
    profit_income_gl, charity_gl, tenant_id, created_by, updated_by
)
SELECT pt.id, seed.product_code, seed.name, seed.name_ar, seed.description, seed.description_ar,
       ict.id, 'FINANCING', seed.sub_category, 'RENTAL_RATE', 'FIXED',
       TRUE, '2300-000-001', 'BANK_OWNED',
       seed.asset_transfer_on_completion, seed.rental_review_frequency, 'BANK', 'BANK',
       'FAS 8/FAS 32', TRUE, 'COMPLIANT', 'IJARAH_RULES',
       'ACTIVE', CURRENT_DATE, 1, seed.min_amount, seed.max_amount, seed.min_tenor, seed.max_tenor,
       '["SAR"]'::jsonb, seed.customer_types::jsonb, seed.eligible_segments::jsonb,
       '1400-IJR-001', '1620-IJR-001', '5100-IJR-001', '2300-000-001', NULL, 'SYSTEM', 'SYSTEM'
FROM product pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'ijarah' AND ict.tenant_id IS NULL
JOIN (
    VALUES
        ('IJR-VEH-SAR-001', 'Vehicle Ijarah Financing', 'إجارة المركبات', 'Islamic vehicle Ijarah financing', 'تمويل إجارة للمركبات', 'VEHICLE_LEASE', FALSE, 'NONE', 30000::numeric, 500000::numeric, 12, 60, '["INDIVIDUAL","CORPORATE","SME"]', '["RETAIL","AFFLUENT"]'),
        ('IJR-PROP-SAR-001', 'Property Ijarah IMB Financing', 'إجارة العقار مع التمليك', 'Islamic property Ijarah Muntahia Bittamleek financing', 'تمويل إجارة منتهية بالتمليك للعقار', 'PROPERTY_LEASE', TRUE, 'ANNUAL', 200000::numeric, 5000000::numeric, 60, 300, '["INDIVIDUAL","CORPORATE","SME"]', '["AFFLUENT","HNW","CORPORATE"]'),
        ('IJR-EQUIP-SAR-001', 'Equipment Ijarah Financing', 'إجارة المعدات', 'Islamic equipment Ijarah financing', 'تمويل إجارة للمعدات', 'EQUIPMENT_LEASE', FALSE, 'NONE', 50000::numeric, 10000000::numeric, 12, 84, '["SME","CORPORATE"]', '["SME","CORPORATE"]')
 ) AS seed(product_code, name, name_ar, description, description_ar, sub_category, asset_transfer_on_completion, rental_review_frequency, min_amount, max_amount, min_tenor, max_tenor, customer_types, eligible_segments)
    ON pt.code = seed.product_code
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = LOWER(seed.product_code)
);

-- ---------------------------------------------------------------------------
-- Additional GL accounts and posting rules
-- ---------------------------------------------------------------------------

INSERT INTO chart_of_accounts (
    gl_code, gl_name, gl_category, level_number, is_header, is_postable, is_multi_currency, is_inter_branch,
    normal_balance, allow_manual_posting, requires_cost_centre, is_active, islamic_account_category,
    contract_type_code, shariah_classification, is_islamic_account, aaoifi_reference, aaoifi_line_item,
    profit_distribution_eligible, zakat_applicable, contra_account_code, is_reserve_account, reserve_type,
    created_by, updated_at
)
VALUES
    ('5150-IJR-001', 'Gain on Ijarah Asset Disposal', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'IJARAH_INCOME', 'IJARAH', 'HALAL', TRUE, 'FAS 32', 'Gain on Ijarah disposal', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('6250-IJR-001', 'Loss on Ijarah Asset Disposal / Transfer', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_EXPENSE', 'IJARAH', 'HALAL', TRUE, 'FAS 32', 'Loss on transfer of Ijarah asset', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('6260-IJR-001', 'Loss on Ijarah Asset — Total Loss', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_EXPENSE', 'IJARAH', 'HALAL', TRUE, 'FAS 8', 'Total loss on Ijarah asset', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('1650-IJR-001', 'Insurance Receivable — Ijarah Assets', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_ASSETS', 'IJARAH', 'HALAL', TRUE, 'FAS 8', 'Insurance claim receivable on Ijarah assets', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('6210-IJR-001', 'Ijarah Maintenance Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_EXPENSE', 'IJARAH', 'HALAL', TRUE, 'FAS 8', 'Major maintenance on Ijarah assets', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('6220-IJR-001', 'Ijarah Insurance Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_EXPENSE', 'IJARAH', 'HALAL', TRUE, 'FAS 8', 'Insurance expense on Ijarah assets', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('6230-IJR-001', 'Ijarah Impairment Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'FINANCING_IMPAIRMENT', 'IJARAH', 'HALAL', TRUE, 'FAS 8', 'Impairment expense for Ijarah assets', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW()),
    ('1700-IJR-001', 'Impairment Provision — Ijarah Assets', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'FINANCING_IMPAIRMENT', 'IJARAH', 'HALAL', TRUE, 'FAS 8', 'Impairment provision for Ijarah assets', FALSE, FALSE, '1400-IJR-001', FALSE, 'NONE', 'SYSTEM', NOW()),
    ('1620-IJR-001', 'Ijarah Rental Receivable', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'FINANCING_RECEIVABLE_IJARAH', 'IJARAH', 'HALAL', TRUE, 'FAS 8', 'Accrued rental receivable', TRUE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW())
ON CONFLICT (gl_code) DO NOTHING;

INSERT INTO islamic_posting_rule (
    rule_code, name, contract_type_code, transaction_type, description, entries,
    priority, enabled, effective_from, aaoifi_reference, approved_by, approved_at, rule_version
)
VALUES
    ('IJR-IMB-GIFT-001', 'IMB Asset Transfer via Gift', 'IJARAH', 'OWNERSHIP_TRANSFER',
        'Derecognise Ijarah asset transferred by Hibah',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-002","amountExpression":"DEPRECIATION","narrationTemplate":"Ijarah accumulated depreciation release {{reference}}"},{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6250-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah gift transfer residual {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah asset gifted {{reference}}"}]'::jsonb,
        210, TRUE, CURRENT_DATE, 'FAS 32', 'SYSTEM', NOW(), 1),
    ('IJR-IMB-SALE-NOM-001', 'IMB Asset Transfer via Sale at Nominal Price', 'IJARAH', 'OWNERSHIP_TRANSFER',
        'Derecognise Ijarah asset sold at nominal price',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"PRINCIPAL","narrationTemplate":"Nominal sale proceeds {{reference}}"},{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-002","amountExpression":"DEPRECIATION","narrationTemplate":"Ijarah accumulated depreciation release {{reference}}"},{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6250-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah nominal transfer loss {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah asset sold at nominal {{reference}}"}]'::jsonb,
        205, TRUE, CURRENT_DATE, 'FAS 32', 'SYSTEM', NOW(), 1),
    ('IJR-IMB-SALE-FV-001', 'IMB Asset Transfer via Sale at Fair Value', 'IJARAH', 'OWNERSHIP_TRANSFER',
        'Derecognise Ijarah asset sold at fair value',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Fair value sale proceeds {{reference}}"},{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-002","amountExpression":"DEPRECIATION","narrationTemplate":"Ijarah accumulated depreciation release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah asset disposal {{reference}}"}]'::jsonb,
        200, TRUE, CURRENT_DATE, 'FAS 32', 'SYSTEM', NOW(), 1),
    ('IJR-IMB-UNIT-001', 'IMB Gradual Transfer', 'IJARAH', 'OWNERSHIP_TRANSFER',
        'Partial derecognition of Ijarah asset for unit transfer',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"IMB unit transfer proceeds {{reference}}"},{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-002","amountExpression":"DEPRECIATION","narrationTemplate":"IMB unit depreciation release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"IMB unit asset release {{reference}}"}]'::jsonb,
        195, TRUE, CURRENT_DATE, 'FAS 32', 'SYSTEM', NOW(), 1),
    ('IJR-LOSS-001', 'Ijarah Asset Total Loss', 'IJARAH', 'CONTRACT_CANCELLATION',
        'Write off Ijarah asset on total loss event',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-002","amountExpression":"DEPRECIATION","narrationTemplate":"Ijarah depreciation release {{reference}}"},{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6260-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah asset total loss {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1400-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah asset write-off {{reference}}"}]'::jsonb,
        190, TRUE, CURRENT_DATE, 'FAS 8', 'SYSTEM', NOW(), 1),
    ('IJR-MAINT-001', 'Ijarah Maintenance Expense', 'IJARAH', 'ASSET_TRANSFER',
        'Bank-funded major maintenance on Ijarah asset',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6210-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah maintenance {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah maintenance cash settlement {{reference}}"}]'::jsonb,
        185, TRUE, CURRENT_DATE, 'FAS 8', 'SYSTEM', NOW(), 1),
    ('IJR-INS-001', 'Ijarah Insurance Expense', 'IJARAH', 'ASSET_TRANSFER',
        'Insurance premium on Ijarah asset',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6220-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah insurance premium {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah insurance cash settlement {{reference}}"}]'::jsonb,
        180, TRUE, CURRENT_DATE, 'FAS 8', 'SYSTEM', NOW(), 1),
    ('IJR-IMPAIR-001', 'Ijarah Impairment Provision', 'IJARAH', 'IMPAIRMENT_PROVISION',
        'Impairment on Ijarah asset',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6230-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah impairment {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1700-IJR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Ijarah impairment provision {{reference}}"}]'::jsonb,
        175, TRUE, CURRENT_DATE, 'FAS 8', 'SYSTEM', NOW(), 1)
ON CONFLICT (rule_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Shariah business rules
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, category, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at,
    tenant_id, created_by, updated_by
)
VALUES
    ('SHARIAH-IJR-001', 'Bank must own asset throughout Ijarah', 'يجب أن يمتلك البنك الأصل طوال مدة الإجارة',
        'The bank must hold ownership and ownership risk before and during the Ijarah tenor', 'SHARIAH_COMPLIANCE',
        'IJARAH_OWNERSHIP', 'CONSTRAINT', 'BLOCKING', '#contract.assetOwnedByBank == true', '{}'::jsonb,
        'Ijarah execution requires verified bank ownership of the leased asset', '["IJARAH"]'::jsonb,
        '["ijarah","financing"]'::jsonb, CURRENT_DATE, 'ACTIVE', 10, 'ST-004', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-IJR-002', 'Major maintenance is bank responsibility', 'الصيانة الجوهرية على البنك',
        'Major structural and ownership-related maintenance may not be shifted to the customer', 'SHARIAH_COMPLIANCE',
        'IJARAH_MAINTENANCE', 'CONSTRAINT', 'BLOCKING', '#maintenance.responsibleParty == ''BANK''', '{}'::jsonb,
        'Major Ijarah maintenance must be borne by the bank', '["IJARAH"]'::jsonb,
        '["ijarah","assets"]'::jsonb, CURRENT_DATE, 'ACTIVE', 20, 'ST-004', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-IJR-003', 'Asset total loss terminates lease', 'هلاك الأصل ينهي عقد الإجارة',
        'If the leased asset is totally lost while bank owned, the lease terminates and future rentals cease', 'SHARIAH_COMPLIANCE',
        'IJARAH_TOTAL_LOSS', 'CONSTRAINT', 'BLOCKING', '#event.totalLoss == false or #contract.status == ''TERMINATED_ASSET_LOSS''', '{}'::jsonb,
        'Total loss must terminate the Ijarah lease and release future rentals', '["IJARAH"]'::jsonb,
        '["ijarah","assets","rentals"]'::jsonb, CURRENT_DATE, 'ACTIVE', 30, 'ST-004', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-IJR-004', 'IMB transfer must be separate document', 'نقل الملكية في الإجارة المنتهية بالتمليك يجب أن يكون بمستند مستقل',
        'The ownership transfer promise in IMB must be documented separately from the lease contract', 'SHARIAH_COMPLIANCE',
        'IJARAH_IMB_TRANSFER', 'CONSTRAINT', 'BLOCKING', '#transfer.isSeparateDocument == true and #transfer.documentReference != #contract.contractRef', '{}'::jsonb,
        'IMB transfer mechanism must be a separate document with its own reference', '["IJARAH"]'::jsonb,
        '["ijarah","transfer"]'::jsonb, CURRENT_DATE, 'ACTIVE', 40, 'ST-004', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-IJR-005', 'Rental review only at pre-agreed dates', 'مراجعة الأجرة تكون في المواعيد المتفق عليها فقط',
        'Variable rental adjustments may only occur on contractually agreed review dates', 'SHARIAH_COMPLIANCE',
        'IJARAH_RENTAL_REVIEW', 'CONSTRAINT', 'BLOCKING', '#review.requestedDate == #contract.nextRentalReviewDate', '{}'::jsonb,
        'Ijarah rental review may only occur on the pre-agreed review date', '["IJARAH"]'::jsonb,
        '["ijarah","rentals"]'::jsonb, CURRENT_DATE, 'ACTIVE', 50, 'ST-004', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT ((LOWER(rule_code)), COALESCE(tenant_id, -1)) DO NOTHING;

