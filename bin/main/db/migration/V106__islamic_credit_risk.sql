-- ============================================================================
-- V106__islamic_credit_risk.sql
-- Islamic Credit Risk: scoring, ECL, collateral extensions, classification
-- NOTE: Prompt version V93 is already occupied in this repository.
-- ============================================================================

SET search_path TO cbs;

-- ---------------------------------------------------------------------------
-- 1. Islamic credit score models
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_credit_score_models (
    id                          BIGSERIAL PRIMARY KEY,
    model_code                  VARCHAR(40) NOT NULL UNIQUE,
    name                        VARCHAR(200) NOT NULL,
    description                 TEXT,
    contract_type_code          VARCHAR(30) NOT NULL,
    product_category            VARCHAR(80),
    model_version               INT NOT NULL,
    score_components            JSONB NOT NULL DEFAULT '[]'::jsonb,
    maximum_score               INT NOT NULL,
    score_bands                 JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_calibration_date       DATE,
    next_calibration_date       DATE,
    calibration_data_period     VARCHAR(120),
    backtesting_accuracy        NUMERIC(10,4),
    status                      VARCHAR(30) NOT NULL CHECK (status IN ('ACTIVE','UNDER_CALIBRATION','RETIRED')),
    approved_by                 VARCHAR(100),
    approved_at                 TIMESTAMPTZ,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_credit_score_models_type_status
    ON islamic_credit_score_models (contract_type_code, status);

-- ---------------------------------------------------------------------------
-- 2. Islamic credit assessments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_credit_assessments (
    id                          BIGSERIAL PRIMARY KEY,
    assessment_ref              VARCHAR(50) NOT NULL UNIQUE,
    customer_id                 BIGINT NOT NULL REFERENCES customer(id),
    application_id              BIGINT,
    application_ref             VARCHAR(60),
    contract_type_code          VARCHAR(30) NOT NULL,
    product_code                VARCHAR(30) NOT NULL,
    model_id                    BIGINT NOT NULL REFERENCES islamic_credit_score_models(id),
    model_code                  VARCHAR(40) NOT NULL,
    assessment_date             DATE NOT NULL,
    input_data                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_score                 INT NOT NULL,
    score_band                  VARCHAR(10) NOT NULL,
    score_band_label            VARCHAR(100),
    component_scores            JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_pd                NUMERIC(10,6),
    risk_rating                 VARCHAR(30),
    approval_recommendation     VARCHAR(30) CHECK (approval_recommendation IN (
                                    'AUTO_APPROVE','APPROVE_WITH_CONDITIONS','ENHANCED_REVIEW','DECLINE'
                                )),
    max_approved_amount         NUMERIC(18,2),
    max_approved_tenor          INT,
    conditions                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    assessed_by                 VARCHAR(100),
    overridden_by               VARCHAR(100),
    overridden_score            INT,
    overridden_band             VARCHAR(10),
    override_reason             TEXT,
    override_approved_by        VARCHAR(100),
    status                      VARCHAR(20) NOT NULL CHECK (status IN ('COMPLETED','OVERRIDDEN','EXPIRED','SUPERSEDED')),
    valid_until                 DATE,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_credit_assessments_customer_type
    ON islamic_credit_assessments (customer_id, contract_type_code);
CREATE INDEX IF NOT EXISTS idx_islamic_credit_assessments_application
    ON islamic_credit_assessments (application_id);
CREATE INDEX IF NOT EXISTS idx_islamic_credit_assessments_band
    ON islamic_credit_assessments (score_band);

-- ---------------------------------------------------------------------------
-- 3. Islamic ECL configurations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_ecl_configurations (
    id                                  BIGSERIAL PRIMARY KEY,
    config_code                         VARCHAR(40) NOT NULL UNIQUE,
    name                                VARCHAR(200) NOT NULL,
    contract_type_code                  VARCHAR(30) NOT NULL,
    product_category                    VARCHAR(80),
    pd_model                            VARCHAR(30) NOT NULL CHECK (pd_model IN (
                                            'TRANSITION_MATRIX','LOGISTIC_REGRESSION','SCORECARD_MAPPING','EXTERNAL_RATING'
                                        )),
    pd_calibration_data                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    pd_term_structure                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    pd_forward_looking_adjustment       NUMERIC(10,6),
    pd_scenario_weights                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    lgd_model                           VARCHAR(30) NOT NULL CHECK (lgd_model IN (
                                            'WORKOUT','COLLATERAL_BASED','STATISTICAL','HYBRID'
                                        )),
    base_lgd                            NUMERIC(10,6),
    murabaha_lgd_factors                JSONB NOT NULL DEFAULT '{}'::jsonb,
    ijarah_lgd_factors                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    musharakah_lgd_factors              JSONB NOT NULL DEFAULT '{}'::jsonb,
    ead_calculation_method              VARCHAR(30) NOT NULL CHECK (ead_calculation_method IN (
                                            'AMORTISED_COST','NET_BOOK_VALUE','SHARE_VALUE','HYBRID'
                                        )),
    exclude_deferred_profit             BOOLEAN NOT NULL DEFAULT FALSE,
    include_asset_ownership             BOOLEAN NOT NULL DEFAULT FALSE,
    use_current_share_not_original      BOOLEAN NOT NULL DEFAULT FALSE,
    include_per                         BOOLEAN NOT NULL DEFAULT FALSE,
    include_irr                         BOOLEAN NOT NULL DEFAULT FALSE,
    stage1_dpd_threshold                INT,
    stage2_dpd_threshold                INT,
    stage3_dpd_threshold                INT,
    significant_increase_pd_threshold   NUMERIC(10,6),
    effective_from                      DATE,
    status                              VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','UNDER_REVIEW','RETIRED')),
    approved_by                         VARCHAR(100),
    tenant_id                           BIGINT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_ecl_configurations_type_status
    ON islamic_ecl_configurations (contract_type_code, status);

-- ---------------------------------------------------------------------------
-- 4. Islamic ECL calculations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_ecl_calculations (
    id                          BIGSERIAL PRIMARY KEY,
    calculation_ref             VARCHAR(50) NOT NULL UNIQUE,
    calculation_date            DATE NOT NULL,
    contract_id                 BIGINT NOT NULL,
    contract_ref                VARCHAR(60) NOT NULL,
    contract_type_code          VARCHAR(30) NOT NULL,
    config_id                   BIGINT NOT NULL REFERENCES islamic_ecl_configurations(id),
    current_stage               VARCHAR(20) NOT NULL CHECK (current_stage IN ('STAGE_1','STAGE_2','STAGE_3')),
    previous_stage              VARCHAR(20) CHECK (previous_stage IN ('STAGE_1','STAGE_2','STAGE_3')),
    staging_reason              TEXT,
    days_past_due               INT,
    stage_changed               BOOLEAN NOT NULL DEFAULT FALSE,
    pd_12_month                 NUMERIC(10,6),
    pd_lifetime                 NUMERIC(10,6),
    applied_pd                  NUMERIC(10,6),
    lgd                         NUMERIC(10,6),
    ead                         NUMERIC(18,2),
    ead_breakdown               JSONB NOT NULL DEFAULT '{}'::jsonb,
    ecl_amount                  NUMERIC(18,2),
    ecl_amount_previous         NUMERIC(18,2),
    ecl_change                  NUMERIC(18,2),
    scenario_results            JSONB NOT NULL DEFAULT '{}'::jsonb,
    weighted_ecl                NUMERIC(18,2),
    collateral_value            NUMERIC(18,2),
    collateral_haircut          NUMERIC(10,6),
    collateral_adjusted_lgd     NUMERIC(10,6),
    provision_journal_ref       VARCHAR(40),
    provision_amount            NUMERIC(18,2),
    provision_change            NUMERIC(18,2),
    calculated_by               VARCHAR(100),
    calculated_at               TIMESTAMPTZ,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_islamic_ecl_contract_date UNIQUE (contract_id, calculation_date)
);

CREATE INDEX IF NOT EXISTS idx_islamic_ecl_calculations_stage_date
    ON islamic_ecl_calculations (current_stage, calculation_date);
CREATE INDEX IF NOT EXISTS idx_islamic_ecl_calculations_type_stage
    ON islamic_ecl_calculations (contract_type_code, current_stage);

-- ---------------------------------------------------------------------------
-- 5. Islamic collateral extensions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_collateral_extensions (
    id                              BIGSERIAL PRIMARY KEY,
    base_collateral_id              BIGINT NOT NULL UNIQUE REFERENCES collateral(id) ON DELETE CASCADE,
    contract_id                     BIGINT,
    contract_type_code              VARCHAR(30),
    shariah_permissibility          VARCHAR(30) NOT NULL CHECK (shariah_permissibility IN (
                                        'PERMISSIBLE','RESTRICTED','PROHIBITED','REQUIRES_REVIEW'
                                    )),
    shariah_classification_reason   TEXT,
    shariah_screened                BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_screened_by             VARCHAR(100),
    shariah_screened_at             TIMESTAMPTZ,
    islamic_collateral_type         VARCHAR(40) NOT NULL CHECK (islamic_collateral_type IN (
                                        'REAL_ESTATE','VEHICLE','EQUIPMENT_MACHINERY','GOLD_PRECIOUS_METALS',
                                        'CASH_DEPOSIT','SHARIAH_COMPLIANT_EQUITY','SUKUK','RECEIVABLES_HALAL',
                                        'KAFALAH_GUARANTEE','TAKAFUL_POLICY','INVENTORY_HALAL',
                                        'IJARAH_ASSET_OWNERSHIP','MUSHARAKAH_SHARE','OTHER_PERMISSIBLE'
                                    )),
    issuer_name                     VARCHAR(255),
    underlying_asset_screened       BOOLEAN NOT NULL DEFAULT FALSE,
    underlying_screening_result     VARCHAR(20) CHECK (underlying_screening_result IN (
                                        'COMPLIANT','NON_COMPLIANT','UNDER_REVIEW'
                                    )),
    underlying_screening_date       DATE,
    last_valuation_date             DATE,
    last_valuation_amount           NUMERIC(18,2),
    valuation_method                VARCHAR(30) CHECK (valuation_method IN (
                                        'MARKET_VALUE','INDEPENDENT_APPRAISAL','BOOK_VALUE','FORCED_SALE_VALUE'
                                    )),
    appraiser_name                  VARCHAR(200),
    shariah_compliant_appraiser     BOOLEAN NOT NULL DEFAULT FALSE,
    haircut_percentage              NUMERIC(10,6),
    net_collateral_value            NUMERIC(18,2),
    next_valuation_due_date         DATE,
    lien_created_date               DATE,
    lien_registered_with            VARCHAR(120),
    lien_registration_ref           VARCHAR(120),
    lien_priority                   VARCHAR(20) CHECK (lien_priority IN ('FIRST','SECOND','THIRD','PARI_PASSU')),
    takaful_required                BOOLEAN NOT NULL DEFAULT FALSE,
    takaful_policy_ref              VARCHAR(120),
    takaful_provider                VARCHAR(200),
    takaful_coverage_amount         NUMERIC(18,2),
    takaful_expiry_date             DATE,
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','RELEASED','UNDER_REVIEW','EXPIRED')),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_collateral_extensions_contract
    ON islamic_collateral_extensions (contract_id);
CREATE INDEX IF NOT EXISTS idx_islamic_collateral_extensions_permissibility
    ON islamic_collateral_extensions (shariah_permissibility);
CREATE INDEX IF NOT EXISTS idx_islamic_collateral_extensions_type
    ON islamic_collateral_extensions (islamic_collateral_type);

-- ---------------------------------------------------------------------------
-- 6. Islamic financing risk classifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS islamic_financing_risk_classifications (
    id                              BIGSERIAL PRIMARY KEY,
    contract_id                     BIGINT NOT NULL,
    contract_ref                    VARCHAR(60) NOT NULL,
    contract_type_code              VARCHAR(30) NOT NULL,
    classification_date             DATE NOT NULL,
    ifrs9_stage                     VARCHAR(20) NOT NULL CHECK (ifrs9_stage IN ('STAGE_1','STAGE_2','STAGE_3')),
    ifrs9_stage_previous            VARCHAR(20) CHECK (ifrs9_stage_previous IN ('STAGE_1','STAGE_2','STAGE_3')),
    ifrs9_stage_changed_date        DATE,
    ifrs9_staging_reason            TEXT,
    aaoifi_classification           VARCHAR(20) NOT NULL CHECK (aaoifi_classification IN (
                                        'PERFORMING','WATCH_LIST','SUBSTANDARD','DOUBTFUL','LOSS'
                                    )),
    aaoifi_classification_previous  VARCHAR(20) CHECK (aaoifi_classification_previous IN (
                                        'PERFORMING','WATCH_LIST','SUBSTANDARD','DOUBTFUL','LOSS'
                                    )),
    aaoifi_classification_reason    TEXT,
    aaoifi_minimum_provision_rate   NUMERIC(10,6),
    days_past_due                   INT,
    consecutive_missed_payments     INT,
    total_overdue_amount            NUMERIC(18,2),
    outstanding_exposure            NUMERIC(18,2),
    collateral_coverage_ratio       NUMERIC(10,6),
    pd_at_origination               NUMERIC(10,6),
    pd_current                      NUMERIC(10,6),
    pd_change                       NUMERIC(10,6),
    contract_specific_risk          JSONB NOT NULL DEFAULT '{}'::jsonb,
    qualitative_override            BOOLEAN NOT NULL DEFAULT FALSE,
    qualitative_factors             JSONB NOT NULL DEFAULT '[]'::jsonb,
    overridden_by                   VARCHAR(100),
    override_reason                 TEXT,
    on_watch_list                   BOOLEAN NOT NULL DEFAULT FALSE,
    watch_list_date                 DATE,
    watch_list_reason               TEXT,
    watch_list_review_date          DATE,
    classified_by                   VARCHAR(100),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_financing_risk_class_contract_date
    ON islamic_financing_risk_classifications (contract_id, classification_date);
CREATE INDEX IF NOT EXISTS idx_islamic_financing_risk_class_stage
    ON islamic_financing_risk_classifications (ifrs9_stage, classification_date);
CREATE INDEX IF NOT EXISTS idx_islamic_financing_risk_class_aaoifi
    ON islamic_financing_risk_classifications (aaoifi_classification);
CREATE INDEX IF NOT EXISTS idx_islamic_financing_risk_class_watch
    ON islamic_financing_risk_classifications (on_watch_list);

-- ---------------------------------------------------------------------------
-- Seed GL account
-- ---------------------------------------------------------------------------

INSERT INTO chart_of_accounts (
    gl_code, gl_name, gl_category, level_number, is_header, is_postable, is_multi_currency, is_inter_branch,
    normal_balance, allow_manual_posting, requires_cost_centre, is_active, islamic_account_category,
    contract_type_code, shariah_classification, is_islamic_account, aaoifi_reference, aaoifi_line_item,
    profit_distribution_eligible, zakat_applicable, contra_account_code, is_reserve_account, reserve_type,
    created_by, created_at, updated_at
)
VALUES
    ('1700-MSH-001', 'Impairment Provision — Musharakah', 'ASSET', 1, FALSE, TRUE, FALSE, FALSE, 'CREDIT', TRUE, FALSE, TRUE,
        'OTHER_ISLAMIC_ASSETS', 'MUSHARAKAH', 'HALAL', TRUE, 'FAS 30', 'Musharakah impairment provision', FALSE, FALSE, '1500-MSH-001', FALSE, 'NONE',
        'SYSTEM', NOW(), NOW())
ON CONFLICT (gl_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed credit score models
-- ---------------------------------------------------------------------------

INSERT INTO islamic_credit_score_models (
    model_code, name, description, contract_type_code, product_category, model_version,
    score_components, maximum_score, score_bands, last_calibration_date, next_calibration_date,
    calibration_data_period, backtesting_accuracy, status, approved_by, approved_at, tenant_id,
    created_by, updated_by
)
VALUES
    (
        'ICSM-MRB-HOME-001',
        'Murabaha Home Financing Credit Score Model',
        'Murabaha home financing scorecard with deferred-sale specific drivers',
        'MURABAHA',
        'HOME_FINANCING',
        1,
        '[
            {"componentCode":"INCOME_STABILITY","name":"Income Stability","weight":15,"dataSource":"employmentYears","scoringTiers":[{"min":0,"max":1,"score":20},{"min":1,"max":3,"score":50},{"min":3,"max":5,"score":80},{"min":5,"max":100,"score":100}]},
            {"componentCode":"DSR_RATIO","name":"Debt Service Ratio","weight":20,"dataSource":"dsr","scoringTiers":[{"min":0,"max":20,"score":100},{"min":20.01,"max":35,"score":75},{"min":35.01,"max":50,"score":45},{"min":50.01,"max":100,"score":10}]},
            {"componentCode":"CREDIT_BUREAU_SCORE","name":"Credit Bureau Score","weight":20,"dataSource":"creditBureauScore","scoringTiers":[{"min":0,"max":499,"score":10},{"min":500,"max":649,"score":45},{"min":650,"max":799,"score":75},{"min":800,"max":1000,"score":100}]},
            {"componentCode":"EXISTING_RELATIONSHIP","name":"Existing Relationship","weight":10,"dataSource":"relationshipYears","scoringTiers":[{"min":0,"max":1,"score":20},{"min":1,"max":3,"score":50},{"min":3,"max":5,"score":75},{"min":5,"max":100,"score":100}]},
            {"componentCode":"REPLOYMENT_HISTORY","name":"Repayment History","weight":10,"dataSource":"repaymentScore","scoringTiers":[{"min":0,"max":49,"score":20},{"min":50,"max":74,"score":55},{"min":75,"max":89,"score":80},{"min":90,"max":100,"score":100}]},
            {"componentCode":"EMPLOYMENT_TYPE","name":"Employment Type","weight":5,"dataSource":"employmentTypeScore","scoringTiers":[{"min":0,"max":24,"score":30},{"min":25,"max":49,"score":55},{"min":50,"max":74,"score":75},{"min":75,"max":100,"score":100}]},
            {"componentCode":"ASSET_LIQUIDITY","name":"Asset Liquidity","weight":10,"dataSource":"assetLiquidity","scoringTiers":[{"min":0,"max":24,"score":20},{"min":25,"max":49,"score":50},{"min":50,"max":74,"score":75},{"min":75,"max":100,"score":100}]},
            {"componentCode":"DOWN_PAYMENT_PERCENTAGE","name":"Down Payment","weight":10,"dataSource":"downPaymentPercent","scoringTiers":[{"min":0,"max":9.99,"score":20},{"min":10,"max":19.99,"score":50},{"min":20,"max":29.99,"score":80},{"min":30,"max":100,"score":100}]}
        ]'::jsonb,
        1000,
        '[
            {"band":"A","label":"Excellent","minScore":800,"maxScore":1000,"pdRange":"0.01-0.50%","approvalAction":"AUTO_APPROVE","maxFinancingMultiple":8.0},
            {"band":"B","label":"Good","minScore":650,"maxScore":799,"pdRange":"0.51-1.50%","approvalAction":"APPROVE_WITH_CONDITIONS","maxFinancingMultiple":6.0},
            {"band":"C","label":"Satisfactory","minScore":500,"maxScore":649,"pdRange":"1.51-3.00%","approvalAction":"ENHANCED_REVIEW","maxFinancingMultiple":5.0},
            {"band":"D","label":"Marginal","minScore":350,"maxScore":499,"pdRange":"3.01-6.00%","approvalAction":"ENHANCED_REVIEW","maxFinancingMultiple":4.0},
            {"band":"E","label":"Poor","minScore":200,"maxScore":349,"pdRange":"6.01-12.00%","approvalAction":"DECLINE","maxFinancingMultiple":2.0},
            {"band":"F","label":"Default","minScore":0,"maxScore":199,"pdRange":"12.01-25.00%","approvalAction":"DECLINE","maxFinancingMultiple":1.0}
        ]'::jsonb,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', '2023-2025 Murabaha portfolio', 0.8800, 'ACTIVE', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'ICSM-IJR-VEH-001',
        'Ijarah Vehicle Financing Credit Score Model',
        'Ijarah vehicle scorecard with residual-value and asset-risk drivers',
        'IJARAH',
        'VEHICLE',
        1,
        '[
            {"componentCode":"INCOME_STABILITY","name":"Income Stability","weight":15,"dataSource":"employmentYears","scoringTiers":[{"min":0,"max":1,"score":20},{"min":1,"max":3,"score":50},{"min":3,"max":5,"score":80},{"min":5,"max":100,"score":100}]},
            {"componentCode":"DSR_RATIO","name":"Debt Service Ratio","weight":20,"dataSource":"dsr","scoringTiers":[{"min":0,"max":20,"score":100},{"min":20.01,"max":35,"score":75},{"min":35.01,"max":50,"score":45},{"min":50.01,"max":100,"score":10}]},
            {"componentCode":"CREDIT_BUREAU_SCORE","name":"Credit Bureau Score","weight":20,"dataSource":"creditBureauScore","scoringTiers":[{"min":0,"max":499,"score":10},{"min":500,"max":649,"score":45},{"min":650,"max":799,"score":75},{"min":800,"max":1000,"score":100}]},
            {"componentCode":"EXISTING_RELATIONSHIP","name":"Existing Relationship","weight":10,"dataSource":"relationshipYears","scoringTiers":[{"min":0,"max":1,"score":20},{"min":1,"max":3,"score":50},{"min":3,"max":5,"score":75},{"min":5,"max":100,"score":100}]},
            {"componentCode":"REPLOYMENT_HISTORY","name":"Repayment History","weight":10,"dataSource":"repaymentScore","scoringTiers":[{"min":0,"max":49,"score":20},{"min":50,"max":74,"score":55},{"min":75,"max":89,"score":80},{"min":90,"max":100,"score":100}]},
            {"componentCode":"EMPLOYMENT_TYPE","name":"Employment Type","weight":5,"dataSource":"employmentTypeScore","scoringTiers":[{"min":0,"max":24,"score":30},{"min":25,"max":49,"score":55},{"min":50,"max":74,"score":75},{"min":75,"max":100,"score":100}]},
            {"componentCode":"ASSET_RESIDUAL_VALUE_RISK","name":"Residual Value Risk","weight":10,"dataSource":"residualValueScore","scoringTiers":[{"min":0,"max":24,"score":20},{"min":25,"max":49,"score":50},{"min":50,"max":74,"score":75},{"min":75,"max":100,"score":100}]},
            {"componentCode":"ASSET_CATEGORY_RISK","name":"Asset Category Risk","weight":10,"dataSource":"assetCategoryRisk","scoringTiers":[{"min":0,"max":24,"score":20},{"min":25,"max":49,"score":50},{"min":50,"max":74,"score":75},{"min":75,"max":100,"score":100}]}
        ]'::jsonb,
        1000,
        '[
            {"band":"A","label":"Excellent","minScore":800,"maxScore":1000,"pdRange":"0.01-0.40%","approvalAction":"AUTO_APPROVE","maxFinancingMultiple":6.0},
            {"band":"B","label":"Good","minScore":650,"maxScore":799,"pdRange":"0.41-1.20%","approvalAction":"APPROVE_WITH_CONDITIONS","maxFinancingMultiple":5.0},
            {"band":"C","label":"Satisfactory","minScore":500,"maxScore":649,"pdRange":"1.21-2.50%","approvalAction":"ENHANCED_REVIEW","maxFinancingMultiple":4.0},
            {"band":"D","label":"Marginal","minScore":350,"maxScore":499,"pdRange":"2.51-5.50%","approvalAction":"ENHANCED_REVIEW","maxFinancingMultiple":3.0},
            {"band":"E","label":"Poor","minScore":200,"maxScore":349,"pdRange":"5.51-10.00%","approvalAction":"DECLINE","maxFinancingMultiple":2.0},
            {"band":"F","label":"Default","minScore":0,"maxScore":199,"pdRange":"10.01-20.00%","approvalAction":"DECLINE","maxFinancingMultiple":1.0}
        ]'::jsonb,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', '2023-2025 Ijarah vehicle book', 0.8600, 'ACTIVE', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'ICSM-MSH-HOME-001',
        'Musharakah Home Financing Credit Score Model',
        'Diminishing Musharakah scorecard with market-risk and customer-equity drivers',
        'MUSHARAKAH',
        'HOME_FINANCING',
        1,
        '[
            {"componentCode":"INCOME_STABILITY","name":"Income Stability","weight":15,"dataSource":"employmentYears","scoringTiers":[{"min":0,"max":1,"score":20},{"min":1,"max":3,"score":50},{"min":3,"max":5,"score":80},{"min":5,"max":100,"score":100}]},
            {"componentCode":"DSR_RATIO","name":"Debt Service Ratio","weight":20,"dataSource":"dsr","scoringTiers":[{"min":0,"max":20,"score":100},{"min":20.01,"max":35,"score":75},{"min":35.01,"max":50,"score":45},{"min":50.01,"max":100,"score":10}]},
            {"componentCode":"CREDIT_BUREAU_SCORE","name":"Credit Bureau Score","weight":20,"dataSource":"creditBureauScore","scoringTiers":[{"min":0,"max":499,"score":10},{"min":500,"max":649,"score":45},{"min":650,"max":799,"score":75},{"min":800,"max":1000,"score":100}]},
            {"componentCode":"EXISTING_RELATIONSHIP","name":"Existing Relationship","weight":10,"dataSource":"relationshipYears","scoringTiers":[{"min":0,"max":1,"score":20},{"min":1,"max":3,"score":50},{"min":3,"max":5,"score":75},{"min":5,"max":100,"score":100}]},
            {"componentCode":"REPLOYMENT_HISTORY","name":"Repayment History","weight":10,"dataSource":"repaymentScore","scoringTiers":[{"min":0,"max":49,"score":20},{"min":50,"max":74,"score":55},{"min":75,"max":89,"score":80},{"min":90,"max":100,"score":100}]},
            {"componentCode":"EMPLOYMENT_TYPE","name":"Employment Type","weight":5,"dataSource":"employmentTypeScore","scoringTiers":[{"min":0,"max":24,"score":30},{"min":25,"max":49,"score":55},{"min":50,"max":74,"score":75},{"min":75,"max":100,"score":100}]},
            {"componentCode":"PROPERTY_MARKET_RISK","name":"Property Market Risk","weight":10,"dataSource":"propertyMarketRisk","scoringTiers":[{"min":0,"max":24,"score":20},{"min":25,"max":49,"score":50},{"min":50,"max":74,"score":75},{"min":75,"max":100,"score":100}]},
            {"componentCode":"CUSTOMER_EQUITY_PERCENTAGE","name":"Customer Equity","weight":10,"dataSource":"customerEquityPercent","scoringTiers":[{"min":0,"max":9.99,"score":20},{"min":10,"max":19.99,"score":50},{"min":20,"max":29.99,"score":80},{"min":30,"max":100,"score":100}]}
        ]'::jsonb,
        1000,
        '[
            {"band":"A","label":"Excellent","minScore":800,"maxScore":1000,"pdRange":"0.01-0.60%","approvalAction":"AUTO_APPROVE","maxFinancingMultiple":7.0},
            {"band":"B","label":"Good","minScore":650,"maxScore":799,"pdRange":"0.61-1.80%","approvalAction":"APPROVE_WITH_CONDITIONS","maxFinancingMultiple":5.5},
            {"band":"C","label":"Satisfactory","minScore":500,"maxScore":649,"pdRange":"1.81-3.50%","approvalAction":"ENHANCED_REVIEW","maxFinancingMultiple":4.5},
            {"band":"D","label":"Marginal","minScore":350,"maxScore":499,"pdRange":"3.51-7.00%","approvalAction":"ENHANCED_REVIEW","maxFinancingMultiple":3.0},
            {"band":"E","label":"Poor","minScore":200,"maxScore":349,"pdRange":"7.01-14.00%","approvalAction":"DECLINE","maxFinancingMultiple":2.0},
            {"band":"F","label":"Default","minScore":0,"maxScore":199,"pdRange":"14.01-25.00%","approvalAction":"DECLINE","maxFinancingMultiple":1.0}
        ]'::jsonb,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', '2023-2025 Musharakah home financing book', 0.8400, 'ACTIVE', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'
    )
