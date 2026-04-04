SET search_path TO cbs;

ALTER TABLE IF EXISTS product_template
    DROP CONSTRAINT IF EXISTS product_template_status_check;

ALTER TABLE IF EXISTS product_template
    ADD CONSTRAINT product_template_status_check
        CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED'));

CREATE TABLE IF NOT EXISTS islamic_contract_types (
    id                        BIGSERIAL PRIMARY KEY,
    code                      VARCHAR(30) NOT NULL,
    name                      VARCHAR(200) NOT NULL,
    name_ar                   VARCHAR(200),
    description               TEXT,
    description_ar            TEXT,
    category                  VARCHAR(30) NOT NULL CHECK (category IN (
                                  'SALE_BASED', 'LEASE_BASED', 'PARTNERSHIP_BASED', 'AGENCY_BASED',
                                  'GUARANTEE', 'SAFEKEEPING', 'FORWARD_SALE'
                              )),
    shariah_basis             TEXT,
    shariah_basis_ar          TEXT,
    required_product_fields   JSONB NOT NULL DEFAULT '[]'::jsonb,
    shariah_rule_group_code   VARCHAR(120),
    key_shariah_principles    JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_shariah_principles_ar JSONB NOT NULL DEFAULT '[]'::jsonb,
    prohibitions              JSONB NOT NULL DEFAULT '[]'::jsonb,
    prohibitions_ar           JSONB NOT NULL DEFAULT '[]'::jsonb,
    accounting_treatment      VARCHAR(30) NOT NULL CHECK (accounting_treatment IN (
                                  'AMORTISED_COST', 'FAIR_VALUE_PL', 'FAIR_VALUE_OCI', 'OFF_BALANCE_SHEET'
                              )),
    aaoifi_standard           VARCHAR(40),
    ifsb_standard             VARCHAR(40),
    basel_treatment           TEXT,
    applicable_categories     JSONB NOT NULL DEFAULT '[]'::jsonb,
    icon_code                 VARCHAR(60),
    display_order             INT NOT NULL DEFAULT 100,
    status                    VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED')),
    tenant_id                 BIGINT,
    created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                VARCHAR(100),
    updated_by                VARCHAR(100),
    version                   BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS islamic_product_templates (
    id                              BIGSERIAL PRIMARY KEY,
    base_product_id                 BIGINT NOT NULL REFERENCES product_template(id),
    product_code                    VARCHAR(30) NOT NULL,
    name                            VARCHAR(200) NOT NULL,
    name_ar                         VARCHAR(200) NOT NULL,
    description                     TEXT,
    description_ar                  TEXT,
    contract_type_id                BIGINT NOT NULL REFERENCES islamic_contract_types(id),
    product_category                VARCHAR(20) NOT NULL CHECK (product_category IN (
                                      'FINANCING', 'DEPOSIT', 'INVESTMENT', 'INSURANCE', 'TRADE', 'GUARANTEE', 'AGENCY', 'SUKUK'
                                    )),
    sub_category                    VARCHAR(80),
    profit_calculation_method       VARCHAR(40) NOT NULL CHECK (profit_calculation_method IN (
                                      'COST_PLUS_MARKUP', 'PROFIT_SHARING_RATIO', 'RENTAL_RATE', 'EXPECTED_PROFIT_RATE', 'COMMISSION_BASED'
                                    )),
    profit_rate_type                VARCHAR(20) CHECK (profit_rate_type IN ('FIXED', 'VARIABLE', 'TIERED', 'STEP_UP', 'STEP_DOWN')),
    base_rate                       NUMERIC(19, 6),
    base_rate_reference             VARCHAR(60),
    margin                          NUMERIC(19, 6),
    fixed_profit_rate               NUMERIC(19, 6),
    profit_rate_decision_table_code VARCHAR(100),
    profit_distribution_frequency   VARCHAR(20) CHECK (profit_distribution_frequency IN (
                                      'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'AT_MATURITY', 'ON_SALE'
                                    )),
    profit_distribution_method      VARCHAR(30) CHECK (profit_distribution_method IN (
                                      'ACTUAL_PROFIT', 'INDICATIVE_RATE_SMOOTHED', 'EXPECTED_PROFIT_RATE'
                                    )),
    bank_share_percentage           NUMERIC(10, 4),
    customer_share_percentage       NUMERIC(10, 4),
    profit_sharing_ratio_bank       NUMERIC(10, 4),
    profit_sharing_ratio_customer   NUMERIC(10, 4),
    loss_sharing_method             VARCHAR(30) CHECK (loss_sharing_method IN (
                                      'PROPORTIONAL_TO_CAPITAL', 'BANK_ABSORBS_FIRST', 'CUSTOM'
                                    )),
    diminishing_schedule            BOOLEAN NOT NULL DEFAULT FALSE,
    diminishing_frequency           VARCHAR(20) CHECK (diminishing_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
    diminishing_units_total         INT,
    markup_rate                     NUMERIC(19, 6),
    cost_price_required             BOOLEAN NOT NULL DEFAULT FALSE,
    selling_price_immutable         BOOLEAN NOT NULL DEFAULT FALSE,
    grace_period_days               INT,
    late_penalty_to_charity         BOOLEAN NOT NULL DEFAULT FALSE,
    charity_gl_account_code         VARCHAR(40),
    asset_ownership_during_tenor    VARCHAR(20) CHECK (asset_ownership_during_tenor IN ('BANK_OWNED', 'CUSTOMER_OWNED', 'JOINT')),
    asset_transfer_on_completion    BOOLEAN,
    rental_review_frequency         VARCHAR(20) CHECK (rental_review_frequency IN ('NONE', 'ANNUAL', 'BI_ANNUAL', 'AS_PER_CONTRACT')),
    maintenance_responsibility      VARCHAR(20) CHECK (maintenance_responsibility IN ('BANK', 'CUSTOMER', 'SHARED')),
    insurance_responsibility        VARCHAR(20) CHECK (insurance_responsibility IN ('BANK', 'CUSTOMER')),
    takaful_model                   VARCHAR(20) CHECK (takaful_model IN ('MUDARABAH', 'WAKALAH', 'HYBRID')),
    wakalah_fee_percentage          NUMERIC(10, 4),
    takaful_pool_separation         BOOLEAN,
    aaoifi_standard                 VARCHAR(40),
    ifsb_standard                   VARCHAR(40),
    regulatory_product_code         VARCHAR(60),
    risk_weight_percentage          NUMERIC(10, 4),
    active_fatwa_id                 BIGINT REFERENCES fatwa_record(id),
    fatwa_required                  BOOLEAN NOT NULL DEFAULT TRUE,
    shariah_compliance_status       VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (shariah_compliance_status IN (
                                      'DRAFT', 'PENDING_FATWA', 'FATWA_ISSUED', 'COMPLIANT', 'NON_COMPLIANT', 'SUSPENDED', 'RETIRED'
                                    )),
    last_shariah_review_date        DATE,
    next_shariah_review_date        DATE,
    shariah_rule_group_code         VARCHAR(120),
    status                          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
                                      'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED'
                                    )),
    effective_from                  DATE NOT NULL,
    effective_to                    DATE,
    product_version                 INT NOT NULL DEFAULT 1,
    current_version_id              BIGINT,
    approved_by                     VARCHAR(100),
    approved_at                     TIMESTAMP WITH TIME ZONE,
    min_amount                      NUMERIC(19, 4) NOT NULL DEFAULT 0,
    max_amount                      NUMERIC(19, 4),
    min_tenor_months                INT NOT NULL DEFAULT 0,
    max_tenor_months                INT NOT NULL DEFAULT 0,
    currencies                      JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligible_customer_types         JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligible_segments               JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligible_countries              JSONB NOT NULL DEFAULT '[]'::jsonb,
    financing_asset_gl              VARCHAR(40),
    profit_receivable_gl            VARCHAR(40),
    profit_income_gl                VARCHAR(40),
    deposit_liability_gl            VARCHAR(40),
    profit_payable_gl               VARCHAR(40),
    profit_expense_gl               VARCHAR(40),
    charity_gl                      VARCHAR(40),
    takaful_pool_gl                 VARCHAR(40),
    suspense_gl                     VARCHAR(40),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS islamic_product_parameters (
    id                  BIGSERIAL PRIMARY KEY,
    product_template_id BIGINT NOT NULL REFERENCES islamic_product_templates(id) ON DELETE CASCADE,
    parameter_name      VARCHAR(120) NOT NULL,
    parameter_value     TEXT,
    parameter_type      VARCHAR(20) NOT NULL CHECK (parameter_type IN ('STRING', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'DATE', 'JSON')),
    description         VARCHAR(500),
    description_ar      VARCHAR(500),
    is_editable         BOOLEAN NOT NULL DEFAULT TRUE,
    validation_rule     VARCHAR(500),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS islamic_product_versions (
    id                    BIGSERIAL PRIMARY KEY,
    product_template_id   BIGINT NOT NULL REFERENCES islamic_product_templates(id) ON DELETE CASCADE,
    version_number        INT NOT NULL,
    product_snapshot      JSONB NOT NULL,
    change_description    VARCHAR(500) NOT NULL,
    change_type           VARCHAR(30) NOT NULL CHECK (change_type IN (
                              'CREATED', 'MATERIAL_CHANGE', 'NON_MATERIAL_CHANGE', 'FATWA_LINKED', 'FATWA_UNLINKED', 'STATUS_CHANGE', 'PARAMETER_CHANGE'
                            )),
    is_material_change    BOOLEAN NOT NULL DEFAULT FALSE,
    changed_fields        JSONB NOT NULL DEFAULT '[]'::jsonb,
    changed_by            VARCHAR(100) NOT NULL,
    changed_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ssb_review_request_id BIGINT REFERENCES ssb_review_request(id),
    ssb_review_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (ssb_review_status IN (
                              'NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'
                            )),
    previous_version_id   BIGINT REFERENCES islamic_product_versions(id),
    version               BIGINT NOT NULL DEFAULT 0,
    UNIQUE (product_template_id, version_number)
);

ALTER TABLE IF EXISTS islamic_product_templates
    ADD CONSTRAINT fk_islamic_product_templates_current_version
        FOREIGN KEY (current_version_id) REFERENCES islamic_product_versions(id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_islamic_contract_types_code_tenant
    ON islamic_contract_types (LOWER(code), COALESCE(tenant_id, -1));
CREATE INDEX IF NOT EXISTS idx_islamic_contract_types_category_status
    ON islamic_contract_types (category, status);

CREATE UNIQUE INDEX IF NOT EXISTS uk_islamic_product_templates_code_tenant
    ON islamic_product_templates (LOWER(product_code), COALESCE(tenant_id, -1));
CREATE UNIQUE INDEX IF NOT EXISTS uk_islamic_product_templates_base_product
    ON islamic_product_templates (base_product_id);
CREATE INDEX IF NOT EXISTS idx_islamic_product_templates_contract_type
    ON islamic_product_templates (contract_type_id);
CREATE INDEX IF NOT EXISTS idx_islamic_product_templates_status_compliance
    ON islamic_product_templates (status, shariah_compliance_status);
CREATE INDEX IF NOT EXISTS idx_islamic_product_templates_active_fatwa
    ON islamic_product_templates (active_fatwa_id);
CREATE INDEX IF NOT EXISTS idx_islamic_product_templates_next_review
    ON islamic_product_templates (next_shariah_review_date);
CREATE INDEX IF NOT EXISTS idx_islamic_product_templates_base_product_id
    ON islamic_product_templates (base_product_id);

CREATE INDEX IF NOT EXISTS idx_islamic_product_parameters_template
    ON islamic_product_parameters (product_template_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_islamic_product_parameters_name
    ON islamic_product_parameters (product_template_id, LOWER(parameter_name));

CREATE INDEX IF NOT EXISTS idx_islamic_product_versions_template_version
    ON islamic_product_versions (product_template_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_islamic_product_versions_ssb_review
    ON islamic_product_versions (ssb_review_request_id);

INSERT INTO islamic_contract_types (
    code, name, name_ar, description, description_ar, category,
    shariah_basis, shariah_basis_ar, required_product_fields, shariah_rule_group_code,
    key_shariah_principles, key_shariah_principles_ar, prohibitions, prohibitions_ar,
    accounting_treatment, aaoifi_standard, ifsb_standard, basel_treatment,
    applicable_categories, icon_code, display_order, status, tenant_id, created_by, updated_by
)
VALUES
    (
        'MURABAHA',
        'Murabaha - Cost-Plus Sale',
        'المرابحة - البيع بالتكلفة مع هامش ربح',
        'Sale contract where the institution discloses acquisition cost and sells at a fixed markup.',
        'عقد بيع يفصح فيه المصرف عن تكلفة التملك ويبيع بهامش ربح ثابت.',
        'SALE_BASED',
        'Bank acquires the asset first, then sells it to the customer at a disclosed markup.',
        'يتملك المصرف الأصل أولاً ثم يبيعه للعميل بهامش ربح معلوم.',
        '["markupRate","costPriceRequired","sellingPriceImmutable","gracePeriodDays","latePenaltyToCharity","charityGlAccountCode"]'::jsonb,
        'MURABAHA',
        '["Cost price must be disclosed","Selling price fixed at signing","Bank must own asset before sale","Late penalties must be routed to charity"]'::jsonb,
        '["يجب الإفصاح عن سعر التكلفة","يثبت سعر البيع عند التعاقد","يجب أن يتملك المصرف الأصل قبل البيع","توجه غرامات التأخير للأعمال الخيرية"]'::jsonb,
        '["Cannot increase selling price after contract execution","Cannot charge compound interest","Cannot sell an asset not yet owned"]'::jsonb,
        '["لا يجوز زيادة سعر البيع بعد التعاقد","لا يجوز احتساب فائدة مركبة","لا يجوز بيع أصل غير مملوك"]'::jsonb,
        'AMORTISED_COST', 'FAS 28', 'IFSB-1',
        'Recognise receivable at selling price less unearned income; capital treatment follows receivables rules.',
        '["FINANCING","TRADE"]'::jsonb,
        'shopping-cart', 10, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'IJARAH',
        'Ijarah - Lease',
        'الإجارة - عقد الإيجار',
        'Lease contract where usufruct is transferred for a rent while asset ownership remains with the lessor.',
        'عقد تنتقل فيه المنفعة مقابل أجرة مع بقاء ملكية الأصل للمؤجر.',
        'LEASE_BASED',
        'Bank retains ownership and leases the asset to the customer for agreed rentals.',
        'يحتفظ المصرف بملكية الأصل ويؤجره للعميل بأجرة معلومة.',
        '["assetOwnershipDuringTenor","maintenanceResponsibility","insuranceResponsibility"]'::jsonb,
        'IJARAH',
        '["Ownership remains with lessor during lease","Major maintenance follows ownership","Lease rentals must be agreed","Transfer at end requires separate undertaking"]'::jsonb,
        '["تبقى الملكية للمؤجر خلال مدة الإجارة","تتبع الصيانة الأساسية الملكية","يجب الاتفاق على الأجرة","يتطلب نقل الملكية في النهاية تعهداً مستقلاً"]'::jsonb,
        '["Cannot lease an asset not yet owned","Cannot transfer all ownership risk to lessee","Cannot charge rent after asset destruction"]'::jsonb,
        '["لا يجوز تأجير أصل غير مملوك","لا يجوز نقل كامل مخاطر الملكية إلى المستأجر","لا يجوز استحقاق الأجرة بعد هلاك الأصل"]'::jsonb,
        'AMORTISED_COST', 'FAS 8', 'IFSB-1',
        'Recognise leased asset and rental income per lease terms with ownership obligations retained by bank.',
        '["FINANCING","INSURANCE"]'::jsonb,
        'car-front', 20, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'MUDARABAH',
        'Mudarabah - Profit-Sharing Partnership',
        'المضاربة - شراكة تقاسم الأرباح',
        'Partnership where one party provides capital and the other provides management expertise.',
        'شراكة يقدم فيها طرف رأس المال ويقدم الطرف الآخر الإدارة والخبرة.',
        'PARTNERSHIP_BASED',
        'Profits are shared by agreement while losses are borne by capital provider except in negligence.',
        'توزع الأرباح حسب الاتفاق وتتحمل الخسائر على رب المال إلا عند التعدي أو التقصير.',
        '["profitSharingRatioBank","profitSharingRatioCustomer","lossSharingMethod"]'::jsonb,
        'MUDARABAH',
        '["Profit sharing must be ratio based","Capital provider cannot guarantee profit","Loss follows capital unless negligence is proven"]'::jsonb,
        '["يجب أن يكون توزيع الربح بنسبة","لا يجوز ضمان الربح لرب المال","تتبع الخسارة رأس المال ما لم يثبت التقصير"]'::jsonb,
        '["Cannot fix profit as absolute amount","Cannot guarantee principal except misconduct","Cannot shift all losses to entrepreneur"]'::jsonb,
        '["لا يجوز تحديد الربح كمبلغ مقطوع","لا يجوز ضمان رأس المال إلا عند التعدي","لا يجوز تحميل العامل جميع الخسائر"]'::jsonb,
        'FAIR_VALUE_OCI', 'FAS 3', 'IFSB-15',
        'Track investment pool performance and allocate realised profits according to agreed ratios.',
        '["DEPOSIT","INVESTMENT","FINANCING"]'::jsonb,
        'hand-coins', 30, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'MUSHARAKAH',
        'Musharakah - Joint Venture',
        'المشاركة - الشراكة',
        'Equity partnership where all parties contribute capital and share profits by agreement and losses by capital.',
        'شراكة يساهم فيها جميع الأطراف برأس المال ويتقاسمون الربح حسب الاتفاق والخسارة حسب رأس المال.',
        'PARTNERSHIP_BASED',
        'Ownership and risk are shared; in diminishing Musharakah units are gradually transferred.',
        'تتوزع الملكية والمخاطر بين الشركاء؛ وفي المشاركة المتناقصة تنتقل الحصص تدريجياً.',
        '["bankSharePercentage","customerSharePercentage","profitSharingRatioBank","profitSharingRatioCustomer"]'::jsonb,
        'MUSHARAKAH',
        '["Loss must follow capital contribution","Ownership shares must be defined","Diminishing transfer schedule must be explicit"]'::jsonb,
        '["يجب أن تتبع الخسارة نسبة رأس المال","يجب تحديد نسب الملكية","يجب توضيح جدول انتقال الحصص في المشاركة المتناقصة"]'::jsonb,
        '["Cannot guarantee one partner against loss","Cannot conceal ownership dilution mechanics"]'::jsonb,
        '["لا يجوز ضمان أحد الشركاء من الخسارة","لا يجوز إخفاء آلية تناقص الملكية"]'::jsonb,
        'FAIR_VALUE_OCI', 'FAS 4', 'IFSB-15',
        'Recognise joint investment and allocate profit/loss between partners per agreed and capital ratios.',
        '["FINANCING","INVESTMENT"]'::jsonb,
        'building-2', 40, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'WADIAH',
        'Wadiah - Safekeeping',
        'الوديعة - الحفظ والأمانة',
        'Safekeeping arrangement where funds are accepted in trust with principal return guaranteed.',
        'ترتيب حفظ تقبل فيه الأموال على سبيل الأمانة مع ضمان رد الأصل.',
        'SAFEKEEPING',
        'Principal is preserved and any hibah is discretionary, not contractual.',
        'الأصل محفوظ وأي هبة تكون تبرعية وليست التزاماً تعاقدياً.',
        '[]'::jsonb,
        'WADIAH',
        '["Principal must be preserved","No contractual profit sharing","Any hibah must be discretionary"]'::jsonb,
        '["يجب حفظ الأصل","لا يجوز النص على ربح تعاقدي","أي هبة تكون تبرعية"]'::jsonb,
        '["Cannot promise return or profit as consideration","Cannot convert safekeeping into lending without disclosure"]'::jsonb,
        '["لا يجوز الوعد بعائد مقابل الحفظ","لا يجوز تحويل الوديعة إلى قرض دون إفصاح"]'::jsonb,
        'AMORTISED_COST', 'FAS 2', 'IFSB-1',
        'Treat balances as safeguarded liabilities with no accrued profit obligation.',
        '["DEPOSIT"]'::jsonb,
        'shield', 50, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'SALAM',
        'Salam - Forward Sale',
        'السلم - البيع الآجل بالتسليم المؤجل',
        'Forward sale where price is paid in full upfront and delivery occurs later.',
        'بيع يدفع فيه الثمن كاملاً مقدماً ويكون التسليم في وقت لاحق.',
        'FORWARD_SALE',
        'Advance payment is mandatory and delivery specifications must be explicit.',
        'يشترط دفع الثمن مقدماً وتحديد مواصفات التسليم بدقة.',
        '["minAmount","maxAmount"]'::jsonb,
        'SALAM',
        '["Full advance payment is required","Delivery specifications must be clear","Settlement date must be defined"]'::jsonb,
        '["يشترط دفع الثمن مقدماً كاملاً","يجب أن تكون مواصفات التسليم واضحة","يجب تحديد تاريخ التسليم"]'::jsonb,
        '["Cannot defer full price payment","Cannot leave delivery subject undefined"]'::jsonb,
        '["لا يجوز تأجيل كامل الثمن","لا يجوز ترك التسليم مجهولاً"]'::jsonb,
        'AMORTISED_COST', 'FAS 7', 'IFSB-1',
        'Recognise Salam asset on prepaid basis and settle on commodity delivery.',
        '["FINANCING","TRADE"]'::jsonb,
        'truck', 60, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'ISTISNA',
        'Istisna''a - Manufacturing Contract',
        'الاستصناع - عقد التصنيع',
        'Manufacturing or construction contract where delivery is future and payment may be staged.',
        'عقد تصنيع أو إنشاء يكون فيه التسليم مستقبلاً ويجوز فيه الدفع المرحلي.',
        'SALE_BASED',
        'Asset is manufactured to specification and progressive payment is permissible.',
        'يتم تصنيع الأصل وفق مواصفات محددة ويجوز الدفع المرحلي.',
        '["minAmount","maxAmount"]'::jsonb,
        'ISTISNA',
        '["Specifications must be clear","Manufacturing milestones should be tracked","Progressive payment is permissible"]'::jsonb,
        '["يجب أن تكون المواصفات واضحة","ينبغي تتبع مراحل التصنيع","يجوز الدفع المرحلي"]'::jsonb,
        '["Cannot leave deliverable undefined","Cannot treat as conventional loan drawdown"]'::jsonb,
        '["لا يجوز ترك المبيع مجهولاً","لا يجوز معاملته كسحب قرض تقليدي"]'::jsonb,
        'AMORTISED_COST', 'FAS 10', 'IFSB-1',
        'Recognise work in progress and completed receivable per contract milestones.',
        '["FINANCING","TRADE"]'::jsonb,
        'hammer', 70, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'SUKUK',
        'Sukuk - Islamic Bond',
        'الصكوك - أوراق مالية إسلامية',
        'Tradable certificates representing proportionate ownership in underlying assets or usufruct.',
        'شهادات قابلة للتداول تمثل ملكية نسبية في أصول أو منافع أساسية.',
        'SALE_BASED',
        'Returns arise from asset performance, rentals, or profits rather than interest coupons.',
        'تنشأ العوائد من أداء الأصل أو الأجرة أو الأرباح وليس من كوبونات الفائدة.',
        '["profitCalculationMethod","currencies"]'::jsonb,
        'SUKUK',
        '["Must represent ownership in identifiable assets or usufruct","Returns tied to underlying asset performance"]'::jsonb,
        '["يجب أن تمثل ملكية في أصول أو منافع محددة","ترتبط العوائد بأداء الأصل الأساسي"]'::jsonb,
        '["Cannot represent pure debt for trading at discount","Cannot guarantee fixed interest coupon"]'::jsonb,
        '["لا يجوز أن تمثل ديوناً محضة قابلة للتداول بخصم","لا يجوز ضمان كوبون فائدة ثابت"]'::jsonb,
        'FAIR_VALUE_OCI', 'FAS 32', 'IFSB-7',
        'Classify based on underlying structure and fair value or amortised basis as applicable.',
        '["SUKUK","INVESTMENT"]'::jsonb,
        'badge-percent', 80, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'KAFALAH',
        'Kafalah - Guarantee',
        'الكفالة - الضمان',
        'Guarantee contract where one party assumes responsibility for another''s obligation.',
        'عقد ضمان يتحمل فيه طرف مسؤولية التزام طرف آخر.',
        'GUARANTEE',
        'Guarantee fees must reflect actual service costs and not riba-based return.',
        'يجب أن تعكس رسوم الضمان كلفة الخدمة الفعلية لا عائداً ربوياً.',
        '["minAmount","maxAmount"]'::jsonb,
        'KAFALAH',
        '["Underlying obligation must be valid","Guarantee pricing must avoid prohibited return on mere guarantee"]'::jsonb,
        '["يجب أن يكون الالتزام المضمون صحيحاً","يجب أن تتجنب تسعيرة الضمان العائد المحظور على مجرد الضمان"]'::jsonb,
        '["Cannot treat guarantee fee as interest spread","Cannot guarantee unlawful obligation"]'::jsonb,
        '["لا يجوز اعتبار رسم الضمان هامش فائدة","لا يجوز ضمان التزام غير مشروع"]'::jsonb,
        'OFF_BALANCE_SHEET', 'FAS 14', 'IFSB-1',
        'Recognise contingent exposure and provision for expected guarantee losses.',
        '["GUARANTEE","TRADE"]'::jsonb,
        'shield-check', 90, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'WAKALAH',
        'Wakalah - Agency',
        'الوكالة - عقد الوكالة',
        'Agency contract where the institution acts on behalf of the customer for an agreed fee.',
        'عقد وكالة يعمل فيه المصرف نيابة عن العميل مقابل أجر معلوم.',
        'AGENCY_BASED',
        'Agent earns a disclosed fee and manages assets within delegated authority.',
        'يتقاضى الوكيل أجراً معلوماً ويدير الأصول ضمن حدود التفويض.',
        '["profitCalculationMethod"]'::jsonb,
        'WAKALAH',
        '["Agency fee must be disclosed","Investment losses follow principal except negligence","Scope of mandate must be clear"]'::jsonb,
        '["يجب الإفصاح عن أجر الوكالة","تتبع خسائر الاستثمار الأصل إلا عند التقصير","يجب توضيح نطاق الوكالة"]'::jsonb,
        '["Cannot promise guaranteed profit unless separately underwritten lawfully","Cannot exceed delegated authority"]'::jsonb,
        '["لا يجوز الوعد بربح مضمون إلا بضوابط مشروعة","لا يجوز تجاوز حدود التفويض"]'::jsonb,
        'OFF_BALANCE_SHEET', 'FAS 23', 'IFSB-1',
        'Recognise fee income for agency services and segregate client assets where required.',
        '["AGENCY","INVESTMENT","INSURANCE"]'::jsonb,
        'briefcase', 100, 'ACTIVE', NULL, 'SYSTEM', 'SYSTEM'
    )
ON CONFLICT DO NOTHING;