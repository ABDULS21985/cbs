SET search_path TO cbs;

-- ============================================================================
-- V93: Wadiah current accounts, Qard Hasan, Hibah distributions, and statements
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Align legacy check constraints with the new Islamic deposit product set
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS product
    DROP CONSTRAINT IF EXISTS product_product_category_check;

ALTER TABLE IF EXISTS product
    ADD CONSTRAINT product_product_category_check
        CHECK (product_category IN (
            'CURRENT','SAVINGS','FIXED_DEPOSIT','RECURRING_DEPOSIT',
            'MONEY_MARKET','ESCROW','NOSTRO','VOSTRO','GOAL_SAVINGS','PERSONAL_LOAN'
        ));

ALTER TABLE IF EXISTS islamic_contract_types
    DROP CONSTRAINT IF EXISTS islamic_contract_types_category_check;

ALTER TABLE IF EXISTS islamic_contract_types
    ADD CONSTRAINT islamic_contract_types_category_check
        CHECK (category IN (
            'SALE_BASED','LEASE_BASED','PARTNERSHIP_BASED','AGENCY_BASED',
            'GUARANTEE','SAFEKEEPING','FORWARD_SALE','LOAN_BASED'
        ));

ALTER TABLE IF EXISTS islamic_product_templates
    DROP CONSTRAINT IF EXISTS islamic_product_templates_profit_calculation_method_check;

