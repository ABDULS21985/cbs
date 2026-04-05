-- V108: Zakat computation, ZATCA hooks, and SSB-linked methodology governance

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cbs.zakat_methodology (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    methodology_code                VARCHAR(80) NOT NULL UNIQUE,
    name                            VARCHAR(200) NOT NULL,
    name_ar                         VARCHAR(200),
    description                     TEXT,
    description_ar                  TEXT,
    method_type                     VARCHAR(30) NOT NULL CHECK (method_type IN ('NET_ASSETS','EQUITY_APPROACH','MODIFIED_NET_ASSETS','CUSTOM')),
    zakat_rate_basis                VARCHAR(20) NOT NULL CHECK (zakat_rate_basis IN ('HIJRI_YEAR','GREGORIAN_YEAR')),
    balance_method                  VARCHAR(20) NOT NULL CHECK (balance_method IN ('MINIMUM_BALANCE','AVERAGE_BALANCE','END_OF_YEAR','HIGHEST_BALANCE')),
    nisab_basis                     VARCHAR(20) NOT NULL CHECK (nisab_basis IN ('GOLD_85G','SILVER_595G','ZATCA_FIXED')),
    customer_zakat_deduction_policy VARCHAR(30) NOT NULL CHECK (customer_zakat_deduction_policy IN ('MANDATORY_SAUDI_NATIONALS','OPT_IN','BANK_DISCRETION','NOT_APPLICABLE')),
    iah_treatment                   VARCHAR(20) NOT NULL CHECK (iah_treatment IN ('DEDUCTIBLE','NON_DEDUCTIBLE','PARTIAL')),
    per_irr_treatment               VARCHAR(20) NOT NULL CHECK (per_irr_treatment IN ('DEDUCTIBLE','NON_DEDUCTIBLE','PER_SSB_RULING')),
    fatwa_id                        BIGINT REFERENCES cbs.fatwa_record(id),
    fatwa_ref                       VARCHAR(60),
    ssb_approved                    BOOLEAN NOT NULL DEFAULT FALSE,
    ssb_approval_date               DATE,
    ssb_approved_by                 VARCHAR(100),
    ssb_review_frequency            VARCHAR(20) NOT NULL CHECK (ssb_review_frequency IN ('ANNUAL','BI_ANNUAL','ON_CHANGE')),
    next_ssb_review_date            DATE,
    zatca_accepted                  BOOLEAN,
    zatca_acceptance_ref            VARCHAR(120),
    classification_rule_set_code    VARCHAR(80) NOT NULL,
    effective_from                  DATE NOT NULL,
    effective_to                    DATE,
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','UNDER_REVIEW','RETIRED')),
    methodology_version             INT NOT NULL DEFAULT 1,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_zakat_methodology_status_effective
    ON cbs.zakat_methodology (status, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_zakat_methodology_tenant
    ON cbs.zakat_methodology (tenant_id, methodology_code);

CREATE TABLE IF NOT EXISTS cbs.zakat_classification_rule (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code                   VARCHAR(80) NOT NULL UNIQUE,
    name                        VARCHAR(200) NOT NULL,
    name_ar                     VARCHAR(200),
    description                 TEXT,
    description_ar              TEXT,
    methodology_code            VARCHAR(80) NOT NULL,
    gl_account_pattern          VARCHAR(80) NOT NULL,
    islamic_account_category    VARCHAR(80),
    zakat_classification        VARCHAR(40) NOT NULL CHECK (zakat_classification IN ('ZAKATABLE_ASSET','NON_ZAKATABLE_ASSET','DEDUCTIBLE_LIABILITY','NON_DEDUCTIBLE_LIABILITY')),
    sub_category                VARCHAR(80),
    valuation_method            VARCHAR(30) NOT NULL CHECK (valuation_method IN ('BOOK_VALUE','MARKET_VALUE','NET_REALISABLE_VALUE','LOWER_OF_COST_AND_MARKET')),
    deduct_provisions           BOOLEAN NOT NULL DEFAULT FALSE,
    deduct_deferred_profit      BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_basis               TEXT,
    zatca_article_ref           VARCHAR(120),
    is_debated                  BOOLEAN NOT NULL DEFAULT FALSE,
    alternative_classification  TEXT,
    approved_by_ssb             BOOLEAN NOT NULL DEFAULT FALSE,
    ssb_approval_ref            VARCHAR(120),
    approved_by_zatca           BOOLEAN,
    effective_from              DATE NOT NULL,
    effective_to                DATE,
    priority                    INT NOT NULL DEFAULT 100,
    status                      VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','INACTIVE','UNDER_REVIEW')),
    tenant_id                   BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0,
    CONSTRAINT fk_zakat_rule_methodology_code FOREIGN KEY (methodology_code)
        REFERENCES cbs.zakat_methodology(methodology_code)
);

CREATE INDEX IF NOT EXISTS idx_zakat_classification_rule_methodology
    ON cbs.zakat_classification_rule (methodology_code, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_zakat_classification_rule_effective
    ON cbs.zakat_classification_rule (effective_from, effective_to);

CREATE TABLE IF NOT EXISTS cbs.zakat_computation (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    computation_ref                 VARCHAR(80) NOT NULL UNIQUE,
    computation_type                VARCHAR(40) NOT NULL CHECK (computation_type IN ('BANK_ZAKAT','CUSTOMER_ZAKAT_AGGREGATE','CUSTOMER_ZAKAT_INDIVIDUAL')),
    customer_id                     BIGINT,
    customer_name                   VARCHAR(200),
    zakat_year                      INT NOT NULL,
    zakat_year_gregorian            INT,
    period_from                     DATE,
    period_to                       DATE,
    period_from_hijri               VARCHAR(120),
    period_to_hijri                 VARCHAR(120),
    computation_date                DATE,
    methodology_code                VARCHAR(80) NOT NULL,
    methodology_description         TEXT,
    methodology_approval_id         BIGINT,
    methodology_approved_by_ssb     BOOLEAN NOT NULL DEFAULT FALSE,
    zakatable_assets                NUMERIC(22,2) NOT NULL DEFAULT 0,
    non_zakatable_assets            NUMERIC(22,2) NOT NULL DEFAULT 0,
    total_assets                    NUMERIC(22,2) NOT NULL DEFAULT 0,
    deductible_liabilities          NUMERIC(22,2) NOT NULL DEFAULT 0,
    zakat_base                      NUMERIC(22,2) NOT NULL DEFAULT 0,
    asset_breakdown                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    liability_breakdown             JSONB NOT NULL DEFAULT '{}'::jsonb,
    excluded_asset_breakdown        JSONB NOT NULL DEFAULT '{}'::jsonb,
    zakat_rate                      NUMERIC(10,6) NOT NULL DEFAULT 0,
    zakat_rate_basis                VARCHAR(20) CHECK (zakat_rate_basis IN ('HIJRI_YEAR','GREGORIAN_YEAR')),
    zakat_amount                    NUMERIC(22,2) NOT NULL DEFAULT 0,
    currency_code                   VARCHAR(3),
    adjustments                     JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_adjustments               NUMERIC(22,2) NOT NULL DEFAULT 0,
    adjusted_zakat_amount           NUMERIC(22,2) NOT NULL DEFAULT 0,
    zatca_return_id                 UUID,
    zatca_assessment_ref            VARCHAR(120),
    status                          VARCHAR(30) NOT NULL CHECK (status IN ('DRAFT','CALCULATED','SSB_REVIEWED','APPROVED','FILED_WITH_ZATCA','ZATCA_ASSESSED','PAID','CLOSED')),
    calculated_by                   VARCHAR(100),
    calculated_at                   TIMESTAMPTZ,
    ssb_reviewed_by                 VARCHAR(100),
    ssb_reviewed_at                 TIMESTAMPTZ,
    ssb_comments                    TEXT,
    approved_by                     VARCHAR(100),
    approved_at                     TIMESTAMPTZ,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_zakat_computation_type_year
    ON cbs.zakat_computation (computation_type, zakat_year);
CREATE INDEX IF NOT EXISTS idx_zakat_computation_customer_year
    ON cbs.zakat_computation (customer_id, zakat_year);
CREATE INDEX IF NOT EXISTS idx_zakat_computation_status
    ON cbs.zakat_computation (status, calculated_at DESC);

CREATE TABLE IF NOT EXISTS cbs.zakat_computation_line_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    computation_id      UUID NOT NULL REFERENCES cbs.zakat_computation(id) ON DELETE CASCADE,
    line_number         VARCHAR(20) NOT NULL,
    category            VARCHAR(40) NOT NULL CHECK (category IN ('ZAKATABLE_ASSET','NON_ZAKATABLE_ASSET','DEDUCTIBLE_LIABILITY','NON_DEDUCTIBLE_LIABILITY')),
    sub_category        VARCHAR(80),
    description         VARCHAR(250),
    description_ar      VARCHAR(250),
    gl_account_code     VARCHAR(40),
    amount              NUMERIC(22,2) NOT NULL DEFAULT 0,
    is_included_in_base BOOLEAN NOT NULL DEFAULT TRUE,
    exclusion_reason    TEXT,
    classification_rule VARCHAR(80),
    manual_override     BOOLEAN NOT NULL DEFAULT FALSE,
    override_by         VARCHAR(100),
    override_reason     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_zakat_computation_line_item_comp
    ON cbs.zakat_computation_line_item (computation_id, line_number);

CREATE TABLE IF NOT EXISTS cbs.zatca_return (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_ref              VARCHAR(80) NOT NULL UNIQUE,
    computation_id          UUID NOT NULL REFERENCES cbs.zakat_computation(id) ON DELETE CASCADE,
    zakat_year              INT NOT NULL,
    return_type             VARCHAR(30) NOT NULL CHECK (return_type IN ('ANNUAL_ZAKAT','AMENDED_ZAKAT','PROVISIONAL_ZAKAT')),
    filing_method           VARCHAR(30) NOT NULL CHECK (filing_method IN ('ELECTRONIC_PORTAL','API','MANUAL')),
    zatca_form_data         JSONB NOT NULL DEFAULT '{}'::jsonb,
    filing_date             DATE,
    filing_confirmation_ref VARCHAR(120),
    filed_by                VARCHAR(100),
    assessment_date         DATE,
    assessment_ref          VARCHAR(120),
    assessed_zakat_amount   NUMERIC(22,2),
    assessment_difference   NUMERIC(22,2),
    assessment_status       VARCHAR(20) CHECK (assessment_status IN ('PENDING','ACCEPTED','ADJUSTED','APPEALED')),
    assessment_notes        TEXT,
    payment_due_date        DATE,
    payment_amount          NUMERIC(22,2),
    payment_date            DATE,
    payment_ref             VARCHAR(120),
    payment_status          VARCHAR(20) CHECK (payment_status IN ('NOT_DUE','DUE','PAID','OVERDUE','PARTIALLY_PAID')),
    appeal_filed            BOOLEAN NOT NULL DEFAULT FALSE,
    appeal_date             DATE,
    appeal_ref              VARCHAR(120),
    appeal_reason           TEXT,
    appeal_outcome          VARCHAR(25) CHECK (appeal_outcome IN ('PENDING','UPHELD','PARTIALLY_UPHELD','DISMISSED')),
    appeal_outcome_date     DATE,
    status                  VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','PREPARED','FILED','ASSESSED','PAID','CLOSED','APPEALED')),
    tenant_id               BIGINT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT DEFAULT 0,
    CONSTRAINT uk_zatca_return_computation UNIQUE (computation_id)
);

CREATE INDEX IF NOT EXISTS idx_zatca_return_year_status
    ON cbs.zatca_return (zakat_year, status, filing_date DESC);

INSERT INTO cbs.zakat_methodology (
    methodology_code, name, name_ar, description, description_ar,
    method_type, zakat_rate_basis, balance_method, nisab_basis,
    customer_zakat_deduction_policy, iah_treatment, per_irr_treatment,
    fatwa_ref, ssb_approved, ssb_approval_date, ssb_approved_by, ssb_review_frequency,
    next_ssb_review_date, zatca_accepted, zatca_acceptance_ref,
    classification_rule_set_code, effective_from, status, methodology_version,
    created_by, updated_by
)
SELECT
    'ZKT-MTHD-KSA-STD', 'KSA Standard Bank Zakat Methodology', 'منهجية الزكاة القياسية في المملكة',
    'Default bank Zakat methodology aligned to KSA bank practice, ZATCA filing requirements, and SSB approval workflow.',
    'المنهجية الافتراضية لزكاة البنك بما يتوافق مع الممارسة المحلية ومتطلبات هيئة الزكاة والضريبة والجمارك واعتماد الهيئة الشرعية.',
    'NET_ASSETS', 'HIJRI_YEAR', 'END_OF_YEAR', 'GOLD_85G',
    'MANDATORY_SAUDI_NATIONALS', 'DEDUCTIBLE', 'PER_SSB_RULING',
    'SSB-ZKT-001', TRUE, CURRENT_DATE, 'SYSTEM', 'ANNUAL',
    CURRENT_DATE + INTERVAL '1 year', TRUE, 'ZATCA-ZKT-MTHD-001',
    'ZKT-MTHD-KSA-STD', DATE '2026-01-01', 'ACTIVE', 1,
    'SYSTEM', 'SYSTEM'
WHERE NOT EXISTS (
    SELECT 1 FROM cbs.zakat_methodology WHERE methodology_code = 'ZKT-MTHD-KSA-STD'
);

INSERT INTO cbs.zakat_classification_rule (
    rule_code, name, methodology_code, gl_account_pattern, zakat_classification,
    sub_category, valuation_method, deduct_provisions, deduct_deferred_profit,
    shariah_basis, zatca_article_ref, is_debated, alternative_classification,
    approved_by_ssb, ssb_approval_ref, approved_by_zatca, effective_from,
    priority, status, tenant_id, created_by, updated_by
)
SELECT
    seed.rule_code,
    seed.name,
    'ZKT-MTHD-KSA-STD',
    seed.gl_account_pattern,
    seed.zakat_classification,
    seed.sub_category,
    seed.valuation_method,
    seed.deduct_provisions,
    seed.deduct_deferred_profit,
    seed.shariah_basis,
    seed.zatca_article_ref,
    seed.is_debated,
    seed.alternative_classification,
    TRUE,
    'SSB-ZKT-001',
    TRUE,
    DATE '2026-01-01',
    seed.priority,
    'ACTIVE',
    NULL,
    'SYSTEM',
    'SYSTEM'
FROM (
    VALUES
        ('ZKT-CLS-001','Cash and bank balances','1000-*','ZAKATABLE_ASSET','CASH_AND_EQUIVALENTS','BOOK_VALUE',FALSE,FALSE,'AAOIFI FAS 9 and KSA banking practice include cash balances in the Zakat base.','ZATCA-ZK-ART-01',FALSE,NULL,1000),
        ('ZKT-CLS-002','Treasury placements and central bank balances','1100-*','ZAKATABLE_ASSET','PLACEMENTS_AND_BANKS','BOOK_VALUE',FALSE,FALSE,'Short-term liquid placements are treated as zakatable monetary assets.','ZATCA-ZK-ART-02',FALSE,NULL,990),
        ('ZKT-CLS-003','Murabaha receivables net of deferred profit','1200-MRB-001','ZAKATABLE_ASSET','MURABAHA_RECEIVABLE','BOOK_VALUE',TRUE,TRUE,'Murabaha receivables are included net of unrealised deferred profit and impairment.','ZATCA-ZK-ART-03',FALSE,NULL,980),
        ('ZKT-CLS-004','Mudarabah financing receivables','1200-MDR-001','ZAKATABLE_ASSET','MUDARABAH_RECEIVABLE','BOOK_VALUE',TRUE,FALSE,'Mudarabah receivables are included net of provisions.','ZATCA-ZK-ART-03',FALSE,NULL,975),
        ('ZKT-CLS-005','Salam receivables','1200-SLM-*','ZAKATABLE_ASSET','SALAM_RECEIVABLE','NET_REALISABLE_VALUE',TRUE,FALSE,'Salam receivables are included using expected collectible value.','ZATCA-ZK-ART-03',FALSE,NULL,970),
        ('ZKT-CLS-006','Istisna receivables','1200-IST-*','ZAKATABLE_ASSET','ISTISNA_RECEIVABLE','NET_REALISABLE_VALUE',TRUE,FALSE,'Istisna receivables are included using recoverable value.','ZATCA-ZK-ART-03',FALSE,NULL,965),
        ('ZKT-CLS-007','Musharakah investments','1500-MSH-*','ZAKATABLE_ASSET','MUSHARAKAH_INVESTMENT','NET_REALISABLE_VALUE',TRUE,FALSE,'Musharakah investments are included at recoverable value subject to collectability.','ZATCA-ZK-ART-04',TRUE,'Non-zakatable fixed capital view',960),
        ('ZKT-CLS-008','Mudarabah investments as Rab-ul-Maal','1500-MDR-*','ZAKATABLE_ASSET','MUDARABAH_INVESTMENT','NET_REALISABLE_VALUE',TRUE,FALSE,'Mudarabah investments are included in the Zakat base using recoverable value.','ZATCA-ZK-ART-04',TRUE,'Exclude if long-term locked capital by SSB ruling',955),
        ('ZKT-CLS-009','Sukuk holdings for trading or liquidity','1600-SKK-*','ZAKATABLE_ASSET','SUKUK_PORTFOLIO','MARKET_VALUE',FALSE,FALSE,'Tradeable Sukuk are included at market value.','ZATCA-ZK-ART-05',FALSE,NULL,950),
        ('ZKT-CLS-010','Equity investments held for sale','1610-EQT-*','ZAKATABLE_ASSET','EQUITY_HELD_FOR_SALE','MARKET_VALUE',FALSE,FALSE,'Readily marketable equity investments are valued at market value.','ZATCA-ZK-ART-05',TRUE,'Cost basis under specific SSB ruling',945),
        ('ZKT-CLS-011','Ijarah fixed assets','1620-IJR-*','NON_ZAKATABLE_ASSET','IJARAH_ASSETS','BOOK_VALUE',TRUE,FALSE,'Owned assets leased under Ijarah are treated as productive fixed assets rather than trading assets.','ZATCA-ZK-ART-06',FALSE,NULL,940),
        ('ZKT-CLS-012','Credit impairment and ECL provisions','1700-*','NON_ZAKATABLE_ASSET','PROVISIONS','BOOK_VALUE',FALSE,FALSE,'Provision balances are not standalone zakatable assets.','ZATCA-ZK-ART-07',FALSE,NULL,935),
        ('ZKT-CLS-013','Property and equipment','1800-*','NON_ZAKATABLE_ASSET','PROPERTY_AND_EQUIPMENT','BOOK_VALUE',FALSE,FALSE,'Operational fixed assets are excluded from the Zakat base.','ZATCA-ZK-ART-06',FALSE,NULL,930),
        ('ZKT-CLS-014','Accumulated depreciation','1810-*','NON_ZAKATABLE_ASSET','ACCUMULATED_DEPRECIATION','BOOK_VALUE',FALSE,FALSE,'Accumulated depreciation is excluded and used only to support net asset valuation.','ZATCA-ZK-ART-06',FALSE,NULL,925),
        ('ZKT-CLS-015','Intangible and deferred acquisition assets','1900-*','NON_ZAKATABLE_ASSET','INTANGIBLES','BOOK_VALUE',FALSE,FALSE,'Intangible assets and deferred costs are excluded from the Zakat base.','ZATCA-ZK-ART-06',FALSE,NULL,920),
        ('ZKT-CLS-016','Wadiah current account obligations','2100-WAD-001','DEDUCTIBLE_LIABILITY','WADIAH_CURRENT_ACCOUNTS','BOOK_VALUE',FALSE,FALSE,'Current customer obligations are deductible unless methodology overrides IAH treatment.','ZATCA-ZK-ART-08',FALSE,NULL,915),
        ('ZKT-CLS-017','Other short-term customer obligations','2200-*','DEDUCTIBLE_LIABILITY','SHORT_TERM_OBLIGATIONS','BOOK_VALUE',FALSE,FALSE,'Short-term third-party obligations are deductible from the Zakat base.','ZATCA-ZK-ART-08',FALSE,NULL,910),
        ('ZKT-CLS-018','Trade creditors and accrued operating liabilities','2300-*','DEDUCTIBLE_LIABILITY','TRADE_AND_ACCRUALS','BOOK_VALUE',FALSE,FALSE,'Trade creditors and accrued liabilities due within the year are deductible.','ZATCA-ZK-ART-08',FALSE,NULL,905),
        ('ZKT-CLS-019','Short-term financing and settlement liabilities','2400-*','DEDUCTIBLE_LIABILITY','SETTLEMENT_LIABILITIES','BOOK_VALUE',FALSE,FALSE,'Short-term financing and settlement liabilities are deductible.','ZATCA-ZK-ART-08',FALSE,NULL,900),
        ('ZKT-CLS-020','Unrestricted investment accounts','3100-MDR-001','DEDUCTIBLE_LIABILITY','UNRESTRICTED_INVESTMENT_ACCOUNTS','BOOK_VALUE',FALSE,FALSE,'Investment account obligations are deductible unless methodology overrides IAH treatment.','ZATCA-ZK-ART-09',TRUE,'Treat as non-deductible equity-like funds under alternative SSB approach',895),
        ('ZKT-CLS-021','Profit equalisation reserve','3200-000-001','DEDUCTIBLE_LIABILITY','PROFIT_EQUALISATION_RESERVE','BOOK_VALUE',FALSE,FALSE,'PER treatment follows SSB-approved methodology and is deductible by default.','ZATCA-ZK-ART-10',TRUE,'Treat as non-deductible reserve under stricter methodology',890),
        ('ZKT-CLS-022','Investment risk reserve','3300-000-001','DEDUCTIBLE_LIABILITY','INVESTMENT_RISK_RESERVE','BOOK_VALUE',FALSE,FALSE,'IRR treatment follows SSB-approved methodology and is deductible by default.','ZATCA-ZK-ART-10',TRUE,'Treat as non-deductible reserve under stricter methodology',885),
        ('ZKT-CLS-023','Owners capital and retained earnings','4100-*','NON_DEDUCTIBLE_LIABILITY','OWNERS_EQUITY','BOOK_VALUE',FALSE,FALSE,'Owners equity is not a deductible liability for Zakat base computation.','ZATCA-ZK-ART-11',FALSE,NULL,880),
        ('ZKT-CLS-024','Statutory and fair value reserves','4200-*','NON_DEDUCTIBLE_LIABILITY','OWNERS_RESERVES','BOOK_VALUE',FALSE,FALSE,'Statutory reserves are not deductible from the Zakat base.','ZATCA-ZK-ART-11',FALSE,NULL,875),
        ('ZKT-CLS-025','Retained earnings and distributable reserves','4300-*','NON_DEDUCTIBLE_LIABILITY','RETAINED_EARNINGS','BOOK_VALUE',FALSE,FALSE,'Retained earnings are equity items and not deductible liabilities.','ZATCA-ZK-ART-11',FALSE,NULL,870),
        ('ZKT-CLS-026','Fair value reserves on Islamic investments','4400-*','NON_DEDUCTIBLE_LIABILITY','FAIR_VALUE_RESERVES','BOOK_VALUE',FALSE,FALSE,'Fair value reserves remain part of equity and are not deductible.','ZATCA-ZK-ART-11',FALSE,NULL,865)
) AS seed(rule_code, name, gl_account_pattern, zakat_classification, sub_category, valuation_method, deduct_provisions, deduct_deferred_profit, shariah_basis, zatca_article_ref, is_debated, alternative_classification, priority)
WHERE NOT EXISTS (
    SELECT 1 FROM cbs.zakat_classification_rule r WHERE r.rule_code = seed.rule_code
);

INSERT INTO business_rule (
    rule_code, name, name_ar, description, description_ar,
    category, sub_category, rule_type, severity, evaluation_expression,
    parameters, error_message, error_message_ar, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at,
    tenant_id, created_by, updated_by
)
SELECT
    seed.rule_code,
    seed.name,
    seed.name_ar,
    seed.description,
    seed.description_ar,
    seed.category,
    seed.sub_category,
    seed.rule_type,
    seed.severity,
    seed.evaluation_expression,
    seed.parameters::jsonb,
    seed.error_message,
    seed.error_message_ar,
    '[]'::jsonb,
    '["ZAKAT"]'::jsonb,
    DATE '2026-01-01',
    'ACTIVE',
    seed.priority,
    'SSB-ZKT-001',
    'SYSTEM',
    NOW(),
    NULL,
    'SYSTEM',
    'SYSTEM'
FROM (
    VALUES
    ('ZKT-001','SSB approval required before use','يتطلب اعتماد الهيئة الشرعية قبل الاستخدام','Blocks any Zakat computation unless the selected methodology is SSB approved and active.','يمنع أي احتساب للزكاة ما لم تكن المنهجية المختارة معتمدة ونشطة من الهيئة الشرعية.','SHARIAH_COMPLIANCE','METHODOLOGY_APPROVAL','VALIDATION','BLOCKING','methodology.ssbApproved == true && methodology.status == ''ACTIVE''','{"control":"ST-016"}','Zakat methodology must be SSB approved before computation.','يجب اعتماد منهجية الزكاة من الهيئة الشرعية قبل الاحتساب.',1000),
    ('ZKT-002','Customer Nisab threshold','حد النصاب للعميل','Customer Zakat is due only when the aggregate zakatable balance equals or exceeds the applicable Nisab threshold.','تستحق زكاة العميل فقط عندما يبلغ مجموع الرصيد الخاضع للزكاة النصاب المطبق أو يتجاوزه.','ELIGIBILITY','CUSTOMER_NISAB','THRESHOLD','BLOCKING','customer.totalZakatableBalance >= customer.nisabThreshold','{"basis":"NISAB"}','Customer Zakat balance is below Nisab threshold.','رصيد الزكاة للعميل أقل من حد النصاب.',990),
        ('ZKT-003','Haul completion for customer balances','اكتمال الحول لأرصدة العميل','Customer balances must complete one Hijri year before being included in customer Zakat.','يجب أن تكمل أرصدة العميل سنة هجرية كاملة قبل إدراجها في زكاة العميل.','ELIGIBILITY','CUSTOMER_HAUL','ELIGIBILITY','BLOCKING','account.haulMet == true','{"basis":"HIJRI_YEAR"}','Customer balance has not completed one Hijri year.','لم يُكمل رصيد العميل سنة هجرية كاملة.',980),
        ('ZKT-004','GL classification must reconcile','يجب أن تتطابق تصنيفات دفتر الأستاذ','Bank Zakat computation must reconcile classified assets to the balance sheet total before approval.','يجب أن تتطابق الأصول المصنفة مع إجمالي الميزانية العمومية قبل اعتماد احتساب زكاة البنك.','ACCOUNTING','GL_RECONCILIATION','VALIDATION','BLOCKING','classified.totalAssets == gl.totalAssets','{"tolerance":"0.01"}','Classified GL totals do not reconcile to the balance sheet.','إجماليات الحسابات المصنفة لا تتطابق مع الميزانية العمومية.',970)
) AS seed(rule_code, name, name_ar, description, description_ar, category, sub_category, rule_type, severity, evaluation_expression, parameters, error_message, error_message_ar, priority)
WHERE NOT EXISTS (
    SELECT 1 FROM business_rule br WHERE LOWER(br.rule_code) = LOWER(seed.rule_code) AND br.tenant_id IS NULL
);

INSERT INTO system_parameter (
    param_key, param_category, param_value, value_type, description, effective_from,
    tenant_id, branch_id, is_encrypted, is_active, last_modified_by, approval_status, approved_by
)
SELECT
    seed.param_key,
    'TAX',
    seed.param_value,
    seed.value_type,
    seed.description,
    NOW(),
    NULL,
    NULL,
    FALSE,
    TRUE,
    'SYSTEM',
    'APPROVED',
    'SYSTEM'
FROM (
    VALUES
        ('zakat.nisab.gold-price-per-gram-sar','320','DECIMAL','Default gold price per gram in SAR used for Nisab fallback.'),
        ('zakat.nisab.silver-price-per-gram-sar','4','DECIMAL','Default silver price per gram in SAR used for Nisab fallback.'),
        ('zakat.nisab.fixed-sar','20000','DECIMAL','Fallback fixed Nisab threshold in SAR when a fixed basis is selected.')
) AS seed(param_key, param_value, value_type, description)
WHERE NOT EXISTS (
    SELECT 1 FROM system_parameter sp WHERE sp.param_key = seed.param_key AND sp.tenant_id IS NULL AND sp.is_active = TRUE
);