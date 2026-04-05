-- ============================================================================
-- V100__islamic_fee_engine.sql
-- Islamic Fee & Charges Engine
-- NOTE: V91 and V99 are already occupied in this repository; this migration uses V100.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Capability 1: Islamic fee configuration extension
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_fee_configurations (
    id                                      BIGSERIAL PRIMARY KEY,
    base_fee_id                             BIGINT REFERENCES fee_definition(id),
    fee_code                                VARCHAR(30) NOT NULL UNIQUE,
    name                                    VARCHAR(200) NOT NULL,
    name_ar                                 VARCHAR(200),
    description                             TEXT,
    description_ar                          TEXT,
    shariah_classification                  VARCHAR(40) NOT NULL CHECK (shariah_classification IN (
                                                'UJRAH_PERMISSIBLE',
                                                'UJRAH_COST_RECOVERY',
                                                'PENALTY_CHARITY',
                                                'WAKALAH_FEE',
                                                'COMMITMENT_FEE_RESTRICTED',
                                                'TAKAFUL_CONTRIBUTION',
                                                'PROHIBITED'
                                            )),
    shariah_justification                   TEXT,
    shariah_justification_ar                TEXT,
    shariah_reference                       VARCHAR(255),
    ssb_approved                            BOOLEAN NOT NULL DEFAULT FALSE,
    ssb_approval_date                       DATE,
    ssb_approval_ref                        VARCHAR(100),
    fee_type                                VARCHAR(30) NOT NULL CHECK (fee_type IN (
                                                'FLAT',
                                                'PERCENTAGE',
                                                'TIERED_FLAT',
                                                'TIERED_PERCENTAGE',
                                                'FORMULA'
                                            )),
    flat_amount                             NUMERIC(18,2),
    percentage_rate                         NUMERIC(18,6),
    minimum_amount                          NUMERIC(18,2),
    maximum_amount                          NUMERIC(18,2),
    tier_decision_table_code                VARCHAR(120),
    formula_expression                      TEXT,
    applicable_contract_types               JSONB NOT NULL DEFAULT '[]'::jsonb,
    applicable_product_codes                JSONB NOT NULL DEFAULT '[]'::jsonb,
    applicable_transaction_types            JSONB NOT NULL DEFAULT '[]'::jsonb,
    fee_category                            VARCHAR(40) NOT NULL CHECK (fee_category IN (
                                                'ACCOUNT_OPENING',
                                                'ACCOUNT_MAINTENANCE',
                                                'DOCUMENTATION',
                                                'PROCESSING',
                                                'VALUATION',
                                                'INSURANCE_ADMIN',
                                                'CHEQUE_BOOK',
                                                'CARD_ISSUANCE',
                                                'CARD_REPLACEMENT',
                                                'WIRE_TRANSFER',
                                                'STANDING_ORDER',
                                                'STATEMENT_REQUEST',
                                                'EARLY_SETTLEMENT',
                                                'LATE_PAYMENT',
                                                'RETURNED_CHEQUE',
                                                'RESTRUCTURING',
                                                'LEGAL_COLLECTION',
                                                'CERTIFICATE_ISSUANCE',
                                                'SAFE_DEPOSIT_BOX',
                                                'OTHER'
                                            )),
    charge_frequency                        VARCHAR(20) NOT NULL CHECK (charge_frequency IN (
                                                'ONE_TIME','MONTHLY','QUARTERLY','ANNUALLY','PER_TRANSACTION','ON_EVENT'
                                            )),
    charge_timing                           VARCHAR(20) NOT NULL CHECK (charge_timing IN (
                                                'AT_INCEPTION','AT_DISBURSEMENT','PERIODIC','AT_MATURITY','AT_EVENT'
                                            )),
    income_gl_account                       VARCHAR(20),
    is_charity_routed                       BOOLEAN NOT NULL DEFAULT FALSE,
    charity_gl_account                      VARCHAR(20),
    percentage_of_financing_prohibited      BOOLEAN NOT NULL DEFAULT FALSE,
    compounding_prohibited                  BOOLEAN NOT NULL DEFAULT TRUE,
    maximum_as_percent_of_financing         NUMERIC(10,4),
    annual_penalty_cap_amount               NUMERIC(18,2),
    status                                  VARCHAR(30) NOT NULL CHECK (status IN (
                                                'ACTIVE','INACTIVE','PENDING_SSB_APPROVAL','SUSPENDED'
                                            )),
    effective_from                          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to                            DATE,
    tenant_id                               BIGINT,
    created_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                              VARCHAR(100),
    updated_by                              VARCHAR(100),
    version                                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_fee_cfg_class_status
    ON islamic_fee_configurations (shariah_classification, status);
CREATE INDEX IF NOT EXISTS idx_islamic_fee_cfg_category_status
    ON islamic_fee_configurations (fee_category, status);
CREATE INDEX IF NOT EXISTS idx_islamic_fee_cfg_contract_types
    ON islamic_fee_configurations USING gin (applicable_contract_types);
CREATE INDEX IF NOT EXISTS idx_islamic_fee_cfg_product_codes
    ON islamic_fee_configurations USING gin (applicable_product_codes);

-- ---------------------------------------------------------------------------
-- Capability 2: Late penalty records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS late_penalty_records (
    id                                      BIGSERIAL PRIMARY KEY,
    contract_id                             BIGINT NOT NULL,
    contract_ref                            VARCHAR(50) NOT NULL,
    contract_type_code                      VARCHAR(30) NOT NULL,
    customer_id                             BIGINT,
    installment_id                          BIGINT NOT NULL,
    penalty_date                            DATE NOT NULL,
    overdue_amount                          NUMERIC(18,2) NOT NULL,
    days_overdue                            INT NOT NULL,
    penalty_amount                          NUMERIC(18,2) NOT NULL,
    fee_config_id                           BIGINT NOT NULL REFERENCES islamic_fee_configurations(id),
    calculation_method                      TEXT,
    journal_ref                             VARCHAR(50),
    fee_charge_log_id                       BIGINT REFERENCES fee_charge_log(id),
    charity_fund_entry_id                   BIGINT,
    status                                  VARCHAR(20) NOT NULL CHECK (status IN ('CHARGED','REVERSED','WAIVED')),
    reversed_at                             TIMESTAMP WITH TIME ZONE,
    reversal_reason                         TEXT,
    reversal_journal_ref                    VARCHAR(50),
    tenant_id                               BIGINT,
    created_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                              VARCHAR(100),
    updated_by                              VARCHAR(100),
    version                                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_late_penalty_contract_installment
    ON late_penalty_records (contract_id, installment_id);
CREATE INDEX IF NOT EXISTS idx_late_penalty_contract_status
    ON late_penalty_records (contract_id, status);
CREATE INDEX IF NOT EXISTS idx_late_penalty_penalty_date
    ON late_penalty_records (penalty_date);
CREATE INDEX IF NOT EXISTS idx_late_penalty_customer
    ON late_penalty_records (customer_id, penalty_date DESC);

-- ---------------------------------------------------------------------------
-- Capability 3: Charity fund ledger and batch disbursement
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS charity_fund_ledger_entries (
    id                                      BIGSERIAL PRIMARY KEY,
    entry_ref                               VARCHAR(50) NOT NULL UNIQUE,
    entry_type                              VARCHAR(20) NOT NULL CHECK (entry_type IN ('INFLOW','OUTFLOW','REVERSAL','ADJUSTMENT')),
    entry_date                              DATE NOT NULL,
    amount                                  NUMERIC(18,2) NOT NULL,
    currency_code                           VARCHAR(3) NOT NULL,
    running_balance                         NUMERIC(18,2) NOT NULL,
    source_type                             VARCHAR(30) CHECK (source_type IN ('LATE_PAYMENT_PENALTY','SNCI_PURIFICATION','HIBAH_REVERSAL','OTHER')),
    source_reference                        VARCHAR(100),
    source_contract_ref                     VARCHAR(50),
    source_contract_type                    VARCHAR(30),
    source_customer_id                      BIGINT,
    destination_type                        VARCHAR(30) CHECK (destination_type IN ('CHARITY_DISBURSEMENT','REVERSAL','REGULATORY_TRANSFER')),
    destination_reference                   VARCHAR(100),
    charity_recipient_id                    BIGINT REFERENCES charity_recipient(id),
    charity_recipient_name                  VARCHAR(200),
    journal_ref                             VARCHAR(50),
    notes                                   TEXT,
    tenant_id                               BIGINT,
    created_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                              VARCHAR(100),
    updated_by                              VARCHAR(100),
    version                                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_charity_ledger_type_date
    ON charity_fund_ledger_entries (entry_type, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_charity_ledger_source_date
    ON charity_fund_ledger_entries (source_type, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_charity_ledger_contract_ref
    ON charity_fund_ledger_entries (source_contract_ref);

CREATE TABLE IF NOT EXISTS charity_fund_batch_disbursements (
    id                                      BIGSERIAL PRIMARY KEY,
    batch_ref                               VARCHAR(50) NOT NULL UNIQUE,
    period_from                             DATE,
    period_to                               DATE,
    total_amount                            NUMERIC(18,2) NOT NULL,
    disbursement_count                      INT NOT NULL DEFAULT 0,
    status                                  VARCHAR(30) NOT NULL CHECK (status IN (
                                                'DRAFT','PENDING_APPROVAL','APPROVED','PROCESSING','COMPLETED','CANCELLED'
                                            )),
    allocation_method                       VARCHAR(40) NOT NULL CHECK (allocation_method IN (
                                                'EQUAL_SPLIT','PROPORTIONAL_BY_CATEGORY','MANUAL'
                                            )),
    allocations                             JSONB NOT NULL DEFAULT '[]'::jsonb,
    approved_by                             VARCHAR(100),
    approved_at                             TIMESTAMP WITH TIME ZONE,
    executed_at                             TIMESTAMP WITH TIME ZONE,
    executed_by                             VARCHAR(100),
    tenant_id                               BIGINT,
    created_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                              VARCHAR(100),
    updated_by                              VARCHAR(100),
    version                                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_charity_batch_status
    ON charity_fund_batch_disbursements (status);

-- ---------------------------------------------------------------------------
-- Capability 5: Fee waivers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_fee_waivers (
    id                                      BIGSERIAL PRIMARY KEY,
    waiver_ref                              VARCHAR(50) NOT NULL UNIQUE,
    fee_config_id                           BIGINT NOT NULL REFERENCES islamic_fee_configurations(id),
    fee_charge_log_id                       BIGINT REFERENCES fee_charge_log(id),
    contract_id                             BIGINT,
    account_id                              BIGINT REFERENCES account(id),
    customer_id                             BIGINT NOT NULL,
    original_fee_amount                     NUMERIC(18,2) NOT NULL,
    waived_amount                           NUMERIC(18,2) NOT NULL,
    remaining_amount                        NUMERIC(18,2) NOT NULL,
    currency_code                           VARCHAR(3) NOT NULL,
    waiver_type                             VARCHAR(20) NOT NULL CHECK (waiver_type IN ('FULL_WAIVER','PARTIAL_WAIVER','DEFERRAL','CONVERSION')),
    reason                                  VARCHAR(30) NOT NULL CHECK (reason IN (
                                                'CUSTOMER_HARDSHIP',
                                                'RELATIONSHIP_GOODWILL',
                                                'BANK_ERROR',
                                                'SYSTEM_ERROR',
                                                'FIRST_OCCURRENCE',
                                                'PROMOTIONAL',
                                                'SHARIAH_REVIEW',
                                                'REGULATORY_DIRECTION',
                                                'OTHER'
                                            )),
    justification_detail                    TEXT,
    shariah_implication                     TEXT,
    affects_charity_fund                    BOOLEAN NOT NULL DEFAULT FALSE,
    affects_pool_income                     BOOLEAN NOT NULL DEFAULT FALSE,
    deferred_until                          DATE,
    converted_fee_code                      VARCHAR(30),
    status                                  VARCHAR(20) NOT NULL CHECK (status IN (
                                                'DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','APPLIED','CANCELLED'
                                            )),
    requested_by                            VARCHAR(100) NOT NULL,
    requested_at                            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_by                             VARCHAR(100),
    approved_at                             TIMESTAMP WITH TIME ZONE,
    rejected_by                             VARCHAR(100),
    rejection_reason                        TEXT,
    applied_at                              TIMESTAMP WITH TIME ZONE,
    applied_by                              VARCHAR(100),
    journal_ref                             VARCHAR(50),
    authority_level                         VARCHAR(20) NOT NULL CHECK (authority_level IN (
                                                'OFFICER','BRANCH_MANAGER','REGIONAL_MANAGER','HEAD_OFFICE'
                                            )),
    tenant_id                               BIGINT,
    created_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                              VARCHAR(100),
    updated_by                              VARCHAR(100),
    version                                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_fee_waiver_customer_status
    ON islamic_fee_waivers (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_islamic_fee_waiver_contract
    ON islamic_fee_waivers (contract_id);
CREATE INDEX IF NOT EXISTS idx_islamic_fee_waiver_status_authority
    ON islamic_fee_waivers (status, authority_level);

-- ---------------------------------------------------------------------------
-- Extend existing fee charge log instead of creating a parallel charge log
-- ---------------------------------------------------------------------------

ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS journal_ref VARCHAR(50);
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS islamic_fee_configuration_id BIGINT;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS charity_routed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS charity_fund_entry_id BIGINT;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS contract_id BIGINT;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS contract_type_code VARCHAR(30);
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS installment_id BIGINT;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS receivable_balance NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS deferred_total_amount NUMERIC(18,2);
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS deferred_remaining_amount NUMERIC(18,2);
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS recognised_deferred_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS deferral_months INT;
ALTER TABLE fee_charge_log ADD COLUMN IF NOT EXISTS last_deferred_recognition_date DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_fee_charge_log_islamic_fee_cfg'
          AND table_name = 'fee_charge_log'
    ) THEN
        ALTER TABLE fee_charge_log
            ADD CONSTRAINT fk_fee_charge_log_islamic_fee_cfg
            FOREIGN KEY (islamic_fee_configuration_id) REFERENCES islamic_fee_configurations(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_fee_charge_log_charity_ledger'
          AND table_name = 'fee_charge_log'
    ) THEN
        ALTER TABLE fee_charge_log
            ADD CONSTRAINT fk_fee_charge_log_charity_ledger
            FOREIGN KEY (charity_fund_entry_id) REFERENCES charity_fund_ledger_entries(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_charge_log_islamic_cfg
    ON fee_charge_log (islamic_fee_configuration_id);
CREATE INDEX IF NOT EXISTS idx_fee_charge_log_contract_installment
    ON fee_charge_log (contract_id, installment_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_late_penalty_charity_ledger'
          AND table_name = 'late_penalty_records'
    ) THEN
        ALTER TABLE late_penalty_records
            ADD CONSTRAINT fk_late_penalty_charity_ledger
            FOREIGN KEY (charity_fund_entry_id) REFERENCES charity_fund_ledger_entries(id);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Seed GL accounts
-- ---------------------------------------------------------------------------

INSERT INTO chart_of_accounts (
    gl_code, gl_name, gl_category, level_number, is_header, is_postable, is_multi_currency,
    is_inter_branch, normal_balance, allow_manual_posting, requires_cost_centre, is_active,
    islamic_account_category, contract_type_code, shariah_classification, is_islamic_account,
    aaoifi_reference, aaoifi_line_item, profit_distribution_eligible, zakat_applicable,
    contra_account_code, is_reserve_account, reserve_type, created_by, created_at, updated_at
) VALUES
    ('5500-FEE-001', 'Ujrah Fee Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_INCOME', NULL, 'HALAL', TRUE, 'FAS 1', 'Islamic fee income', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('5500-FEE-002', 'Wakalah Fee Income', 'INCOME', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'WAKALAH_FEE_INCOME', 'WAKALAH', 'HALAL', TRUE, 'FAS 1', 'Wakalah fee income', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1630-FEE-001', 'Fee Receivable - Islamic Products', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_ASSETS', NULL, 'HALAL', TRUE, 'FAS 1', 'Fee receivable', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('2400-FEE-001', 'Deferred Fee Income - Islamic Products', 'LIABILITY', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_LIABILITIES', NULL, 'HALAL', TRUE, 'FAS 1', 'Deferred fee income', FALSE, FALSE, NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW())
ON CONFLICT (gl_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed base fee definitions reused by the Islamic extension
-- ---------------------------------------------------------------------------

INSERT INTO fee_definition (
    fee_code, fee_name, fee_category, trigger_event, calculation_type, flat_amount, percentage,
    min_fee, max_fee, currency_code, tier_config, applicable_products, applicable_channels,
    applicable_customer_types, tax_applicable, tax_rate, fee_income_gl_code, tax_gl_code,
    waivable, waiver_authority_level, is_active, effective_from, created_by, updated_by
) VALUES
    ('IJR-FEE-DOC-001', 'Documentation Fee', 'SERVICE_CHARGE', 'CONTRACT_INCEPTION', 'FLAT', 500.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MRB-FEE-DOC-001', 'Murabaha Documentation Fee', 'SERVICE_CHARGE', 'CONTRACT_INCEPTION', 'FLAT', 750.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MSH-FEE-DOC-001', 'Musharakah Documentation Fee', 'SERVICE_CHARGE', 'CONTRACT_INCEPTION', 'FLAT', 1000.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'BRANCH_MANAGER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-MAINT-001', 'Account Maintenance Fee', 'ACCOUNT_MAINTENANCE', 'ACCOUNT_MAINTENANCE', 'FLAT', 25.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-STMT-001', 'Statement Request Fee', 'STATEMENT', 'STATEMENT_REQUEST', 'FLAT', 15.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-CHQ-001', 'Cheque Book Issuance Fee', 'CHEQUE', 'CHEQUE_BOOK_ISSUANCE', 'FLAT', 50.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-WIRE-001', 'Wire Transfer Fee', 'SWIFT', 'WIRE_TRANSFER', 'TIERED', NULL, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-CARD-001', 'Debit Card Issuance Fee', 'CARD', 'CARD_ISSUANCE', 'FLAT', 100.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('MRB-FEE-VALUATION-001', 'Property Valuation Fee', 'SERVICE_CHARGE', 'VALUATION', 'FLAT', 2000.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'BRANCH_MANAGER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-LATE-001', 'Late Payment Charge - Flat', 'PENALTY', 'LATE_PAYMENT', 'FLAT', 200.00, NULL, NULL, 5000.00, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '2300-000-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-LATE-002', 'Late Payment Charge - Percentage', 'PENALTY', 'LATE_PAYMENT', 'PERCENTAGE', NULL, 1.0000, NULL, 5000.00, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '2300-000-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-RETCQ-001', 'Returned Cheque Fee', 'PENALTY', 'RETURNED_CHEQUE', 'FLAT', 100.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('PROHIBITED-001', 'Compound Late Penalty', 'PENALTY', 'LATE_PAYMENT', 'PERCENTAGE', NULL, 1.0000, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '2300-000-001', NULL, FALSE, 'HEAD_OFFICE', FALSE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('PROHIBITED-002', 'Facility Commitment Fee (Percentage of Undrawn)', 'LOAN_PROCESSING', 'UNDRAWN_FACILITY', 'PERCENTAGE', NULL, 1.0000, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, FALSE, 'HEAD_OFFICE', FALSE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('GEN-FEE-CERT-001', 'Certificate Issuance Fee', 'SERVICE_CHARGE', 'CERTIFICATE_ISSUANCE', 'FLAT', 40.00, NULL, NULL, NULL, 'SAR', '[]'::jsonb, 'ALL', 'ALL', 'ALL', FALSE, 0, '5500-FEE-001', NULL, TRUE, 'OFFICER', TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM')
ON CONFLICT (fee_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed Islamic fee configurations
-- ---------------------------------------------------------------------------

INSERT INTO islamic_fee_configurations (
    base_fee_id, fee_code, name, name_ar, description, description_ar,
    shariah_classification, shariah_justification, shariah_justification_ar, shariah_reference,
    ssb_approved, ssb_approval_date, ssb_approval_ref, fee_type, flat_amount, percentage_rate,
    minimum_amount, maximum_amount, tier_decision_table_code, formula_expression,
    applicable_contract_types, applicable_product_codes, applicable_transaction_types,
    fee_category, charge_frequency, charge_timing, income_gl_account, is_charity_routed,
    charity_gl_account, percentage_of_financing_prohibited, compounding_prohibited,
    maximum_as_percent_of_financing, annual_penalty_cap_amount, status, effective_from,
    tenant_id, created_by, updated_by
)
SELECT fd.id, seed.fee_code, seed.name, seed.name_ar, seed.description, seed.description_ar,
       seed.shariah_classification, seed.shariah_justification, seed.shariah_justification_ar, seed.shariah_reference,
    seed.ssb_approved::boolean, CURRENT_DATE, 'SSB-SEED-2026', seed.fee_type,
    seed.flat_amount::numeric, seed.percentage_rate::numeric,
    seed.minimum_amount::numeric, seed.maximum_amount::numeric,
    seed.tier_decision_table_code, seed.formula_expression,
       seed.applicable_contract_types::jsonb, seed.applicable_product_codes::jsonb, seed.applicable_transaction_types::jsonb,
    seed.fee_category, seed.charge_frequency, seed.charge_timing, seed.income_gl_account,
    seed.is_charity_routed::boolean, seed.charity_gl_account,
    seed.percentage_of_financing_prohibited::boolean, TRUE,
    seed.maximum_as_percent_of_financing::numeric, seed.annual_penalty_cap_amount::numeric, seed.status, CURRENT_DATE,
       NULL, 'SYSTEM', 'SYSTEM'
FROM fee_definition fd
JOIN (
    VALUES
        ('IJR-FEE-DOC-001','Documentation Fee','رسوم التوثيق','Fee for preparation and registration of lease documentation','رسوم إعداد وتسجيل مستندات الإجارة','UJRAH_PERMISSIBLE','Fee for preparation and registration of lease documentation','رسوم إعداد وتسجيل المستندات','AAOIFI FAS 8',TRUE::boolean,'FLAT',500.00,NULL::numeric,NULL::numeric,NULL::numeric,NULL,NULL,'["IJARAH"]','[]','["DISBURSEMENT"]','DOCUMENTATION','ONE_TIME','AT_INCEPTION','5500-FEE-001',FALSE::boolean,NULL,TRUE::boolean,1.0000,NULL::numeric,'ACTIVE'),
        ('MRB-FEE-DOC-001','Murabaha Documentation Fee','رسوم توثيق المرابحة','Fee for Murabaha documentation and registration','رسوم توثيق وتسجيل المرابحة','UJRAH_PERMISSIBLE','Flat fee for Murabaha documentation work','رسوم ثابتة لأعمال توثيق المرابحة','AAOIFI FAS 28',TRUE,'FLAT',750.00,NULL,NULL,NULL,NULL,NULL,'["MURABAHA"]','[]','["DISBURSEMENT"]','DOCUMENTATION','ONE_TIME','AT_INCEPTION','5500-FEE-001',FALSE,NULL,TRUE,1.0000,NULL,'ACTIVE'),
        ('MSH-FEE-DOC-001','Musharakah Documentation Fee','رسوم توثيق المشاركة','Fee for partnership agreement, registration, and title deed preparation','رسوم إعداد عقد المشاركة والتسجيل والصك','UJRAH_PERMISSIBLE','Fee for partnership agreement, joint registration, title deed preparation','رسوم عقد المشاركة والتسجيل والصك','AAOIFI FAS 4',TRUE,'FLAT',1000.00,NULL,NULL,NULL,NULL,NULL,'["MUSHARAKAH"]','[]','["DISBURSEMENT"]','DOCUMENTATION','ONE_TIME','AT_INCEPTION','5500-FEE-001',FALSE,NULL,TRUE,1.0000,NULL,'ACTIVE'),
        ('GEN-FEE-MAINT-001','Account Maintenance Fee','رسوم صيانة الحساب','Periodic account maintenance fee for Islamic products','رسوم دورية لصيانة الحسابات الإسلامية','UJRAH_PERMISSIBLE','Periodic fee for ongoing account servicing','رسوم دورية لخدمة الحساب','AAOIFI FAS 1',TRUE,'FLAT',25.00,NULL,NULL,NULL,NULL,NULL,'["ALL"]','[]','["ACCOUNT_MAINTENANCE"]','ACCOUNT_MAINTENANCE','MONTHLY','PERIODIC','5500-FEE-001',FALSE,NULL,TRUE,0.5000,NULL,'ACTIVE'),
        ('GEN-FEE-STMT-001','Statement Request Fee','رسوم طلب كشف حساب','Cost recovery for ad hoc statement generation','رسوم استرداد تكلفة طلب كشف الحساب','UJRAH_COST_RECOVERY','Actual cost of ad hoc statement generation','استرداد التكلفة الفعلية','AAOIFI FAS 1',TRUE,'FLAT',15.00,NULL,NULL,NULL,NULL,NULL,'["ALL"]','[]','["STATEMENT_REQUEST"]','STATEMENT_REQUEST','PER_TRANSACTION','AT_EVENT','5500-FEE-001',FALSE,NULL,TRUE,0.2000,NULL,'ACTIVE'),
        ('GEN-FEE-CHQ-001','Cheque Book Issuance Fee','رسوم إصدار دفتر شيكات','Cheque book issuance service fee','رسوم خدمة إصدار دفتر الشيكات','UJRAH_PERMISSIBLE','Fee for cheque book printing and issuance','رسوم طباعة وإصدار دفتر الشيكات','AAOIFI FAS 1',TRUE,'FLAT',50.00,NULL,NULL,NULL,NULL,NULL,'["WADIAH","ALL"]','[]','["CHEQUE_BOOK_ISSUANCE"]','CHEQUE_BOOK','ON_EVENT','AT_EVENT','5500-FEE-001',FALSE,NULL,TRUE,0.2000,NULL,'ACTIVE'),
        ('GEN-FEE-WIRE-001','Wire Transfer Fee','رسوم التحويل البنكي','Tiered wire transfer service fee','رسوم خدمة التحويل البنكي حسب الشرائح','UJRAH_PERMISSIBLE','Fee varies by transfer service complexity and corridor','رسوم تختلف بحسب تعقيد الخدمة والمسار','AAOIFI FAS 1',TRUE,'TIERED_FLAT',NULL,NULL,NULL,NULL,'ISLAMIC_WIRE_TRANSFER_FEE_TIERS',NULL,'["ALL"]','[]','["WIRE_TRANSFER"]','WIRE_TRANSFER','PER_TRANSACTION','AT_EVENT','5500-FEE-001',FALSE,NULL,TRUE,0.2000,NULL,'ACTIVE'),
        ('GEN-FEE-CARD-001','Debit Card Issuance Fee','رسوم إصدار بطاقة خصم','Debit card issuance fee','رسوم إصدار بطاقة الخصم','UJRAH_PERMISSIBLE','Fee for card production and issuance services','رسوم إنتاج وإصدار البطاقة','AAOIFI FAS 1',TRUE,'FLAT',100.00,NULL,NULL,NULL,NULL,NULL,'["ALL"]','[]','["CARD_ISSUANCE"]','CARD_ISSUANCE','ONE_TIME','AT_EVENT','5500-FEE-001',FALSE,NULL,TRUE,0.2000,NULL,'ACTIVE'),
        ('MRB-FEE-VALUATION-001','Property Valuation Fee','رسوم تقييم العقار','Actual cost of independent property valuation passed to customer','تمرير التكلفة الفعلية لتقييم العقار','UJRAH_COST_RECOVERY','Actual cost of independent property valuation passed to customer','استرداد تكلفة التقييم الفعلية','AAOIFI FAS 28',TRUE,'FLAT',2000.00,NULL,NULL,NULL,NULL,NULL,'["MURABAHA","MUSHARAKAH"]','[]','["VALUATION"]','VALUATION','ONE_TIME','AT_DISBURSEMENT','5500-FEE-001',FALSE,NULL,TRUE,0.5000,NULL,'ACTIVE'),
        ('GEN-FEE-LATE-001','Late Payment Charge - Flat','رسوم تأخير ثابتة','Flat late payment penalty routed to charity','رسوم تأخير ثابتة تذهب للأعمال الخيرية','PENALTY_CHARITY','Deterrent only; proceeds must be routed to charity','للردع فقط ويجب تحويلها للأعمال الخيرية','ST-009',TRUE,'FLAT',200.00,NULL,NULL,5000.00,NULL,NULL,'["ALL"]','[]','["LATE_PAYMENT"]','LATE_PAYMENT','ON_EVENT','AT_EVENT','2300-000-001',TRUE,'2300-000-001',FALSE,NULL,5000.00,'ACTIVE'),
        ('GEN-FEE-LATE-002','Late Payment Charge - Percentage','رسوم تأخير بنسبة','Percentage late payment penalty on overdue amount routed to charity','رسوم تأخير بنسبة من المبلغ المتأخر وتذهب للأعمال الخيرية','PENALTY_CHARITY','Percentage applies to overdue amount only, never financing principal','النسبة على المبلغ المتأخر فقط وليس أصل التمويل','ST-009',TRUE,'PERCENTAGE',NULL,1.0000,NULL,5000.00,NULL,NULL,'["ALL"]','[]','["LATE_PAYMENT"]','LATE_PAYMENT','ON_EVENT','AT_EVENT','2300-000-001',TRUE,'2300-000-001',FALSE,NULL,5000.00,'ACTIVE'),
        ('GEN-FEE-RETCQ-001','Returned Cheque Fee','رسوم الشيك المرتجع','Actual processing cost of returned cheque','تكلفة معالجة فعلية للشيك المرتجع','UJRAH_COST_RECOVERY','Covers actual bank processing cost for returned cheque','يغطي التكلفة الفعلية لمعالجة الشيك المرتجع','AAOIFI FAS 1',TRUE,'FLAT',100.00,NULL,NULL,NULL,NULL,NULL,'["ALL"]','[]','["RETURNED_CHEQUE"]','RETURNED_CHEQUE','ON_EVENT','AT_EVENT','5500-FEE-001',FALSE,NULL,TRUE,0.2000,NULL,'ACTIVE'),
        ('PROHIBITED-001','Compound Late Penalty','غرامة تأخير مركبة','Charging penalty on unpaid penalty - prohibited as riba','غرامة على غرامة غير مدفوعة - محظورة شرعاً','PROHIBITED','Compound penalties constitute riba','الغرامات المركبة ربا','ST-009',FALSE,'PERCENTAGE',NULL,1.0000,NULL,NULL,NULL,NULL,'["ALL"]','[]','["LATE_PAYMENT"]','LATE_PAYMENT','ON_EVENT','AT_EVENT','2300-000-001',TRUE,'2300-000-001',FALSE,NULL,NULL,'INACTIVE'),
        ('PROHIBITED-002','Facility Commitment Fee (Percentage of Undrawn)','رسوم التزام على غير المسحوب','Charging percentage of undrawn facility is restricted and requires specific fatwa','رسوم نسبة على الجزء غير المسحوب تتطلب فتوى خاصة','COMMITMENT_FEE_RESTRICTED','Majority Shariah view restricts charging on undrawn facilities','الرأي الغالب يقيد الرسوم على غير المسحوب','AAOIFI governance note',FALSE,'PERCENTAGE',NULL,1.0000,NULL,NULL,NULL,NULL,'["ALL"]','[]','["UNDRAWN_FACILITY"]','PROCESSING','ON_EVENT','AT_EVENT','5500-FEE-001',FALSE,NULL,TRUE,NULL,NULL,'INACTIVE'),
        ('GEN-FEE-CERT-001','Certificate Issuance Fee','رسوم إصدار شهادة','Fee for issuing bank certificates and confirmations','رسوم إصدار الشهادات البنكية','UJRAH_PERMISSIBLE','Fee for certificate drafting and issuance work','رسوم إعداد وإصدار الشهادة','AAOIFI FAS 1',TRUE,'FLAT',40.00,NULL,NULL,NULL,NULL,NULL,'["ALL"]','[]','["CERTIFICATE_ISSUANCE"]','CERTIFICATE_ISSUANCE','ON_EVENT','AT_EVENT','5500-FEE-001',FALSE,NULL,TRUE,0.2000,NULL,'ACTIVE')
) AS seed(
    fee_code, name, name_ar, description, description_ar,
    shariah_classification, shariah_justification, shariah_justification_ar, shariah_reference,
    ssb_approved, fee_type, flat_amount, percentage_rate, minimum_amount, maximum_amount,
    tier_decision_table_code, formula_expression, applicable_contract_types,
    applicable_product_codes, applicable_transaction_types, fee_category,
    charge_frequency, charge_timing, income_gl_account, is_charity_routed,
    charity_gl_account, percentage_of_financing_prohibited,
    maximum_as_percent_of_financing, annual_penalty_cap_amount, status
)
    ON seed.fee_code = fd.fee_code
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_fee_configurations cfg WHERE cfg.fee_code = seed.fee_code
);

-- ---------------------------------------------------------------------------
-- Seed Shariah business rules
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, category, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at,
    tenant_id, created_by, updated_by
)
VALUES
    ('SHARIAH-FEE-001', 'Late penalties must be routed to charity (ST-009)', 'يجب توجيه غرامات التأخير للأعمال الخيرية',
        'Late payment penalties in Islamic finance must be routed to charity and never retained as bank income',
        'SHARIAH_COMPLIANCE', 'ISLAMIC_FEES', 'CONSTRAINT', 'BLOCKING',
        '#fee.charityRouted == true', '{"charityGlAccount":"2300-000-001"}'::jsonb,
        'Late payment penalties must route to the Charity Fund', '["MURABAHA","IJARAH","MUSHARAKAH","ALL"]'::jsonb,
        '["fees","financing"]'::jsonb, CURRENT_DATE, 'ACTIVE', 60, 'ST-009', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-FEE-002', 'Fee compounding prohibited', 'يحظر تراكم الرسوم',
        'Charging a fee or penalty on an unpaid fee is prohibited as a form of riba',
        'SHARIAH_COMPLIANCE', 'ISLAMIC_FEES', 'CONSTRAINT', 'BLOCKING',
        '#fee.compoundingAllowed == false', '{}'::jsonb,
        'Compounding fees are prohibited under Shariah', '["ALL"]'::jsonb,
        '["fees","financing"]'::jsonb, CURRENT_DATE, 'ACTIVE', 61, 'ST-009', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-FEE-003', 'Fees must represent actual service (Ujrah)', 'يجب أن تمثل الرسوم خدمة فعلية',
        'Islamic fees must represent genuine documented services rather than disguised interest',
        'SHARIAH_COMPLIANCE', 'ISLAMIC_FEES', 'VALIDATION', 'BLOCKING',
        '#fee.shariahJustification != null', '{}'::jsonb,
        'Islamic fee must have documented Ujrah justification', '["ALL"]'::jsonb,
        '["fees","product"]'::jsonb, CURRENT_DATE, 'ACTIVE', 62, 'ST-009', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-FEE-004', 'Prohibited fee types cannot be charged', 'لا يجوز فرض الرسوم المحظورة',
        'Fees classified as prohibited or pending SSB approval may not be charged on Islamic products',
        'SHARIAH_COMPLIANCE', 'ISLAMIC_FEES', 'CONSTRAINT', 'BLOCKING',
        '#fee.status == ''ACTIVE'' and #fee.classification != ''PROHIBITED''', '{}'::jsonb,
        'Prohibited fee types cannot be charged', '["ALL"]'::jsonb,
        '["fees","financing"]'::jsonb, CURRENT_DATE, 'ACTIVE', 63, 'ST-009', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT ((LOWER(rule_code)), COALESCE(tenant_id, -1)) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed fee decision tables
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, category, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at,
    tenant_id, created_by, updated_by
)
VALUES
    ('ISLAMIC_WIRE_TRANSFER_FEE_TIERS', 'Islamic wire transfer fee tiers', 'شرائح رسوم التحويل الإسلامي',
        'Decision table for Islamic wire transfer service fees', 'PRICING', 'ISLAMIC_FEES',
        'CALCULATION', 'INFORMATIONAL', 'decisionTable(''ISLAMIC_WIRE_TRANSFER_FEE_TIERS'')', '{}'::jsonb,
        'No Islamic wire transfer fee tier matched', '["ALL"]'::jsonb, '["fees"]'::jsonb,
        CURRENT_DATE, 'ACTIVE', 70, 'ST-009', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'),
    ('ISLAMIC_LATE_PENALTY_TIERS', 'Islamic late penalty tiers', 'شرائح غرامات التأخير الإسلامية',
        'Decision table for late penalty fee variants', 'PRICING', 'ISLAMIC_FEES',
        'CALCULATION', 'INFORMATIONAL', 'decisionTable(''ISLAMIC_LATE_PENALTY_TIERS'')', '{}'::jsonb,
        'No Islamic late penalty tier matched', '["ALL"]'::jsonb, '["fees","financing"]'::jsonb,
        CURRENT_DATE, 'ACTIVE', 71, 'ST-009', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT ((LOWER(rule_code)), COALESCE(tenant_id, -1)) DO NOTHING;

INSERT INTO decision_table (
    rule_id, table_name, description, input_columns, output_columns, hit_policy, status,
    table_version, tenant_id, created_at, updated_at, created_by
)
SELECT br.id,
       br.rule_code,
       CASE br.rule_code
           WHEN 'ISLAMIC_WIRE_TRANSFER_FEE_TIERS' THEN 'Islamic wire transfer fee tiers by transfer type and amount'
           ELSE 'Islamic late penalty tiers'
       END,
       CASE br.rule_code
           WHEN 'ISLAMIC_WIRE_TRANSFER_FEE_TIERS' THEN
               '[{"name":"transferType","type":"STRING"},{"name":"amount","type":"DECIMAL_RANGE"}]'::jsonb
           ELSE
               '[{"name":"penaltyMode","type":"STRING"},{"name":"daysOverdue","type":"INTEGER_RANGE"}]'::jsonb
       END,
       CASE br.rule_code
           WHEN 'ISLAMIC_WIRE_TRANSFER_FEE_TIERS' THEN
               '[{"name":"flatAmount","type":"DECIMAL"},{"name":"currencyCode","type":"STRING"}]'::jsonb
           ELSE
               '[{"name":"rate","type":"DECIMAL"},{"name":"capAmount","type":"DECIMAL"}]'::jsonb
       END,
       'FIRST_MATCH', 'ACTIVE', 1, NULL, NOW(), NOW(), 'SYSTEM'
FROM business_rule br
WHERE br.rule_code IN ('ISLAMIC_WIRE_TRANSFER_FEE_TIERS','ISLAMIC_LATE_PENALTY_TIERS')
  AND NOT EXISTS (
      SELECT 1 FROM decision_table dt WHERE dt.rule_id = br.id AND dt.table_name = br.rule_code
  );

INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values, description, is_active, priority,
    created_at, updated_at, created_by
)
SELECT dt.id, seed.row_number, seed.input_values::jsonb, seed.output_values::jsonb, seed.description, TRUE, seed.priority,
       NOW(), NOW(), 'SYSTEM'
FROM decision_table dt
JOIN (
    VALUES
        ('ISLAMIC_WIRE_TRANSFER_FEE_TIERS', 1, '[{"value":"DOMESTIC"},{"from":0,"to":49999.99}]', '[{"value":15.00},{"value":"SAR"}]', 'Domestic transfer below SAR 50,000', 10),
        ('ISLAMIC_WIRE_TRANSFER_FEE_TIERS', 2, '[{"value":"DOMESTIC"},{"from":50000,"to":999999999}]', '[{"value":25.00},{"value":"SAR"}]', 'Domestic transfer SAR 50,000 and above', 20),
        ('ISLAMIC_WIRE_TRANSFER_FEE_TIERS', 3, '[{"value":"INTERNATIONAL"},{"from":0,"to":999999999}]', '[{"value":75.00},{"value":"SAR"}]', 'International wire transfer', 30),
        ('ISLAMIC_LATE_PENALTY_TIERS', 1, '[{"value":"FLAT"},{"from":1,"to":9999}]', '[{"value":200.00},{"value":5000.00}]', 'Default flat late penalty', 10),
        ('ISLAMIC_LATE_PENALTY_TIERS', 2, '[{"value":"PERCENTAGE"},{"from":1,"to":9999}]', '[{"value":1.00},{"value":5000.00}]', 'Default percentage late penalty', 20)
) AS seed(table_name, row_number, input_values, output_values, description, priority)
    ON seed.table_name = dt.table_name
WHERE NOT EXISTS (
    SELECT 1 FROM decision_table_row dtr
    WHERE dtr.decision_table_id = dt.id AND dtr.row_number = seed.row_number
);

-- ---------------------------------------------------------------------------
-- Seed Islamic posting rules for fee charging and charity routing
-- ---------------------------------------------------------------------------

INSERT INTO islamic_posting_rule (
    rule_code, name, contract_type_code, transaction_type, description, entries,
    priority, enabled, effective_from, aaoifi_reference, approved_by, approved_at,
    rule_version, created_at, updated_at
) VALUES
    ('ISF-UJR-001', 'Islamic Ujrah Fee Charge', 'ALL', 'FEE_CHARGE',
        'Charge Islamic Ujrah fee to customer and recognise fee income',
        '[{"entryType":"DEBIT","accountResolution":"BY_PARAMETER","accountParameter":"customerAccountGlCode","amountExpression":"FULL_AMOUNT","narrationTemplate":"Islamic fee receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"5500-FEE-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Islamic Ujrah fee income {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('ISF-LATE-001', 'Islamic Late Penalty to Charity', 'ALL', 'LATE_PAYMENT_PENALTY',
        'Charge late penalty and route entirely to charity fund',
        '[{"entryType":"DEBIT","accountResolution":"BY_PARAMETER","accountParameter":"customerAccountGlCode","amountExpression":"PENALTY","narrationTemplate":"Islamic late penalty receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"2300-000-001","amountExpression":"PENALTY","narrationTemplate":"Islamic late penalty charity {{reference}}"}]'::jsonb,
        110, TRUE, CURRENT_DATE, 'ST-009', 'SYSTEM', NOW(), 1, NOW(), NOW())
ON CONFLICT (rule_code) DO NOTHING;