ALTER TABLE IF EXISTS islamic_product_templates
    ADD CONSTRAINT islamic_product_templates_profit_calculation_method_check
        CHECK (profit_calculation_method IN (
            'COST_PLUS_MARKUP','PROFIT_SHARING_RATIO','RENTAL_RATE',
            'EXPECTED_PROFIT_RATE','COMMISSION_BASED','NONE'
        ));

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wadiah_account (
    id                              BIGSERIAL PRIMARY KEY,
    account_id                      BIGINT NOT NULL UNIQUE REFERENCES account(id) ON DELETE CASCADE,
    wadiah_type                     VARCHAR(20) NOT NULL CHECK (wadiah_type IN ('YAD_DHAMANAH','YAD_AMANAH')),
    contract_reference              VARCHAR(50) NOT NULL UNIQUE,
    contract_signed_date            DATE,
    contract_version                INT NOT NULL DEFAULT 1,
    islamic_product_template_id     BIGINT REFERENCES islamic_product_templates(id),
    contract_type_code              VARCHAR(30) NOT NULL DEFAULT 'WADIAH',
    principal_guaranteed            BOOLEAN NOT NULL DEFAULT TRUE,
    profit_contractually_promised   BOOLEAN NOT NULL DEFAULT FALSE,
    hibah_eligible                  BOOLEAN NOT NULL DEFAULT FALSE,
    hibah_disclosure_signed         BOOLEAN NOT NULL DEFAULT FALSE,
    hibah_disclosure_date           DATE,
    minimum_balance                 NUMERIC(18,2) NOT NULL DEFAULT 0,
    cheque_book_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
    debit_card_enabled              BOOLEAN NOT NULL DEFAULT FALSE,
    standing_orders_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    sweep_enabled                   BOOLEAN NOT NULL DEFAULT FALSE,
    sweep_target_account_id         BIGINT REFERENCES account(id),
    sweep_threshold                 NUMERIC(18,2),
    online_banking_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
    mobile_enabled                  BOOLEAN NOT NULL DEFAULT TRUE,
    ussd_enabled                    BOOLEAN NOT NULL DEFAULT FALSE,
    last_hibah_distribution_date    DATE,
    total_hibah_received            NUMERIC(18,2) NOT NULL DEFAULT 0,
    hibah_frequency_warning         BOOLEAN NOT NULL DEFAULT FALSE,
    zakat_applicable                BOOLEAN NOT NULL DEFAULT TRUE,
    last_zakat_calculation_date     DATE,
    dormancy_exempt                 BOOLEAN NOT NULL DEFAULT FALSE,
    last_activity_date              DATE,
    statement_frequency             VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
                                        CHECK (statement_frequency IN ('MONTHLY','QUARTERLY','SEMI_ANNUALLY','ANNUALLY','ON_DEMAND')),
    preferred_language              VARCHAR(10) NOT NULL DEFAULT 'EN'
                                        CHECK (preferred_language IN ('EN','AR','EN_AR')),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wadiah_account_tenant_hibah
    ON wadiah_account (tenant_id, hibah_eligible);
CREATE INDEX IF NOT EXISTS idx_wadiah_account_contract
    ON wadiah_account (contract_reference);
CREATE INDEX IF NOT EXISTS idx_wadiah_account_zakat
    ON wadiah_account (tenant_id, zakat_applicable);

CREATE TABLE IF NOT EXISTS wadiah_onboarding_application (
    id                              BIGSERIAL PRIMARY KEY,
    application_ref                 VARCHAR(50) NOT NULL UNIQUE,
    customer_id                     BIGINT REFERENCES customer(id),
    new_customer_onboarding_id      BIGINT,
    product_template_id             BIGINT NOT NULL REFERENCES islamic_product_templates(id),
    product_code                    VARCHAR(30) NOT NULL,
    currency_code                   VARCHAR(3) NOT NULL REFERENCES currency(code),
    branch_code                     VARCHAR(20),
    officer_id                      VARCHAR(100),
    channel                         VARCHAR(20) NOT NULL CHECK (channel IN ('BRANCH','ONLINE','MOBILE','AGENT')),
    status                          VARCHAR(30) NOT NULL DEFAULT 'INITIATED'
                                        CHECK (status IN (
                                            'INITIATED','KYC_VERIFICATION','PRODUCT_SELECTION','SHARIAH_DISCLOSURE',
                                            'DOCUMENT_SIGNING','COMPLIANCE_CHECK','PENDING_APPROVAL',
                                            'APPROVED','REJECTED','CANCELLED','EXPIRED'
                                        )),
    current_step                    INT NOT NULL DEFAULT 1,
    steps                           JSONB NOT NULL DEFAULT '[]'::jsonb,
    shariah_disclosure_presented    BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_disclosure_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_disclosure_accepted_at  TIMESTAMPTZ,
    hibah_non_guarantee_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    hibah_acknowledged_at           TIMESTAMPTZ,
    zakat_obligation_disclosed      BOOLEAN NOT NULL DEFAULT FALSE,
    zakat_acknowledged_at           TIMESTAMPTZ,
    kyc_verified                    BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_verification_id             BIGINT,
    aml_screening_passed            BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_check_passed          BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_notes                TEXT,
    requested_features              JSONB NOT NULL DEFAULT '{}'::jsonb,
    account_id                      BIGINT REFERENCES account(id),
    wadiah_account_id               BIGINT REFERENCES wadiah_account(id),
    contract_reference              VARCHAR(50),
    rejection_reason                TEXT,
    approved_by                     VARCHAR(100),
    approved_at                     TIMESTAMPTZ,
    initiated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at                    TIMESTAMPTZ,
    expires_at                      TIMESTAMPTZ NOT NULL,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wadiah_onboarding_customer_status
    ON wadiah_onboarding_application (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_wadiah_onboarding_officer_status
    ON wadiah_onboarding_application (officer_id, status);
CREATE INDEX IF NOT EXISTS idx_wadiah_onboarding_status_expiry
    ON wadiah_onboarding_application (status, expires_at);

CREATE TABLE IF NOT EXISTS qard_hasan_account (
    id                              BIGSERIAL PRIMARY KEY,
    account_id                      BIGINT NOT NULL UNIQUE REFERENCES account(id) ON DELETE CASCADE,
    qard_type                       VARCHAR(20) NOT NULL CHECK (qard_type IN ('DEPOSIT_QARD','LENDING_QARD')),
    contract_reference              VARCHAR(50) NOT NULL UNIQUE,
    contract_signed_date            DATE,
    islamic_product_template_id     BIGINT REFERENCES islamic_product_templates(id),
    contract_type_code              VARCHAR(30) NOT NULL DEFAULT 'QARD',
    principal_guaranteed            BOOLEAN NOT NULL DEFAULT TRUE,
    no_return_disclosed             BOOLEAN NOT NULL DEFAULT TRUE,
    principal_amount                NUMERIC(18,2),
    outstanding_principal           NUMERIC(18,2),
    disbursement_date               DATE,
    maturity_date                   DATE,
    repayment_frequency             VARCHAR(20)
                                        CHECK (repayment_frequency IN ('MONTHLY','QUARTERLY','LUMP_SUM','ON_DEMAND')),
    installment_amount              NUMERIC(18,2),
    total_installments              INT,
    completed_installments          INT NOT NULL DEFAULT 0,
    missed_installments             INT NOT NULL DEFAULT 0,
    admin_fee_charged               BOOLEAN NOT NULL DEFAULT FALSE,
    admin_fee_amount                NUMERIC(18,2),
    admin_fee_justification         TEXT,
    purpose                         VARCHAR(30)
                                        CHECK (purpose IN (
                                            'SOCIAL_WELFARE','EMPLOYEE_LOAN','EDUCATION','MEDICAL',
                                            'EMERGENCY','WORKING_CAPITAL_MICRO','OTHER'
                                        )),
    purpose_description             TEXT,
    qard_status                     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                        CHECK (qard_status IN ('ACTIVE','REPAYING','FULLY_REPAID','DEFAULTED','WRITTEN_OFF','CANCELLED')),
    last_repayment_date             DATE,
    last_repayment_amount           NUMERIC(18,2),
    settlement_account_id           BIGINT REFERENCES account(id),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_qard_hasan_account_type_status
    ON qard_hasan_account (qard_type, qard_status);
CREATE INDEX IF NOT EXISTS idx_qard_hasan_account_contract
    ON qard_hasan_account (contract_reference);

CREATE TABLE IF NOT EXISTS qard_repayment_schedule (
    id                              BIGSERIAL PRIMARY KEY,
    qard_account_id                 BIGINT NOT NULL REFERENCES qard_hasan_account(id) ON DELETE CASCADE,
    installment_number              INT NOT NULL,
    due_date                        DATE NOT NULL,
    principal_amount                NUMERIC(18,2) NOT NULL,
    paid_amount                     NUMERIC(18,2) NOT NULL DEFAULT 0,
    paid_date                       DATE,
    status                          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                        CHECK (status IN ('PENDING','PAID','PARTIAL','OVERDUE','WAIVED')),
    transaction_ref                 VARCHAR(40),
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0,
    UNIQUE (qard_account_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_qard_repayment_schedule_status_due
    ON qard_repayment_schedule (status, due_date);

CREATE TABLE IF NOT EXISTS hibah_policy (
    id                                  BIGSERIAL PRIMARY KEY,
    policy_code                         VARCHAR(40) NOT NULL UNIQUE,
    name                                VARCHAR(200) NOT NULL,
    name_ar                             VARCHAR(200),
    description                         TEXT,
    minimum_balance_for_eligibility     NUMERIC(18,2),
    minimum_days_active                 INT NOT NULL DEFAULT 0,
    exclude_dormant_accounts            BOOLEAN NOT NULL DEFAULT TRUE,
    exclude_blocked_accounts            BOOLEAN NOT NULL DEFAULT TRUE,
    maximum_distributions_per_year      INT NOT NULL DEFAULT 4,
    minimum_days_between_distributions  INT NOT NULL DEFAULT 60,
    maximum_hibah_rate_per_annum        NUMERIC(8,4),
    variability_requirement             VARCHAR(30) NOT NULL DEFAULT 'MANDATORY_VARIATION'
                                            CHECK (variability_requirement IN ('MANDATORY_VARIATION','RECOMMENDED_VARIATION','NO_REQUIREMENT')),
    maximum_consecutive_same_rate       INT NOT NULL DEFAULT 2,
    maximum_total_distribution_per_period NUMERIC(18,2),
    funding_source_gl                   VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(gl_code),
    fatwa_id                            BIGINT REFERENCES fatwa_record(id),
    approval_required                   BOOLEAN NOT NULL DEFAULT TRUE,
    ssb_review_frequency                VARCHAR(20) NOT NULL DEFAULT 'QUARTERLY'
                                            CHECK (ssb_review_frequency IN ('QUARTERLY','SEMI_ANNUALLY','ANNUALLY')),
    last_ssb_review                     DATE,
    next_ssb_review                     DATE,
    status                              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                            CHECK (status IN ('ACTIVE','SUSPENDED','UNDER_REVIEW')),
    tenant_id                           BIGINT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hibah_distribution_batch (
    id                              BIGSERIAL PRIMARY KEY,
    policy_id                       BIGINT REFERENCES hibah_policy(id),
    batch_ref                       VARCHAR(50) NOT NULL UNIQUE,
    distribution_date               DATE NOT NULL,
    period_from                     DATE NOT NULL,
    period_to                       DATE NOT NULL,
    total_distribution_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    account_count                   INT NOT NULL DEFAULT 0,
    average_hibah_rate              NUMERIC(8,4),
    distribution_method             VARCHAR(30) NOT NULL
                                        CHECK (distribution_method IN ('FLAT_AMOUNT','BALANCE_WEIGHTED','TIERED','DISCRETIONARY_MANUAL')),
    decision_table_code             VARCHAR(100),
    funding_source                  VARCHAR(30) NOT NULL
                                        CHECK (funding_source IN ('BANK_EQUITY','RETAINED_EARNINGS','SPECIFIC_INCOME_POOL')),
    funding_source_gl               VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(gl_code),
    status                          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                        CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','PROCESSING','COMPLETED','CANCELLED')),
    approved_by                     VARCHAR(100),
    approved_at                     TIMESTAMPTZ,
    shariah_board_notified          BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at                    TIMESTAMPTZ,
    processed_by                    VARCHAR(100),
    total_journal_entries           INT NOT NULL DEFAULT 0,
    journal_batch_ref               VARCHAR(50),
    notes                           TEXT,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hibah_distribution_batch_status_date
    ON hibah_distribution_batch (status, distribution_date);
CREATE INDEX IF NOT EXISTS idx_hibah_distribution_batch_tenant_period
    ON hibah_distribution_batch (tenant_id, period_from);

CREATE TABLE IF NOT EXISTS hibah_distribution_item (
    id                              BIGSERIAL PRIMARY KEY,
    batch_id                        BIGINT NOT NULL REFERENCES hibah_distribution_batch(id) ON DELETE CASCADE,
    account_id                      BIGINT NOT NULL REFERENCES account(id),
    wadiah_account_id               BIGINT NOT NULL REFERENCES wadiah_account(id),
    customer_id                     BIGINT NOT NULL REFERENCES customer(id),
    average_balance                 NUMERIC(18,2),
    minimum_balance                 NUMERIC(18,2),
    hibah_amount                    NUMERIC(18,2) NOT NULL,
    hibah_rate                      NUMERIC(8,4),
    calculation_basis               VARCHAR(300),
    status                          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                        CHECK (status IN ('PENDING','CREDITED','FAILED','EXCLUDED')),
    exclusion_reason                VARCHAR(250),
    transaction_ref                 VARCHAR(40),
    credited_at                     TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hibah_distribution_item_batch_status
    ON hibah_distribution_item (batch_id, status);
CREATE INDEX IF NOT EXISTS idx_hibah_distribution_item_account_status
    ON hibah_distribution_item (account_id, status);
CREATE INDEX IF NOT EXISTS idx_hibah_distribution_item_customer
    ON hibah_distribution_item (customer_id);

CREATE TABLE IF NOT EXISTS wadiah_statement_config (
    id                              BIGSERIAL PRIMARY KEY,
    wadiah_account_id               BIGINT NOT NULL UNIQUE REFERENCES wadiah_account(id) ON DELETE CASCADE,
    language                        VARCHAR(10) NOT NULL DEFAULT 'EN'
                                        CHECK (language IN ('EN','AR','EN_AR')),
    include_hibah_disclaimer        BOOLEAN NOT NULL DEFAULT TRUE,
    include_zakat_summary           BOOLEAN NOT NULL DEFAULT TRUE,
    include_islamic_dates           BOOLEAN NOT NULL DEFAULT TRUE,
    show_average_balance            BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_method                 VARCHAR(30) NOT NULL DEFAULT 'PORTAL'
                                        CHECK (delivery_method IN ('PAPER','EMAIL','PORTAL','SMS_NOTIFICATION')),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Supporting Shariah governance seeds
-- ---------------------------------------------------------------------------

INSERT INTO fatwa_record (
    fatwa_number, fatwa_title, fatwa_category, subject, full_text,
    aaoifi_references, applicable_contract_types, conditions,
    effective_date, status, approved_at, created_by, updated_by
)
SELECT
    'FTW-WAD-001',
    'Wadiah Yad Dhamanah Current Accounts',
    'DEPOSIT',
    'Wadiah current accounts and discretionary Hibah',
    'Approves Wadiah Yad Dhamanah current accounts subject to non-contractual Hibah, active disclosure, and principal guarantee controls.',
    '["FAS 2","FAS 1"]'::jsonb,
    '["WADIAH"]'::jsonb,
    'No contractual return may be promised and Hibah must remain irregular and discretionary.',
    CURRENT_DATE,
    'ACTIVE',
    NOW(),
    'SYSTEM',
    'SYSTEM'
WHERE NOT EXISTS (
    SELECT 1 FROM fatwa_record WHERE fatwa_number = 'FTW-WAD-001'
);

INSERT INTO fatwa_record (
    fatwa_number, fatwa_title, fatwa_category, subject, full_text,
    aaoifi_references, applicable_contract_types, conditions,
    effective_date, status, approved_at, created_by, updated_by
)
SELECT
    'FTW-QRD-001',
    'Qard Hasan Deposits and Benevolent Loans',
    'FINANCING',
    'Qard deposit basis and benevolent lending',
    'Approves Qard Hasan deposit accounts and lending products on a strictly no-return, no-penalty basis.',
    '["FAS 1"]'::jsonb,
    '["QARD"]'::jsonb,
    'No late penalties, no profit, and only documented actual-cost admin fees are permitted.',
    CURRENT_DATE,
    'ACTIVE',
    NOW(),
    'SYSTEM',
    'SYSTEM'
WHERE NOT EXISTS (
    SELECT 1 FROM fatwa_record WHERE fatwa_number = 'FTW-QRD-001'
);

-- ---------------------------------------------------------------------------
-- Additional GLs required by Wadiah/Qard/Hibah
-- ---------------------------------------------------------------------------

INSERT INTO chart_of_accounts (
    gl_code, gl_name, gl_category, level_number, is_header, is_postable,
    is_multi_currency, is_inter_branch, normal_balance, allow_manual_posting, requires_cost_centre, is_active,
    islamic_account_category, contract_type_code, shariah_classification, is_islamic_account,
    aaoifi_reference, aaoifi_line_item, profit_distribution_eligible, zakat_applicable,
    contra_account_code, is_reserve_account, reserve_type, created_by, created_at, updated_at
) VALUES
    ('2100-WAD-002', 'Current Accounts - Wadiah Yad Dhamanah (Foreign Currency)', 'LIABILITY', 1, FALSE, TRUE, TRUE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'CURRENT_ACCOUNT_WADIAH', 'WADIAH', 'HALAL', TRUE, 'FAS 1', 'Current accounts wadiah FCY', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('1200-QRD-001', 'Qard Hasan Receivable', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'QARD_HASAN_RECEIVABLE', 'QARD', 'HALAL', TRUE, 'FAS 1', 'Qard Hasan receivable', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6100-HIB-001', 'Hibah Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'HIBAH_EXPENSE', 'WADIAH', 'HALAL', TRUE, 'FAS 1', 'Hibah expense', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW()),
    ('6200-QRD-001', 'Qard Hasan Write-Off Expense', 'EXPENSE', 1, FALSE, TRUE, FALSE, FALSE, 'DEBIT', TRUE, FALSE, TRUE,
        'QARD_WRITE_OFF_EXPENSE', 'QARD', 'HALAL', TRUE, 'FAS 1', 'Qard Hasan write-off expense', FALSE, FALSE,
        NULL, FALSE, 'NONE', 'SYSTEM', NOW(), NOW())
ON CONFLICT (gl_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Islamic contract types
-- ---------------------------------------------------------------------------

INSERT INTO islamic_contract_types (
    code, name, name_ar, description, description_ar, category,
    shariah_basis, shariah_basis_ar, required_product_fields, shariah_rule_group_code,
    key_shariah_principles, key_shariah_principles_ar, prohibitions, prohibitions_ar,
    accounting_treatment, aaoifi_standard, ifsb_standard, basel_treatment,
    applicable_categories, icon_code, display_order, status, tenant_id, created_by, updated_by
)
SELECT
    'QARD',
    'Qard Hasan - Benevolent Loan',
    'القرض الحسن',
    'Interest-free loan arrangement for deposit basis or benevolent customer lending.',
    'ترتيب قرض بدون عائد يستخدم كأساس للودائع الجارية أو للإقراض الحسن.',
    'LOAN_BASED',
    'Principal must be repaid in full with no contractual return and no penalty charges.',
    'يجب رد أصل القرض كاملاً دون عائد تعاقدي أو غرامات تأخير.',
    '["noReturnDisclosed","principalGuaranteed"]'::jsonb,
    'QARD',
    '["Principal repayment only","No contractual return","No late penalties","Admin fee limited to actual cost"]'::jsonb,
    '["سداد أصل القرض فقط","لا عائد تعاقدي","لا غرامات تأخير","رسوم إدارية في حدود التكلفة الفعلية"]'::jsonb,
    '["Cannot charge interest","Cannot impose late-payment penalty","Cannot structure admin fees as a percentage of principal"]'::jsonb,
    '["لا يجوز احتساب فائدة","لا يجوز فرض غرامة تأخير","لا يجوز ربط الرسوم الإدارية بنسبة من أصل القرض"]'::jsonb,
    'AMORTISED_COST', 'FAS 1', 'IFSB-1',
    'Recognise Qard deposits as liabilities and lending Qard as receivables at principal amount.',
    '["DEPOSIT","FINANCING"]'::jsonb,
    'hand-heart', 35, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_contract_types WHERE LOWER(code) = 'qard' AND tenant_id IS NULL
);

-- ---------------------------------------------------------------------------
-- Core products
-- ---------------------------------------------------------------------------

INSERT INTO product (
    code, name, description, product_category, currency_code, min_opening_balance, min_operating_balance,
    max_balance, allows_overdraft, max_overdraft_limit, allows_cheque_book, allows_debit_card,
    allows_mobile, allows_internet, allows_sweep, dormancy_days, interest_bearing, base_interest_rate,
    interest_calc_method, interest_posting_frequency, interest_accrual_method, monthly_maintenance_fee,
    sms_alert_fee, gl_account_code, gl_interest_expense_code, gl_interest_payable_code, gl_fee_income_code,
    is_active, effective_from, created_by, updated_by
) VALUES
    ('WAD-CUR-SAR-001', 'Wadiah Current Account - SAR', 'Islamic current account based on Wadiah Yad Dhamanah', 'CURRENT', 'SAR', 1000, 0,
        NULL, FALSE, 0, TRUE, TRUE, TRUE, TRUE, TRUE, 365, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '2100-WAD-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('WAD-CUR-USD-001', 'Wadiah Current Account - USD', 'Foreign currency Wadiah current account', 'CURRENT', 'USD', 1000, 0,
        NULL, FALSE, 0, TRUE, TRUE, TRUE, TRUE, TRUE, 365, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '2100-WAD-002', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('WAD-CUR-SAR-002', 'Wadiah Premium Current Account - SAR', 'Premium Wadiah current account with enhanced service features', 'CURRENT', 'SAR', 50000, 10000,
        NULL, FALSE, 0, TRUE, TRUE, TRUE, TRUE, TRUE, 365, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '2100-WAD-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('QRD-CUR-SAR-001', 'Qard Hasan Current Account - SAR', 'Islamic current account structured as customer loan to bank', 'CURRENT', 'SAR', 1000, 0,
        NULL, FALSE, 0, TRUE, TRUE, TRUE, TRUE, FALSE, 365, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '2100-QRD-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM'),
    ('QRD-LOAN-SAR-001', 'Qard Hasan Benevolent Loan - SAR', 'Benevolent lending product with principal-only repayment', 'PERSONAL_LOAN', 'SAR', 0, 0,
        NULL, FALSE, 0, FALSE, FALSE, FALSE, FALSE, FALSE, 0, FALSE, 0,
        'DAILY_BALANCE', 'MONTHLY', 'SIMPLE', 0, 0, '1200-QRD-001', NULL, NULL, NULL,
        TRUE, CURRENT_DATE, 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    product_category = EXCLUDED.product_category,
    currency_code = EXCLUDED.currency_code,
    min_opening_balance = EXCLUDED.min_opening_balance,
    min_operating_balance = EXCLUDED.min_operating_balance,
    allows_cheque_book = EXCLUDED.allows_cheque_book,
    allows_debit_card = EXCLUDED.allows_debit_card,
    allows_mobile = EXCLUDED.allows_mobile,
    allows_internet = EXCLUDED.allows_internet,
    allows_sweep = EXCLUDED.allows_sweep,
    gl_account_code = EXCLUDED.gl_account_code,
    is_active = EXCLUDED.is_active,
    updated_by = 'SYSTEM',
    updated_at = NOW();

INSERT INTO product_template (
    template_code, template_name, product_category, interest_config, fee_config, limit_config,
    eligibility_rules, lifecycle_rules, gl_mapping, status, approved_by, approved_at, activated_at,
    template_version, created_by
) VALUES
    ('WAD-CUR-SAR-001', 'Wadiah Current Account - SAR', 'CURRENT', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED"]'::jsonb, '{"contract":"WADIAH","hibahAllowed":true}'::jsonb,
        '{"depositLiabilityGl":"2100-WAD-001","charityGl":"2300-000-001"}'::jsonb, 'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('WAD-CUR-USD-001', 'Wadiah Current Account - USD', 'CURRENT', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED"]'::jsonb, '{"contract":"WADIAH","hibahAllowed":true}'::jsonb,
        '{"depositLiabilityGl":"2100-WAD-002","charityGl":"2300-000-001"}'::jsonb, 'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('WAD-CUR-SAR-002', 'Wadiah Premium Current Account - SAR', 'CURRENT', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED","AFFLUENT_SEGMENT"]'::jsonb, '{"contract":"WADIAH","hibahAllowed":true}'::jsonb,
        '{"depositLiabilityGl":"2100-WAD-001","charityGl":"2300-000-001"}'::jsonb, 'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('QRD-CUR-SAR-001', 'Qard Hasan Current Account - SAR', 'CURRENT', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["KYC_VERIFIED"]'::jsonb, '{"contract":"QARD","hibahAllowed":false}'::jsonb,
        '{"depositLiabilityGl":"2100-QRD-001"}'::jsonb, 'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM'),
    ('QRD-LOAN-SAR-001', 'Qard Hasan Benevolent Loan - SAR', 'PERSONAL_LOAN', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '["QARD_APPROVAL"]'::jsonb, '{"contract":"QARD","penaltyAllowed":false}'::jsonb,
        '{"financingAssetGl":"1200-QRD-001","writeOffExpenseGl":"6200-QRD-001"}'::jsonb, 'ACTIVE', 'SYSTEM', NOW(), NOW(), 1, 'SYSTEM')
ON CONFLICT (template_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Islamic product templates and parameters
-- ---------------------------------------------------------------------------

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method,
    active_fatwa_id, fatwa_required, shariah_compliance_status, shariah_rule_group_code,
    status, effective_from, product_version, min_amount, max_amount, min_tenor_months, max_tenor_months,
    currencies, eligible_customer_types, eligible_segments, deposit_liability_gl, financing_asset_gl,
    profit_expense_gl, charity_gl, tenant_id, created_by, updated_by
)
SELECT
    pt.id, 'WAD-CUR-SAR-001', 'Wadiah Current Account - SAR', 'حساب جاري وديعة - ريال',
    'Islamic current account based on Wadiah Yad Dhamanah with no contractual profit.',
    'حساب جاري إسلامي قائم على الوديعة يد الضمانة دون ربح تعاقدي.',
    ict.id, 'DEPOSIT', 'CURRENT_ACCOUNT', 'NONE',
    fr.id, TRUE, 'COMPLIANT', 'WADIAH_RULES',
    'ACTIVE', CURRENT_DATE, 1, 1000, NULL, 0, 0,
    '["SAR"]'::jsonb, '["INDIVIDUAL","CORPORATE","SME"]'::jsonb, '[]'::jsonb, '2100-WAD-001', NULL,
    NULL, '2300-000-001', NULL, 'SYSTEM', 'SYSTEM'
FROM product_template pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'wadiah' AND ict.tenant_id IS NULL
JOIN fatwa_record fr ON fr.fatwa_number = 'FTW-WAD-001'
WHERE pt.template_code = 'WAD-CUR-SAR-001'
  AND NOT EXISTS (SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = 'wad-cur-sar-001');

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method,
    active_fatwa_id, fatwa_required, shariah_compliance_status, shariah_rule_group_code,
    status, effective_from, product_version, min_amount, max_amount, min_tenor_months, max_tenor_months,
    currencies, eligible_customer_types, eligible_segments, deposit_liability_gl, financing_asset_gl,
    profit_expense_gl, charity_gl, tenant_id, created_by, updated_by
)
SELECT
    pt.id, 'WAD-CUR-USD-001', 'Wadiah Current Account - USD', 'حساب جاري وديعة - دولار',
    'Foreign currency Wadiah current account with discretionary Hibah only.',
    'حساب جاري وديعة بالعملة الأجنبية مع هبة تقديرية فقط.',
    ict.id, 'DEPOSIT', 'CURRENT_ACCOUNT', 'NONE',
    fr.id, TRUE, 'COMPLIANT', 'WADIAH_RULES',
    'ACTIVE', CURRENT_DATE, 1, 1000, NULL, 0, 0,
    '["USD"]'::jsonb, '["INDIVIDUAL","CORPORATE","SME"]'::jsonb, '[]'::jsonb, '2100-WAD-002', NULL,
    NULL, '2300-000-001', NULL, 'SYSTEM', 'SYSTEM'
FROM product_template pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'wadiah' AND ict.tenant_id IS NULL
JOIN fatwa_record fr ON fr.fatwa_number = 'FTW-WAD-001'
WHERE pt.template_code = 'WAD-CUR-USD-001'
  AND NOT EXISTS (SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = 'wad-cur-usd-001');

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method,
    active_fatwa_id, fatwa_required, shariah_compliance_status, shariah_rule_group_code,
    status, effective_from, product_version, min_amount, max_amount, min_tenor_months, max_tenor_months,
    currencies, eligible_customer_types, eligible_segments, deposit_liability_gl, financing_asset_gl,
    profit_expense_gl, charity_gl, tenant_id, created_by, updated_by
)
SELECT
    pt.id, 'WAD-CUR-SAR-002', 'Wadiah Premium Current Account - SAR', 'حساب جاري وديعة مميز - ريال',
    'Premium Wadiah current account with higher opening balance and enhanced service access.',
    'حساب جاري وديعة مميز بحد أدنى أعلى وخدمات إضافية.',
    ict.id, 'DEPOSIT', 'CURRENT_ACCOUNT', 'NONE',
    fr.id, TRUE, 'COMPLIANT', 'WADIAH_RULES',
    'ACTIVE', CURRENT_DATE, 1, 50000, NULL, 0, 0,
    '["SAR"]'::jsonb, '["INDIVIDUAL","CORPORATE","SME"]'::jsonb, '["AFFLUENT","HNW","UHNW"]'::jsonb, '2100-WAD-001', NULL,
    NULL, '2300-000-001', NULL, 'SYSTEM', 'SYSTEM'
FROM product_template pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'wadiah' AND ict.tenant_id IS NULL
JOIN fatwa_record fr ON fr.fatwa_number = 'FTW-WAD-001'
WHERE pt.template_code = 'WAD-CUR-SAR-002'
  AND NOT EXISTS (SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = 'wad-cur-sar-002');

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method,
    active_fatwa_id, fatwa_required, shariah_compliance_status, shariah_rule_group_code,
    status, effective_from, product_version, min_amount, max_amount, min_tenor_months, max_tenor_months,
    currencies, eligible_customer_types, eligible_segments, deposit_liability_gl, financing_asset_gl,
    profit_expense_gl, charity_gl, tenant_id, created_by, updated_by
)
SELECT
    pt.id, 'QRD-CUR-SAR-001', 'Qard Hasan Current Account - SAR', 'حساب جاري قرض حسن - ريال',
    'Current account structured as customer Qard to the bank with no contractual return.',
    'حساب جاري قائم على القرض الحسن دون أي عائد تعاقدي.',
    ict.id, 'DEPOSIT', 'CURRENT_ACCOUNT', 'NONE',
    fr.id, TRUE, 'COMPLIANT', 'QARD_RULES',
    'ACTIVE', CURRENT_DATE, 1, 1000, NULL, 0, 0,
    '["SAR"]'::jsonb, '["INDIVIDUAL","CORPORATE","SME"]'::jsonb, '[]'::jsonb, '2100-QRD-001', NULL,
    NULL, NULL, NULL, 'SYSTEM', 'SYSTEM'
FROM product_template pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'qard' AND ict.tenant_id IS NULL
JOIN fatwa_record fr ON fr.fatwa_number = 'FTW-QRD-001'
WHERE pt.template_code = 'QRD-CUR-SAR-001'
  AND NOT EXISTS (SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = 'qrd-cur-sar-001');

INSERT INTO islamic_product_templates (
    base_product_id, product_code, name, name_ar, description, description_ar,
    contract_type_id, product_category, sub_category, profit_calculation_method,
    active_fatwa_id, fatwa_required, shariah_compliance_status, shariah_rule_group_code,
    status, effective_from, product_version, min_amount, max_amount, min_tenor_months, max_tenor_months,
    currencies, eligible_customer_types, eligible_segments, deposit_liability_gl, financing_asset_gl,
    profit_expense_gl, charity_gl, tenant_id, created_by, updated_by
)
SELECT
    pt.id, 'QRD-LOAN-SAR-001', 'Qard Hasan Benevolent Loan - SAR', 'قرض حسن - ريال',
    'Benevolent principal-only lending product with no interest and no penalty charges.',
    'منتج تمويل بالقرض الحسن على أساس سداد الأصل فقط دون فائدة أو غرامات.',
    ict.id, 'FINANCING', 'BENEVOLENT_LOAN', 'NONE',
    fr.id, TRUE, 'COMPLIANT', 'QARD_RULES',
    'ACTIVE', CURRENT_DATE, 1, 0, NULL, 0, 60,
    '["SAR"]'::jsonb, '["INDIVIDUAL","SME"]'::jsonb, '[]'::jsonb, NULL, '1200-QRD-001',
    NULL, NULL, NULL, 'SYSTEM', 'SYSTEM'
FROM product_template pt
JOIN islamic_contract_types ict ON LOWER(ict.code) = 'qard' AND ict.tenant_id IS NULL
JOIN fatwa_record fr ON fr.fatwa_number = 'FTW-QRD-001'
WHERE pt.template_code = 'QRD-LOAN-SAR-001'
  AND NOT EXISTS (SELECT 1 FROM islamic_product_templates ipt WHERE LOWER(ipt.product_code) = 'qrd-loan-sar-001');

INSERT INTO islamic_product_parameters (
    product_template_id, parameter_name, parameter_value, parameter_type, description, is_editable
)
SELECT ipt.id, seed.parameter_name, seed.parameter_value, seed.parameter_type, seed.description, FALSE
FROM islamic_product_templates ipt
JOIN (
    VALUES
        ('WAD-CUR-SAR-001', 'profitContractuallyPromised', 'false', 'BOOLEAN', 'Wadiah cannot promise returns'),
        ('WAD-CUR-SAR-001', 'wadiahType', 'YAD_DHAMANAH', 'STRING', 'Primary Wadiah structure'),
        ('WAD-CUR-USD-001', 'profitContractuallyPromised', 'false', 'BOOLEAN', 'Wadiah cannot promise returns'),
        ('WAD-CUR-USD-001', 'wadiahType', 'YAD_DHAMANAH', 'STRING', 'Primary Wadiah structure'),
        ('WAD-CUR-SAR-002', 'profitContractuallyPromised', 'false', 'BOOLEAN', 'Wadiah cannot promise returns'),
        ('WAD-CUR-SAR-002', 'wadiahType', 'YAD_DHAMANAH', 'STRING', 'Primary Wadiah structure'),
        ('QRD-CUR-SAR-001', 'profitContractuallyPromised', 'false', 'BOOLEAN', 'Qard cannot promise returns'),
        ('QRD-CUR-SAR-001', 'noReturnDisclosed', 'true', 'BOOLEAN', 'Customer acknowledges no return'),
        ('QRD-LOAN-SAR-001', 'profitContractuallyPromised', 'false', 'BOOLEAN', 'Qard cannot promise returns'),
        ('QRD-LOAN-SAR-001', 'latePenaltyAllowed', 'false', 'BOOLEAN', 'No late penalty permitted on Qard Hasan')
) AS seed(product_code, parameter_name, parameter_value, parameter_type, description)
    ON ipt.product_code = seed.product_code
WHERE NOT EXISTS (
    SELECT 1
    FROM islamic_product_parameters ipp
    WHERE ipp.product_template_id = ipt.id
      AND LOWER(ipp.parameter_name) = LOWER(seed.parameter_name)
);

-- ---------------------------------------------------------------------------
-- Decision table for tiered Hibah distributions
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, description_ar,
    category, sub_category, rule_type, severity, status, priority,
    effective_from, tenant_id, created_at, updated_at, created_by
)
SELECT
    'HIBAH_TIERED_BALANCE',
    'Hibah Tiered Balance Table',
    'جدول شرائح الهبة حسب الرصيد',
    'Tiered discretionary Hibah rates based on average Wadiah balance.',
    'شرائح الهبة التقديرية حسب متوسط رصيد الوديعة.',
    'PRICING', 'HIBAH', 'CALCULATION', 'WARNING', 'ACTIVE', 5,
    CURRENT_DATE, NULL, NOW(), NOW(), 'SYSTEM'
WHERE NOT EXISTS (
    SELECT 1 FROM business_rule WHERE rule_code = 'HIBAH_TIERED_BALANCE' AND tenant_id IS NULL
);

INSERT INTO decision_table (
    rule_id, table_name, description, input_columns, output_columns,
    hit_policy, status, table_version, tenant_id, created_at, updated_at, created_by
)
SELECT
    br.id,
    'HIBAH_TIERED_BALANCE',
    'Tiered Hibah rates by average balance',
    '[{"name":"averageBalance","type":"DECIMAL_RANGE"},{"name":"currencyCode","type":"STRING"}]'::jsonb,
    '[{"name":"hibahRate","type":"DECIMAL"}]'::jsonb,
    'FIRST_MATCH', 'ACTIVE', 1, NULL, NOW(), NOW(), 'SYSTEM'
FROM business_rule br
WHERE br.rule_code = 'HIBAH_TIERED_BALANCE'
  AND br.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM decision_table dt WHERE dt.rule_id = br.id AND dt.table_name = 'HIBAH_TIERED_BALANCE'
  );

INSERT INTO decision_table_row (
    decision_table_id, row_number, input_values, output_values, description, is_active, priority, created_at, updated_at, created_by
)
SELECT dt.id, seed.row_number, seed.input_values, seed.output_values, seed.description, TRUE, seed.row_number, NOW(), NOW(), 'SYSTEM'
FROM decision_table dt
JOIN (
    VALUES
        (1, '[{"from":0,"to":4999.99},{"value":"*"}]'::jsonb, '[{"value":0.10}]'::jsonb, 'Entry tier'),
        (2, '[{"from":5000,"to":49999.99},{"value":"*"}]'::jsonb, '[{"value":0.25}]'::jsonb, 'Middle tier'),
        (3, '[{"from":50000,"to":999999999},{"value":"*"}]'::jsonb, '[{"value":0.40}]'::jsonb, 'Premium tier')
) AS seed(row_number, input_values, output_values, description)
    ON TRUE
WHERE dt.table_name = 'HIBAH_TIERED_BALANCE'
  AND NOT EXISTS (
      SELECT 1 FROM decision_table_row dtr WHERE dtr.decision_table_id = dt.id AND dtr.row_number = seed.row_number
  );

-- ---------------------------------------------------------------------------
-- Islamic posting rules
-- ---------------------------------------------------------------------------

INSERT INTO islamic_posting_rule (
    rule_code, name, contract_type_code, transaction_type, description, entries,
    priority, enabled, effective_from, aaoifi_reference, approved_by, approved_at, rule_version, created_at, updated_at
) VALUES
    ('WAD-DEP-001', 'Wadiah Deposit', 'WADIAH', 'DEPOSIT_PLACEMENT', 'Wadiah cash deposit',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wadiah deposit cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"2100-WAD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wadiah liability {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 2', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('WAD-WDR-001', 'Wadiah Withdrawal', 'WADIAH', 'DEPOSIT_WITHDRAWAL', 'Wadiah cash withdrawal',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"2100-WAD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wadiah liability reduction {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wadiah cash withdrawal {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 2', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('WAD-TRF-OUT-001', 'Wadiah Transfer Out', 'WADIAH', 'INTERNAL_TRANSFER', 'Wadiah transfer to another account',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"2100-WAD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wadiah transfer out {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_PARAMETER","accountParameter":"destinationAccountGlCode","amountExpression":"FULL_AMOUNT","narrationTemplate":"Destination account credit {{reference}}"}]'::jsonb,
        95, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('WAD-SWP-001', 'Wadiah Sweep to Investment Account', 'WADIAH', 'SWEEP_TRANSFER', 'Sweep Wadiah surplus into Mudarabah investment account',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"2100-WAD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Wadiah sweep out {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"3100-MDR-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Investment account sweep in {{reference}}"}]'::jsonb,
        95, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('QRD-DEP-001', 'Qard Deposit', 'QARD', 'DEPOSIT_PLACEMENT', 'Customer places Qard deposit with the bank',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard deposit cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"2100-QRD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard liability {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('QRD-WDR-001', 'Qard Withdrawal', 'QARD', 'DEPOSIT_WITHDRAWAL', 'Bank repays customer Qard deposit',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"2100-QRD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard liability reduction {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard cash repayment {{reference}}"}]'::jsonb,
        100, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('QRD-DISB-001', 'Qard Hasan Loan Disbursement', 'QARD', 'QARD_LOAN_DISBURSEMENT', 'Recognise Qard receivable and credit customer settlement account',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1200-QRD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard Hasan receivable {{reference}}"},{"entryType":"CREDIT","accountResolution":"BY_PARAMETER","accountParameter":"customerSettlementAccountGlCode","amountExpression":"FULL_AMOUNT","narrationTemplate":"Customer settlement credit {{reference}}"}]'::jsonb,
        90, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('QRD-REPAY-001', 'Qard Hasan Loan Repayment', 'QARD', 'QARD_LOAN_REPAYMENT', 'Repayment of Qard receivable principal only',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"1100-000-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard repayment cash {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1200-QRD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard receivable reduction {{reference}}"}]'::jsonb,
        90, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('QRD-WOFF-001', 'Qard Hasan Write-Off', 'QARD', 'QARD_WRITE_OFF', 'Write off irrecoverable Qard Hasan receivable',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6200-QRD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard write-off expense {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"1200-QRD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Qard receivable write-off {{reference}}"}]'::jsonb,
        90, TRUE, CURRENT_DATE, 'FAS 1', 'SYSTEM', NOW(), 1, NOW(), NOW()),
    ('HIB-DIST-001', 'Hibah Distribution to Wadiah Account Holder', 'WADIAH', 'HIBAH_DISTRIBUTION', 'Credit discretionary Hibah to Wadiah account holders',
        '[{"entryType":"DEBIT","accountResolution":"FIXED","fixedAccountCode":"6100-HIB-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Hibah (Gift) - هبة {{reference}}"},{"entryType":"CREDIT","accountResolution":"FIXED","fixedAccountCode":"2100-WAD-001","amountExpression":"FULL_AMOUNT","narrationTemplate":"Hibah (Gift) - هبة {{reference}}"}]'::jsonb,
        90, TRUE, CURRENT_DATE, 'FAS 2', 'SYSTEM', NOW(), 1, NOW(), NOW())
ON CONFLICT (rule_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Default Hibah policy
-- ---------------------------------------------------------------------------

INSERT INTO hibah_policy (
    policy_code, name, name_ar, description,
    minimum_balance_for_eligibility, minimum_days_active, exclude_dormant_accounts, exclude_blocked_accounts,
    maximum_distributions_per_year, minimum_days_between_distributions, maximum_hibah_rate_per_annum,
    variability_requirement, maximum_consecutive_same_rate, maximum_total_distribution_per_period,
    funding_source_gl, fatwa_id, approval_required, ssb_review_frequency,
    last_ssb_review, next_ssb_review, status, tenant_id, created_by, updated_by
)
SELECT
    'HIBAH-DEFAULT-001',
    'Default Wadiah Hibah Policy',
    'السياسة الافتراضية لهبة الوديعة',
    'Default SSB-governed discretionary Hibah policy with mandatory variation controls.',
    1000, 30, TRUE, TRUE, 4, 60, 2.0000,
    'MANDATORY_VARIATION', 2, 500000,
    '6100-HIB-001',
    fr.id,
    TRUE, 'QUARTERLY',
    CURRENT_DATE, (CURRENT_DATE + INTERVAL '3 months')::date,
    'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
FROM fatwa_record fr
WHERE fr.fatwa_number = 'FTW-WAD-001'
  AND NOT EXISTS (SELECT 1 FROM hibah_policy WHERE policy_code = 'HIBAH-DEFAULT-001');

-- ---------------------------------------------------------------------------
-- Shariah business rules
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, description_ar, category, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, error_message_ar, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at, tenant_id, created_by
)
SELECT
    seed.rule_code, seed.name, seed.name_ar, seed.description, seed.description_ar,
    'SHARIAH_COMPLIANCE', seed.sub_category, seed.rule_type, seed.severity,
    seed.evaluation_expression, seed.parameters, seed.error_message, seed.error_message_ar,
    seed.applicable_products, seed.applicable_modules, CURRENT_DATE, 'ACTIVE', seed.priority,
    seed.shariah_board_resolution, 'SYSTEM', NOW(), NULL, 'SYSTEM'
FROM (
    VALUES
        (
            'SHARIAH-WAD-001',
            'Wadiah cannot promise returns',
            'لا يجوز وعد عائد في الوديعة',
            'Reject any Wadiah product or account setup that contractually promises returns.',
            'يرفض أي إعداد لمنتج أو حساب وديعة يتضمن عائداً تعاقدياً.',
            'WADIAH',
            'VALIDATION',
            'BLOCKING',
            'profitContractuallyPromised == false',
            '{"control":"NO_CONTRACTUAL_RETURN"}'::jsonb,
            'Wadiah cannot promise returns.',
            'لا يجوز الوعد بعائد على الوديعة.',
            '["WAD-CUR-SAR-001","WAD-CUR-USD-001","WAD-CUR-SAR-002"]'::jsonb,
            '["WADIAH"]'::jsonb,
            1,
            'SSB-WAD-001'
        ),
        (
            'SHARIAH-WAD-002',
            'Hibah must remain discretionary (ST-018)',
            'يجب أن تبقى الهبة تقديرية',
            'Warn or block Hibah patterns that become too regular in rate or frequency.',
            'تحذر أو تمنع أنماط الهبة التي تصبح منتظمة للغاية في المعدل أو التوقيت.',
            'HIBAH',
            'THRESHOLD',
            'WARNING',
            'variationRequired == true',
            '{"control":"ST-018"}'::jsonb,
            'Hibah pattern is becoming too systematic.',
            'أصبحت أنماط الهبة منتظمة بشكل مفرط.',
            '["WAD-CUR-SAR-001","WAD-CUR-USD-001","WAD-CUR-SAR-002"]'::jsonb,
            '["HIBAH","WADIAH"]'::jsonb,
            5,
            'SSB-WAD-002'
        ),
        (
            'SHARIAH-QRD-001',
            'No penalty on Qard Hasan late repayment',
            'لا غرامة على تأخر سداد القرض الحسن',
            'Block any attempt to impose late fees or penalties on Qard Hasan repayments.',
            'يمنع أي محاولة لفرض رسوم أو غرامات تأخير على القرض الحسن.',
            'QARD',
            'VALIDATION',
            'BLOCKING',
            'latePenaltyAllowed == false',
            '{"control":"NO_LATE_PENALTY"}'::jsonb,
            'Late payment penalties are prohibited on Qard Hasan.',
            'تحظر غرامات التأخير على القرض الحسن.',
            '["QRD-CUR-SAR-001","QRD-LOAN-SAR-001"]'::jsonb,
            '["QARD"]'::jsonb,
            1,
            'SSB-QRD-001'
        ),
        (
            'SHARIAH-QRD-002',
            'Qard admin fee must be actual cost only',
            'يجب أن تقتصر الرسوم الإدارية على التكلفة الفعلية',
            'Require documented flat admin fees and prohibit profit-like fee structures on Qard Hasan.',
            'يتطلب رسوماً إدارية مقطوعة موثقة ويمنع الرسوم التي تشبه الفائدة في القرض الحسن.',
            'QARD',
            'VALIDATION',
            'BLOCKING',
            'adminFeeJustified == true',
            '{"control":"ACTUAL_COST_ONLY"}'::jsonb,
            'Qard admin fee must represent documented actual cost only.',
            'يجب أن تمثل الرسوم الإدارية تكلفة فعلية موثقة فقط.',
            '["QRD-LOAN-SAR-001"]'::jsonb,
            '["QARD"]'::jsonb,
            2,
            'SSB-QRD-002'
        )
) AS seed(
    rule_code, name, name_ar, description, description_ar, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, error_message_ar, applicable_products,
    applicable_modules, priority, shariah_board_resolution
)
WHERE NOT EXISTS (
    SELECT 1 FROM business_rule br WHERE br.rule_code = seed.rule_code AND br.tenant_id IS NULL
);
