SET search_path TO cbs;

-- ============================================================================
-- V96: Murabaha financing, Tawarruq ownership workflow, schedules, and AAOIFI
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS murabaha_applications (
    id                              BIGSERIAL PRIMARY KEY,
    application_ref                 VARCHAR(50) NOT NULL UNIQUE,
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    product_code                    VARCHAR(30) NOT NULL,
    murabahah_type                  VARCHAR(40) NOT NULL CHECK (murabahah_type IN (
                                        'COMMODITY_MURABAHA','ASSET_MURABAHA','DEFERRED_PAYMENT_MURABAHA')),
    requested_amount                NUMERIC(18,2) NOT NULL,
    currency_code                   VARCHAR(3) NOT NULL,
    requested_tenor_months          INT NOT NULL,
    purpose                         VARCHAR(30) NOT NULL CHECK (purpose IN (
                                        'HOME_PURCHASE','VEHICLE_PURCHASE','EQUIPMENT','WORKING_CAPITAL',
                                        'PERSONAL','EDUCATION','MEDICAL','BUSINESS_EXPANSION','OTHER')),
    purpose_description             TEXT,
    asset_description               TEXT,
    asset_category                  VARCHAR(40) CHECK (asset_category IN (
                                        'VEHICLE','PROPERTY','EQUIPMENT','MACHINERY','COMMODITY_METAL',
                                        'COMMODITY_OTHER','INVENTORY','CONSUMER_GOODS','RESIDENTIAL_PROPERTY',
                                        'COMMERCIAL_PROPERTY','LAND','FURNITURE','IT_EQUIPMENT','OTHER')),
    supplier_name                   VARCHAR(255),
    supplier_quote_amount           NUMERIC(18,2),
    supplier_quote_ref              VARCHAR(100),
    supplier_quote_expiry           DATE,
    monthly_income                  NUMERIC(18,2),
    existing_financing_obligations  NUMERIC(18,2),
    dsr                             NUMERIC(10,4),
    dsr_limit                       NUMERIC(10,4),
    credit_score                    INT,
    credit_assessment_notes         TEXT,
    credit_assessment_by            VARCHAR(100),
    credit_assessment_at            TIMESTAMPTZ,
    proposed_cost_price             NUMERIC(18,2),
    proposed_markup_rate            NUMERIC(10,4),
    proposed_selling_price          NUMERIC(18,2),
    proposed_down_payment           NUMERIC(18,2),
    proposed_tenor_months           INT,
    proposed_installment_amount     NUMERIC(18,2),
    status                          VARCHAR(30) NOT NULL CHECK (status IN (
                                        'DRAFT','SUBMITTED','UNDER_REVIEW','CREDIT_ASSESSMENT','PRICING',
                                        'APPROVED','REJECTED','CANCELLED','EXPIRED','CONVERTED_TO_CONTRACT')),
    current_step                    VARCHAR(60),
    assigned_officer_id             BIGINT,
    branch_id                       BIGINT,
    channel                         VARCHAR(20) NOT NULL CHECK (channel IN ('BRANCH','ONLINE','MOBILE')),
    approved_by                     VARCHAR(100),
    approved_at                     TIMESTAMPTZ,
    approved_amount                 NUMERIC(18,2),
    approved_tenor_months           INT,
    approved_markup_rate            NUMERIC(10,4),
    rejection_reason                TEXT,
    contract_id                     BIGINT,
    contract_ref                    VARCHAR(50),
    settlement_account_id           BIGINT REFERENCES account(id),
    submitted_at                    TIMESTAMPTZ,
    expires_at                      TIMESTAMPTZ,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_murabaha_app_customer_status
    ON murabaha_applications (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_murabaha_app_officer_status
    ON murabaha_applications (assigned_officer_id, status);
CREATE INDEX IF NOT EXISTS idx_murabaha_app_status_submitted
    ON murabaha_applications (status, submitted_at);

CREATE TABLE IF NOT EXISTS murabaha_contracts (
    id                              BIGSERIAL PRIMARY KEY,
    contract_ref                    VARCHAR(50) NOT NULL UNIQUE,
    application_id                  BIGINT NOT NULL REFERENCES murabaha_applications(id),
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    account_id                      BIGINT UNIQUE REFERENCES account(id),
    islamic_product_template_id     BIGINT NOT NULL REFERENCES islamic_product_templates(id),
    product_code                    VARCHAR(30) NOT NULL,
    contract_type_code              VARCHAR(30) NOT NULL DEFAULT 'MURABAHA',
    murabahah_type                  VARCHAR(40) NOT NULL CHECK (murabahah_type IN (
                                        'COMMODITY_MURABAHA','ASSET_MURABAHA','DEFERRED_PAYMENT_MURABAHA')),
    asset_description               TEXT,
    asset_category                  VARCHAR(40) CHECK (asset_category IN (
                                        'VEHICLE','PROPERTY','EQUIPMENT','MACHINERY','COMMODITY_METAL',
                                        'COMMODITY_OTHER','INVENTORY','CONSUMER_GOODS','RESIDENTIAL_PROPERTY',
                                        'COMMERCIAL_PROPERTY','LAND','FURNITURE','IT_EQUIPMENT','OTHER')),
    asset_serial_number             VARCHAR(120),
    supplier_name                   VARCHAR(255),
    supplier_id                     BIGINT,
    commodity_broker                VARCHAR(255),
    commodity_type                  VARCHAR(60),
    commodity_quantity              NUMERIC(18,6),
    commodity_unit                  VARCHAR(20),
    cost_price                      NUMERIC(18,2) NOT NULL,
    markup_rate                     NUMERIC(10,4) NOT NULL,
    markup_amount                   NUMERIC(18,2) NOT NULL,
    selling_price                   NUMERIC(18,2) NOT NULL,
    selling_price_locked_at         TIMESTAMPTZ,
    selling_price_locked            BOOLEAN NOT NULL DEFAULT FALSE,
    currency_code                   VARCHAR(3) NOT NULL,
    down_payment                    NUMERIC(18,2) DEFAULT 0,
    financed_amount                 NUMERIC(18,2) NOT NULL,
    tenor_months                    INT NOT NULL,
    start_date                      DATE,
    maturity_date                   DATE,
    first_installment_date          DATE,
    repayment_frequency             VARCHAR(20) CHECK (repayment_frequency IN (
                                        'MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY')),
    total_deferred_profit           NUMERIC(18,2) NOT NULL DEFAULT 0,
    recognised_profit               NUMERIC(18,2) NOT NULL DEFAULT 0,
    unrecognised_profit             NUMERIC(18,2) NOT NULL DEFAULT 0,
    profit_recognition_method       VARCHAR(40) NOT NULL CHECK (profit_recognition_method IN (
                                        'PROPORTIONAL_TO_TIME','PROPORTIONAL_TO_OUTSTANDING','SUM_OF_DIGITS')),
    ownership_sequence              JSONB NOT NULL DEFAULT '[]'::jsonb,
    ownership_verified              BOOLEAN NOT NULL DEFAULT FALSE,
    ownership_verified_by           VARCHAR(100),
    ownership_verified_at           TIMESTAMPTZ,
    grace_period_days               INT DEFAULT 0,
    late_penalty_rate               NUMERIC(10,4),
    late_penalty_method             VARCHAR(30) CHECK (late_penalty_method IN (
                                        'FLAT_PER_INSTALLMENT','PERCENTAGE_OF_OVERDUE','DAILY_RATE')),
    late_penalties_to_charity       BOOLEAN NOT NULL DEFAULT TRUE,
    total_late_penalties_charged    NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_charity_donations         NUMERIC(18,2) NOT NULL DEFAULT 0,
    early_settlement_allowed        BOOLEAN NOT NULL DEFAULT TRUE,
    early_settlement_rebate_method  VARCHAR(30) CHECK (early_settlement_rebate_method IN (
                                        'IBRA_MANDATORY','IBRA_DISCRETIONARY','NO_REBATE')),
    early_settled_at                DATE,
    early_settlement_amount         NUMERIC(18,2),
    ibra_amount                     NUMERIC(18,2),
    status                          VARCHAR(30) NOT NULL CHECK (status IN (
                                        'DRAFT','PENDING_OWNERSHIP','OWNERSHIP_VERIFIED','PENDING_EXECUTION',
                                        'EXECUTED','ACTIVE','SETTLED','EARLY_SETTLED','DEFAULTED',
                                        'WRITTEN_OFF','CANCELLED')),
    executed_at                     TIMESTAMPTZ,
    executed_by                     VARCHAR(100),
    investment_pool_id              BIGINT REFERENCES investment_pool(id),
    pool_asset_assignment_id        BIGINT REFERENCES pool_asset_assignment(id),
    takaful_required                BOOLEAN NOT NULL DEFAULT FALSE,
    takaful_policy_ref              VARCHAR(120),
    takaful_provider                VARCHAR(200),
    collateral_required             BOOLEAN NOT NULL DEFAULT FALSE,
    collateral_description          TEXT,
    collateral_value                NUMERIC(18,2),
    settlement_account_id           BIGINT REFERENCES account(id),
    impairment_provision_balance    NUMERIC(18,2) NOT NULL DEFAULT 0,
    last_profit_recognition_date    DATE,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_murabaha_contract_customer_status
    ON murabaha_contracts (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_murabaha_contract_investment_pool
    ON murabaha_contracts (investment_pool_id);
CREATE INDEX IF NOT EXISTS idx_murabaha_contract_status_maturity
    ON murabaha_contracts (status, maturity_date);
CREATE INDEX IF NOT EXISTS idx_murabaha_contract_type_status
    ON murabaha_contracts (murabahah_type, status);

CREATE TABLE IF NOT EXISTS commodity_murabaha_trades (
    id                                  BIGSERIAL PRIMARY KEY,
    contract_id                         BIGINT NOT NULL UNIQUE REFERENCES murabaha_contracts(id) ON DELETE CASCADE,
    trade_ref                           VARCHAR(50) NOT NULL UNIQUE,
    commodity_type                      VARCHAR(60) NOT NULL,
    commodity_grade                     VARCHAR(60),
    quantity                            NUMERIC(18,6) NOT NULL,
    unit                                VARCHAR(20) NOT NULL,
    market_reference                    VARCHAR(30) NOT NULL,
    purchase_broker_name                VARCHAR(255),
    purchase_broker_id                  BIGINT,
    purchase_order_ref                  VARCHAR(80) UNIQUE,
    purchase_date                       DATE,
    purchase_price                      NUMERIC(18,2),
    purchase_price_per_unit             NUMERIC(18,6),
    purchase_currency                   VARCHAR(3),
    purchase_confirmation_ref           VARCHAR(80),
    purchase_confirmation_date          DATE,
    purchase_status                     VARCHAR(20) NOT NULL CHECK (purchase_status IN (
                                            'PENDING','ORDERED','CONFIRMED','SETTLED','CANCELLED','FAILED')),
    purchase_settlement_date            DATE,
    purchase_journal_ref                VARCHAR(40),
    bank_ownership_evidence_type        VARCHAR(40) CHECK (bank_ownership_evidence_type IN (
                                            'WAREHOUSE_RECEIPT','CERTIFICATE_OF_TITLE','BROKER_CONFIRMATION',
                                            'CONSTRUCTIVE_POSSESSION_LETTER','TITLE_DEED','REGISTRATION_CERTIFICATE',
                                            'DELIVERY_NOTE','INSURANCE_CERTIFICATE','BANK_ACKNOWLEDGMENT')),
    bank_ownership_evidence_ref         VARCHAR(120),
    bank_ownership_date                 DATE,
    bank_ownership_duration             VARCHAR(60),
    ownership_verified_by               VARCHAR(100),
    ownership_verified_at               TIMESTAMPTZ,
    ownership_risk_born_by_bank         BOOLEAN NOT NULL DEFAULT FALSE,
    sale_to_customer_date               DATE,
    sale_to_customer_price              NUMERIC(18,2),
    sale_to_customer_confirmation_ref   VARCHAR(80),
    sale_to_customer_status             VARCHAR(20) NOT NULL CHECK (sale_to_customer_status IN (
                                            'PENDING','OFFERED','ACCEPTED','COMPLETED','ORDERED','CONFIRMED','SETTLED','NOT_APPLICABLE')),
    customer_sale_broker_name           VARCHAR(255),
    customer_sale_broker_id             BIGINT,
    customer_sale_order_ref             VARCHAR(80),
    customer_sale_date                  DATE,
    customer_sale_price                 NUMERIC(18,2),
    customer_sale_price_per_unit        NUMERIC(18,6),
    customer_sale_confirmation_ref      VARCHAR(80),
    customer_sale_status                VARCHAR(20) NOT NULL CHECK (customer_sale_status IN (
                                            'PENDING','OFFERED','ACCEPTED','COMPLETED','ORDERED','CONFIRMED','SETTLED','NOT_APPLICABLE')),
    customer_sale_settlement_date       DATE,
    customer_sale_journal_ref           VARCHAR(40),
    customer_sale_proceeds_credited_to  BIGINT REFERENCES account(id),
    overall_status                      VARCHAR(30) NOT NULL CHECK (overall_status IN (
                                            'INITIATED','PURCHASE_IN_PROGRESS','BANK_OWNS_COMMODITY',
                                            'MURABAHA_SALE_EXECUTED','CUSTOMER_SALE_IN_PROGRESS',
                                            'COMPLETED','FAILED','CANCELLED')),
    purchase_and_sale_brokers_different BOOLEAN NOT NULL DEFAULT FALSE,
    ownership_transfer_sequence_valid   BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_ownership_period_met        BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_compliance_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_verified_by              VARCHAR(100),
    compliance_verified_at              TIMESTAMPTZ,
    tenant_id                           BIGINT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_commodity_murabaha_status
    ON commodity_murabaha_trades (overall_status);

CREATE TABLE IF NOT EXISTS asset_murabaha_purchases (
    id                                  BIGSERIAL PRIMARY KEY,
    contract_id                         BIGINT NOT NULL UNIQUE REFERENCES murabaha_contracts(id) ON DELETE CASCADE,
    purchase_ref                        VARCHAR(50) NOT NULL UNIQUE,
    asset_category                      VARCHAR(40) NOT NULL CHECK (asset_category IN (
                                            'VEHICLE','PROPERTY','EQUIPMENT','MACHINERY','COMMODITY_METAL',
                                            'COMMODITY_OTHER','INVENTORY','CONSUMER_GOODS','RESIDENTIAL_PROPERTY',
                                            'COMMERCIAL_PROPERTY','LAND','FURNITURE','IT_EQUIPMENT','OTHER')),
    asset_description                   TEXT NOT NULL,
    asset_specification                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_or_used                         VARCHAR(20) NOT NULL CHECK (new_or_used IN ('NEW','USED','UNDER_CONSTRUCTION')),
    supplier_name                       VARCHAR(255) NOT NULL,
    supplier_registration_number        VARCHAR(80),
    supplier_address                    TEXT,
    supplier_contact_person             VARCHAR(120),
    supplier_contact_phone              VARCHAR(40),
    supplier_bank_account               VARCHAR(120),
    supplier_quote_ref                  VARCHAR(80) NOT NULL,
    supplier_quote_date                 DATE NOT NULL,
    supplier_quote_expiry               DATE,
    supplier_quote_amount               NUMERIC(18,2) NOT NULL,
    supplier_negotiated_price           NUMERIC(18,2),
    purchase_order_ref                  VARCHAR(80),
    purchase_order_date                 DATE,
    purchase_price                      NUMERIC(18,2),
    purchase_invoice_ref                VARCHAR(80),
    purchase_invoice_date               DATE,
    payment_to_supplier_date            DATE,
    payment_to_supplier_ref             VARCHAR(80),
    payment_to_supplier_journal_ref     VARCHAR(40),
    purchase_status                     VARCHAR(20) NOT NULL CHECK (purchase_status IN (
                                            'QUOTE_RECEIVED','PO_ISSUED','INVOICE_RECEIVED','PAYMENT_MADE',
                                            'DELIVERY_PENDING','DELIVERED','CANCELLED','FAILED')),
    possession_type                     VARCHAR(20) CHECK (possession_type IN ('CONSTRUCTIVE','PHYSICAL')),
    possession_date                     DATE,
    possession_evidence_type            VARCHAR(40) CHECK (possession_evidence_type IN (
                                            'WAREHOUSE_RECEIPT','CERTIFICATE_OF_TITLE','BROKER_CONFIRMATION',
                                            'CONSTRUCTIVE_POSSESSION_LETTER','TITLE_DEED','REGISTRATION_CERTIFICATE',
                                            'DELIVERY_NOTE','INSURANCE_CERTIFICATE','BANK_ACKNOWLEDGMENT')),
    possession_evidence_ref             VARCHAR(120),
    possession_evidence_document_path   TEXT,
    possession_location                 TEXT,
    registered_in_bank_name             BOOLEAN NOT NULL DEFAULT FALSE,
    bank_name_on_title                  VARCHAR(200),
    insurance_during_ownership          BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_policy_ref                VARCHAR(120),
    insurance_provider                  VARCHAR(200),
    insurance_coverage_amount           NUMERIC(18,2),
    risk_born_by_bank                   BOOLEAN NOT NULL DEFAULT FALSE,
    asset_inspected                     BOOLEAN NOT NULL DEFAULT FALSE,
    asset_inspection_date               DATE,
    asset_inspection_notes              TEXT,
    ownership_verified                  BOOLEAN NOT NULL DEFAULT FALSE,
    ownership_verified_by               VARCHAR(100),
    ownership_verified_at               TIMESTAMPTZ,
    verification_checklist              JSONB NOT NULL DEFAULT '[]'::jsonb,
    transfer_to_customer_date           DATE,
    transfer_document_ref               VARCHAR(120),
    asset_registered_to_customer        BOOLEAN NOT NULL DEFAULT FALSE,
    customer_acknowledgment_date        DATE,
    customer_acknowledgment_ref         VARCHAR(120),
    overall_status                      VARCHAR(30) NOT NULL CHECK (overall_status IN (
                                            'INITIATED','QUOTE_PHASE','PURCHASE_IN_PROGRESS','BANK_OWNS_ASSET',
                                            'OWNERSHIP_VERIFIED','MURABAHA_SALE_COMPLETE',
                                            'TRANSFERRED_TO_CUSTOMER','CANCELLED','FAILED')),
    tenant_id                           BIGINT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_asset_murabaha_status
    ON asset_murabaha_purchases (overall_status);

CREATE TABLE IF NOT EXISTS murabaha_installments (
    id                                  BIGSERIAL PRIMARY KEY,
    contract_id                         BIGINT NOT NULL REFERENCES murabaha_contracts(id) ON DELETE CASCADE,
    installment_number                  INT NOT NULL,
    due_date                            DATE NOT NULL,
    due_date_hijri                      VARCHAR(40),
    principal_component                 NUMERIC(18,2) NOT NULL,
    profit_component                    NUMERIC(18,2) NOT NULL,
    total_installment_amount            NUMERIC(18,2) NOT NULL,
    outstanding_principal_before        NUMERIC(18,2) NOT NULL,
    outstanding_principal_after         NUMERIC(18,2) NOT NULL,
    cumulative_principal_paid           NUMERIC(18,2) NOT NULL DEFAULT 0,
    cumulative_profit_paid              NUMERIC(18,2) NOT NULL DEFAULT 0,
    status                              VARCHAR(20) NOT NULL CHECK (status IN (
                                            'SCHEDULED','DUE','PAID','PARTIAL','OVERDUE','WAIVED')),
    paid_amount                         NUMERIC(18,2) DEFAULT 0,
    paid_date                           DATE,
    paid_principal                      NUMERIC(18,2) DEFAULT 0,
    paid_profit                         NUMERIC(18,2) DEFAULT 0,
    transaction_ref                     VARCHAR(60),
    journal_ref                         VARCHAR(40),
    days_overdue                        INT NOT NULL DEFAULT 0,
    late_penalty_amount                 NUMERIC(18,2) NOT NULL DEFAULT 0,
    late_penalty_charity_journal_ref    VARCHAR(40),
    notes                               TEXT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0,
    UNIQUE (contract_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_murabaha_installment_contract_status
    ON murabaha_installments (contract_id, status);
CREATE INDEX IF NOT EXISTS idx_murabaha_installment_due_status
    ON murabaha_installments (due_date, status);
CREATE INDEX IF NOT EXISTS idx_murabaha_installment_status_due
    ON murabaha_installments (status, due_date);

-- ---------------------------------------------------------------------------
-- Additional GL accounts
-- ---------------------------------------------------------------------------

INSERT INTO chart_of_accounts (
    gl_code, gl_name, gl_category, level_number, is_header, is_postable,
    is_multi_currency, is_inter_branch, normal_balance, allow_manual_posting, requires_cost_centre, is_active,
    islamic_account_category, contract_type_code, shariah_classification, is_islamic_account,
    aaoifi_reference, aaoifi_line_item, profit_distribution_eligible, zakat_applicable,
    contra_account_code, is_reserve_account, reserve_type, created_by, created_at, updated_at
) VALUES
    ('1800-CMT-001', 'Commodity Inventory - Murabaha', 'ASSET', 1, FALSE, TRUE, TRUE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_ASSETS', 'MURABAHA', 'HALAL', TRUE, 'FAS 28', 'Commodity inventory under Murabaha', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1800-CMT-002', 'Tawarruq Settlement Account', 'ASSET', 1, FALSE, TRUE, TRUE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_ASSETS', 'MURABAHA', 'HALAL', TRUE, 'FAS 28', 'Tawarruq settlement account', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6800-MRB-001', 'Ibra Expense - Murabaha', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_EXPENSE', 'MURABAHA', 'HALAL', TRUE, 'FAS 28', 'Ibra expense', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1700-MRB-001', 'Impairment Provision - Murabaha', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_ASSETS', 'MURABAHA', 'HALAL', TRUE, 'FAS 28', 'Murabaha impairment provision', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW())
ON CONFLICT (gl_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Additional Islamic posting rules
-- ---------------------------------------------------------------------------

INSERT INTO islamic_posting_rule (
    rule_code, name, contract_type_code, transaction_type, description, entries,
    priority, enabled, effective_from, aaoifi_reference, approved_by, approved_at, rule_version, created_at, updated_at
) VALUES
    ('CMT-PURCH-001', 'Bank Commodity Purchase', 'MURABAHA', 'ASSET_ACQUISITION', 'Commodity purchase under Tawarruq',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1800-CMT-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Commodity purchase {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Commodity purchase settlement {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('CMT-SALE-001', 'Murabaha Sale to Customer', 'MURABAHA', 'OWNERSHIP_TRANSFER', 'Transfer commodity to customer at Murabaha sale',
        '[{"entryType":"DEBIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"FINANCING_RECEIVABLE_MURABAHA","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha commodity sale {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1800-CMT-001","amountExpression":"PRINCIPAL","narrationTemplate":"Commodity inventory release {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1200-MRB-002","amountExpression":"MARKUP","narrationTemplate":"Murabaha deferred profit {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('CMT-CUST-SALE-001', 'Customer Sale of Commodity', 'MURABAHA', 'ASSET_TRANSFER', 'Customer sale proceeds under Tawarruq',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Customer commodity sale cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1800-CMT-002","amountExpression":"FULL_AMOUNT","narrationTemplate":"Tawarruq settlement {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MRB-PROF-REC-001', 'Murabaha Periodic Profit Recognition', 'MURABAHA', 'PROFIT_RECOGNITION', 'Periodic Murabaha deferred profit recognition',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1200-MRB-002","amountExpression":"PROFIT","narrationTemplate":"Murabaha deferred profit release {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"MURABAHA_INCOME","amountExpression":"PROFIT","narrationTemplate":"Murabaha profit income {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MRB-IBRA-001', 'Ibra Profit Waiver', 'MURABAHA', 'EARLY_SETTLEMENT', 'Murabaha Ibra write-off on early settlement',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1200-MRB-002","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha Ibra deferred profit write-off {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6800-MRB-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha Ibra expense {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MRB-IMPAIR-001', 'Murabaha Impairment Provision', 'MURABAHA', 'IMPAIRMENT_PROVISION', 'Murabaha impairment provisioning',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6300-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha impairment expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1700-MRB-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha impairment provision {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MRB-IMPREV-001', 'Murabaha Impairment Reversal', 'MURABAHA', 'IMPAIRMENT_REVERSAL', 'Murabaha impairment reversal',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1700-MRB-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha impairment reversal {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"6300-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha impairment expense reversal {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('MRB-WOFF-001', 'Murabaha Write-Off', 'MURABAHA', 'CONTRACT_CANCELLATION', 'Murabaha write-off posting',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1700-MRB-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha write-off provision utilisation {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_CONTRACT_TYPE","accountCategory":"FINANCING_RECEIVABLE_MURABAHA","amountExpression":"FULL_AMOUNT","narrationTemplate":"Murabaha receivable write-off {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 28', 'SYSTEM', NOW(), 1, NOW(), NOW())
ON CONFLICT (rule_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Murabaha core products and templates
-- ---------------------------------------------------------------------------

INSERT INTO product (
    code, name, description, product_category, currency_code, min_opening_balance, min_operating_balance,
    max_balance, allows_overdraft, max_overdraft_limit, allows_cheque_book, allows_debit_card,
    allows_mobile, allows_internet, allows_sweep, dormancy_days, interest_bearing, base_interest_rate,
    interest_calc_method, interest_posting_frequency, interest_accrual_method, monthly_maintenance_fee,
    sms_alert_fee, gl_account_code, gl_interest_expense_code, gl_interest_payable_code, gl_fee_income_code,
    is_active, effective_from, created_by, updated_by
) VALUES
    ('MRB-HOME-SAR-001', 'Home Murabaha Financing', 'Asset-backed home Murabaha financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '1200-MRB-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MRB-AUTO-SAR-001', 'Vehicle Murabaha Financing', 'Vehicle Murabaha financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '1200-MRB-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MRB-COMM-SAR-001', 'Commodity Murabaha Financing', 'Commodity Murabaha Tawarruq product', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '1200-MRB-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MRB-EQUIP-SAR-001', 'Equipment Murabaha Financing', 'Equipment Murabaha financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '1200-MRB-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MRB-PERS-SAR-001', 'Personal Murabaha Financing', 'Personal Murabaha Tawarruq financing', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, TRUE, TRUE, FALSE, 0, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '1200-MRB-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

INSERT INTO product_template (
    template_code, template_name, product_category, interest_config, fee_config, limit_config,
    eligibility_rules, lifecycle_rules, gl_mapping, status, approved_by, approved_at, activated_at,
    template_version, created_by
) VALUES
    ('MRB-HOME-SAR-001', 'Home Murabaha Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb, '{"contract":"MURABAHA","ownershipRequired":true}'::jsonb,
        '{"financingAssetGl":"1200-MRB-001","profitIncomeGl":"5100-MRB-001","charityGl":"2300-000-001","ibraExpenseGl":"6800-MRB-001","impairmentProvisionGl":"1700-MRB-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('MRB-AUTO-SAR-001', 'Vehicle Murabaha Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb, '{"contract":"MURABAHA","ownershipRequired":true}'::jsonb,
        '{"financingAssetGl":"1200-MRB-001","profitIncomeGl":"5100-MRB-001","charityGl":"2300-000-001","ibraExpenseGl":"6800-MRB-001","impairmentProvisionGl":"1700-MRB-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('MRB-COMM-SAR-001', 'Commodity Murabaha Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb, '{"contract":"MURABAHA","ownershipRequired":true,"tawarruq":true}'::jsonb,
        '{"financingAssetGl":"1200-MRB-001","profitIncomeGl":"5100-MRB-001","charityGl":"2300-000-001","commodityInventoryGl":"1800-CMT-001","tawarruqSettlementGl":"1800-CMT-002","ibraExpenseGl":"6800-MRB-001","impairmentProvisionGl":"1700-MRB-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('MRB-EQUIP-SAR-001', 'Equipment Murabaha Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb, '{"contract":"MURABAHA","ownershipRequired":true}'::jsonb,
        '{"financingAssetGl":"1200-MRB-001","profitIncomeGl":"5100-MRB-001","charityGl":"2300-000-001","ibraExpenseGl":"6800-MRB-001","impairmentProvisionGl":"1700-MRB-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('MRB-PERS-SAR-001', 'Personal Murabaha Financing', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","CREDIT_APPROVED"]'::jsonb, '{"contract":"MURABAHA","ownershipRequired":true,"tawarruq":true}'::jsonb,
        '{"financingAssetGl":"1200-MRB-001","profitIncomeGl":"5100-MRB-001","charityGl":"2300-000-001","commodityInventoryGl":"1800-CMT-001","tawarruqSettlementGl":"1800-CMT-002","ibraExpenseGl":"6800-MRB-001","impairmentProvisionGl":"1700-MRB-001"}'::jsonb,
        'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM')
ON CONFLICT (template_code) DO NOTHING;

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method, profit_rate_type,
    profit_rate_decision_table_code, markup_rate, cost_price_required, selling_price_immutable,
    grace_period_days, late_penalty_to_charity, charity_gl_account_code, fatwa_required,
    shariah_compliance_status, shariah_rule_group_code, status, effective_from, product_version,
    min_amount, max_amount, min_tenor_months, max_tenor_months, currencies, eligible_customer_types,
    eligible_segments, financing_asset_gl, profit_income_gl, profit_expense_gl, charity_gl, tenant_id, created_by, updated_by
)
SELECT pt.id, seed.product_code, seed.name, seed.name_ar, seed.description, seed.description_ar,
       ict.id, 'FINANCING', seed.sub_category, 'COST_PLUS_MARKUP', 'TIERED',
       'MDR_MURABAHA_MARKUP_BY_TENOR', seed.markup_rate, TRUE, TRUE,
       5, TRUE, '2300-000-001', FALSE,
       'COMPLIANT', 'MURABAHA_RULES', 'ACTIVE', CURRENT_DATE, 1,
       seed.min_amount, seed.max_amount, seed.min_tenor, seed.max_tenor, '["SAR"]'::jsonb, '["INDIVIDUAL","CORPORATE","SME"]'::jsonb,
       seed.eligible_segments::jsonb, '1200-MRB-001', '5100-MRB-001', '6800-MRB-001', '2300-000-001', NULL, 'SYSTEM', 'SYSTEM'
FROM product_template pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'murabaha' AND ict.tenant_id IS NULL
JOIN (
    VALUES
        ('MRB-HOME-SAR-001', 'Home Murabaha Financing', 'تمويل المرابحة السكنية', 'Asset-backed home Murabaha financing', 'تمويل مرابحة سكني مدعوم بأصل', 'HOME', 6.2500, 100000::numeric, 50000000::numeric, 12, 240, '["RETAIL","AFFLUENT","HNW"]'),
        ('MRB-AUTO-SAR-001', 'Vehicle Murabaha Financing', 'تمويل مرابحة المركبات', 'Vehicle Murabaha financing', 'تمويل مرابحة للمركبات', 'AUTO', 6.7500, 50000::numeric, 3000000::numeric, 6, 84, '["RETAIL","AFFLUENT"]'),
        ('MRB-COMM-SAR-001', 'Commodity Murabaha Financing', 'مرابحة السلع', 'Commodity Murabaha Tawarruq product', 'منتج مرابحة السلع للتورق', 'COMMODITY', 5.9000, 25000::numeric, 10000000::numeric, 3, 60, '["RETAIL","AFFLUENT","HNW","SME"]'),
        ('MRB-EQUIP-SAR-001', 'Equipment Murabaha Financing', 'مرابحة المعدات', 'Equipment Murabaha financing', 'تمويل مرابحة للمعدات', 'EQUIPMENT', 6.4000, 75000::numeric, 20000000::numeric, 6, 120, '["SME","CORPORATE"]'),
        ('MRB-PERS-SAR-001', 'Personal Murabaha Financing', 'مرابحة شخصية', 'Personal Murabaha Tawarruq financing', 'تمويل مرابحة شخصية للتورق', 'PERSONAL', 6.1000, 10000::numeric, 1000000::numeric, 3, 60, '["RETAIL","AFFLUENT"]')
) AS seed(product_code, name, name_ar, description, description_ar, sub_category, markup_rate, min_amount, max_amount, min_tenor, max_tenor, eligible_segments)
    ON pt.template_code = seed.product_code
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = LOWER(seed.product_code)
);

-- ---------------------------------------------------------------------------
-- Murabaha markup decision table
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, category, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at,
    tenant_id, created_by, updated_by
)
SELECT
    'MDR_MURABAHA_MARKUP_BY_TENOR',
    'Murabaha markup by tenor and amount',
    'هامش ربح المرابحة حسب المدة والمبلغ',
    'Murabaha markup lookup by tenor band, amount tier, and customer segment',
    'PRICING', 'MURABAHA_MARKUP', 'CALCULATION', 'INFORMATIONAL',
    'decisionTable("MDR_MURABAHA_MARKUP_BY_TENOR")',
    '{}'::jsonb,
    'No Murabaha markup tier matched the supplied inputs',
    '["MURABAHA"]'::jsonb,
    '["lending","productfactory"]'::jsonb,
    CURRENT_DATE, 'ACTIVE', 10, 'ST-002/ST-003', 'SYSTEM', NOW(),
    NULL, 'SYSTEM', 'SYSTEM'
WHERE NOT EXISTS (
    SELECT 1 FROM business_rule WHERE rule_code = 'MDR_MURABAHA_MARKUP_BY_TENOR' AND tenant_id IS NULL
);

INSERT INTO decision_table (
    rule_id, table_name, description, input_columns, output_columns,
    hit_policy, status, table_version, tenant_id, created_by, updated_by
)
SELECT br.id,
       'MDR_MURABAHA_MARKUP_BY_TENOR',
       'Murabaha markup bands by tenor, amount, and segment',
       '[{"name":"tenor_months","type":"INTEGER_RANGE"},{"name":"amount","type":"DECIMAL_RANGE"},{"name":"customer_segment","type":"STRING"}]'::jsonb,
       '[{"name":"markup_rate","type":"DECIMAL"}]'::jsonb,
       'FIRST_MATCH', 'ACTIVE', 1, NULL, 'SYSTEM', 'SYSTEM'
FROM business_rule br
WHERE br.rule_code = 'MDR_MURABAHA_MARKUP_BY_TENOR'
  AND br.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM decision_table dt WHERE dt.rule_id = br.id AND dt.table_name = 'MDR_MURABAHA_MARKUP_BY_TENOR'
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
        (1, '[{"from":1,"to":12},{"from":0,"to":500000},{"value":"*"}]', '[{"value":5.75}]', 'Short tenor standard retail', 1),
        (2, '[{"from":1,"to":12},{"from":500001,"to":5000000},{"value":"*"}]', '[{"value":5.50}]', 'Short tenor larger ticket', 2),
        (3, '[{"from":13,"to":36},{"from":0,"to":500000},{"value":"*"}]', '[{"value":6.10}]', 'Medium tenor standard retail', 3),
        (4, '[{"from":13,"to":36},{"from":500001,"to":5000000},{"value":"*"}]', '[{"value":5.90}]', 'Medium tenor larger ticket', 4),
        (5, '[{"from":37,"to":84},{"from":0,"to":5000000},{"value":"SME"}]', '[{"value":6.40}]', 'Long tenor SME', 5),
        (6, '[{"from":37,"to":240},{"from":500001,"to":50000000},{"value":"HNW"}]', '[{"value":5.25}]', 'Long tenor HNW home financing', 6)
) AS seed(row_number, input_values, output_values, description, priority)
  ON TRUE
WHERE dt.table_name = 'MDR_MURABAHA_MARKUP_BY_TENOR'
  AND NOT EXISTS (
      SELECT 1 FROM decision_table_row dtr WHERE dtr.decision_table_id = dt.id AND dtr.row_number = seed.row_number
  );