ON CONFLICT (model_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed ECL configurations
-- ---------------------------------------------------------------------------

INSERT INTO islamic_ecl_configurations (
    config_code, name, contract_type_code, product_category, pd_model, pd_calibration_data, pd_term_structure,
    pd_forward_looking_adjustment, pd_scenario_weights, lgd_model, base_lgd,
    murabaha_lgd_factors, ijarah_lgd_factors, musharakah_lgd_factors,
    ead_calculation_method, exclude_deferred_profit, include_asset_ownership, use_current_share_not_original,
    include_per, include_irr, stage1_dpd_threshold, stage2_dpd_threshold, stage3_dpd_threshold,
    significant_increase_pd_threshold, effective_from, status, approved_by, tenant_id, created_by, updated_by
)
VALUES
    (
        'ECL-MRB-001',
        'Murabaha IFRS 9 ECL Configuration',
        'MURABAHA',
        'ALL',
        'SCORECARD_MAPPING',
        '{"source":"credit_score_band"}'::jsonb,
        '{"12":0.005,"24":0.012,"36":0.020,"48":0.031,"60":0.045}'::jsonb,
        0.050000,
        '{"BASE":50,"UPSIDE":20,"DOWNSIDE":30}'::jsonb,
        'COLLATERAL_BASED',
        0.450000,
        '{"baseLgd":45.0,"collateralRecoveryRate":70.0,"collateralHaircut":20.0,"recoveryTimeline":18,"recoveryCost":5.0}'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb,
        'AMORTISED_COST',
        TRUE,
        FALSE,
        FALSE,
        TRUE,
        TRUE,
        0,
        30,
        90,
        0.050000,
        CURRENT_DATE,
        'ACTIVE',
        'SYSTEM',
        NULL,
        'SYSTEM',
        'SYSTEM'
    ),
    (
        'ECL-IJR-001',
        'Ijarah IFRS 9 ECL Configuration',
        'IJARAH',
        'ALL',
        'SCORECARD_MAPPING',
        '{"source":"credit_score_band"}'::jsonb,
        '{"12":0.004,"24":0.010,"36":0.017,"48":0.026,"60":0.038}'::jsonb,
        0.040000,
        '{"BASE":50,"UPSIDE":20,"DOWNSIDE":30}'::jsonb,
        'HYBRID',
        0.250000,
        '{}'::jsonb,
        '{"baseLgd":25.0,"assetRecoveryRate":80.0,"assetLiquidationHaircut":15.0,"reLeaseRecoveryRate":60.0,"depreciationImpact":true,"recoveryTimeline":12}'::jsonb,
        '{}'::jsonb,
        'NET_BOOK_VALUE',
        FALSE,
        TRUE,
        FALSE,
        TRUE,
        TRUE,
        0,
        30,
        90,
        0.050000,
        CURRENT_DATE,
        'ACTIVE',
        'SYSTEM',
        NULL,
        'SYSTEM',
        'SYSTEM'
    ),
    (
        'ECL-MSH-001',
        'Musharakah IFRS 9 ECL Configuration',
        'MUSHARAKAH',
        'ALL',
        'SCORECARD_MAPPING',
        '{"source":"credit_score_band"}'::jsonb,
        '{"12":0.006,"24":0.014,"36":0.023,"48":0.034,"60":0.048}'::jsonb,
        0.060000,
        '{"BASE":50,"UPSIDE":20,"DOWNSIDE":30}'::jsonb,
        'HYBRID',
        0.350000,
        '{}'::jsonb,
        '{}'::jsonb,
        '{"baseLgd":35.0,"partnershipBuyoutRecovery":50.0,"forcedSaleRecovery":65.0,"partialOwnershipDiscount":10.0,"st005LossSharing":true,"recoveryTimeline":24}'::jsonb,
        'SHARE_VALUE',
        FALSE,
        FALSE,
        TRUE,
        TRUE,
        TRUE,
        0,
        30,
        90,
        0.050000,
        CURRENT_DATE,
        'ACTIVE',
        'SYSTEM',
        NULL,
        'SYSTEM',
        'SYSTEM'
    )
ON CONFLICT (config_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed Shariah / risk business rules
-- ---------------------------------------------------------------------------

INSERT INTO business_rule (
    rule_code, name, name_ar, description, category, sub_category, rule_type, severity,
    evaluation_expression, parameters, error_message, applicable_products, applicable_modules,
    effective_from, status, priority, shariah_board_resolution, approved_by, approved_at,
    tenant_id, created_by, updated_by
)
VALUES
    (
        'SHARIAH-COLL-001',
        'Conventional bonds cannot be accepted as collateral',
        'لا يجوز قبول السندات التقليدية كضمان',
        'Reject conventional interest-bearing bonds as Islamic collateral',
        'SHARIAH_COMPLIANCE', 'COLLATERAL', 'CONSTRAINT', 'BLOCKING',
        '#collateral.type != ''CONVENTIONAL_BOND''', '{"prohibited":["CONVENTIONAL_BOND","INTEREST_BEARING_SECURITY"]}'::jsonb,
        'Conventional interest-bearing securities are prohibited as collateral', '["MURABAHA","IJARAH","MUSHARAKAH"]'::jsonb,
        '["risk","collateral"]'::jsonb, CURRENT_DATE, 'ACTIVE', 10, 'ST-001', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'SHARIAH-COLL-002',
        'Conventional insurance collateral prohibited',
        'لا يجوز قبول وثائق التأمين التقليدي كضمان',
        'Only Takaful policies may be accepted for Islamic financing collateral support',
        'SHARIAH_COMPLIANCE', 'COLLATERAL', 'CONSTRAINT', 'BLOCKING',
        '#collateral.insuranceType != ''CONVENTIONAL''', '{"required":"TAKAFUL"}'::jsonb,
        'Conventional insurance policies are not permissible collateral support', '["MURABAHA","IJARAH","MUSHARAKAH"]'::jsonb,
        '["risk","collateral"]'::jsonb, CURRENT_DATE, 'ACTIVE', 20, 'ST-001', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'
    ),
    (
        'AAOIFI-PROVISION-MATRIX',
        'AAOIFI minimum provisioning matrix',
        'مصفوفة الحد الأدنى للمخصصات وفق الأيوفي',
        'Reference matrix for AAOIFI classification thresholds and minimum provision rates',
        'REGULATORY', 'AAOIFI_CLASSIFICATION', 'CALCULATION', 'INFORMATIONAL',
        'decisionTable("AAOIFI_PROVISION_MATRIX")', '{}'::jsonb,
        'No AAOIFI provisioning band matched the classification', '["MURABAHA","IJARAH","MUSHARAKAH"]'::jsonb,
        '["risk","ecl","classification"]'::jsonb, CURRENT_DATE, 'ACTIVE', 30, 'FAS 30', 'SYSTEM', NOW(), NULL, 'SYSTEM', 'SYSTEM'
    )
ON CONFLICT ((LOWER(rule_code)), COALESCE(tenant_id, -1)) DO NOTHING;

INSERT INTO decision_table (
    rule_id, table_name, description, input_columns, output_columns,
    hit_policy, status, table_version, tenant_id, created_by, updated_by
)
SELECT br.id,
       'AAOIFI_PROVISION_MATRIX',
       'AAOIFI minimum provision rate by classification',
       '[{"name":"classification","type":"STRING"}]'::jsonb,
       '[{"name":"minimumProvisionRate","type":"DECIMAL"}]'::jsonb,
       'FIRST_MATCH',
       'ACTIVE',
       1,
       NULL,
       'SYSTEM',
       'SYSTEM'
FROM business_rule br
WHERE br.rule_code = 'AAOIFI-PROVISION-MATRIX'
  AND br.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM decision_table dt WHERE dt.rule_id = br.id AND dt.table_name = 'AAOIFI_PROVISION_MATRIX'
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
        (1, '[{"value":"PERFORMING"}]', '[{"value":0.01}]', 'Performing financing', 1),
        (2, '[{"value":"WATCH_LIST"}]', '[{"value":0.05}]', 'Watch list financing', 2),
        (3, '[{"value":"SUBSTANDARD"}]', '[{"value":0.20}]', 'Substandard financing', 3),
        (4, '[{"value":"DOUBTFUL"}]', '[{"value":0.50}]', 'Doubtful financing', 4),
        (5, '[{"value":"LOSS"}]', '[{"value":1.00}]', 'Loss classification financing', 5)
) AS seed(row_number, input_values, output_values, description, priority)
  ON TRUE
WHERE dt.table_name = 'AAOIFI_PROVISION_MATRIX'
  AND NOT EXISTS (
      SELECT 1 FROM decision_table_row dtr WHERE dtr.decision_table_id = dt.id AND dtr.row_number = seed.row_number
  );
