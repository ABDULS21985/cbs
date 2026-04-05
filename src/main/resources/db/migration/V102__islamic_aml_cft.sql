-- ============================================================================
-- V101: Islamic AML/CFT Schema — Rules, Alerts, Sanctions, STR/SAR
-- ============================================================================
SET search_path TO cbs;

-- ============================================================================
-- 1. islamic_aml_rule
-- ============================================================================
CREATE TABLE IF NOT EXISTS islamic_aml_rule (
    id                      BIGSERIAL PRIMARY KEY,
    base_aml_rule_id        BIGINT REFERENCES aml_rule(id),
    rule_code               VARCHAR(50) UNIQUE NOT NULL,
    name                    VARCHAR(300) NOT NULL,
    description             TEXT,
    category                VARCHAR(30) NOT NULL
                            CHECK (category IN (
                                'TAWARRUQ_ABUSE', 'POOL_LAYERING', 'ASSET_VALUE_MANIPULATION',
                                'RAPID_CYCLING', 'PARTNERSHIP_LAYERING', 'CHARITY_MISUSE',
                                'CROSS_BORDER_ISLAMIC', 'SMURFING_ISLAMIC', 'CONVENTIONAL_TYPOLOGY'
                            )),
    islamic_product_context JSONB,
    detection_method        VARCHAR(20) NOT NULL
                            CHECK (detection_method IN (
                                'THRESHOLD', 'PATTERN', 'VELOCITY', 'NETWORK', 'BEHAVIORAL', 'COMPOSITE'
                            )),
    rule_parameters         JSONB,
    lookback_period_days    INT NOT NULL DEFAULT 90,
    minimum_occurrences     INT NOT NULL DEFAULT 1,
    alert_severity          VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    alert_action            VARCHAR(30) NOT NULL DEFAULT 'GENERATE_ALERT'
                            CHECK (alert_action IN ('GENERATE_ALERT', 'AUTO_BLOCK', 'ESCALATE_IMMEDIATELY')),
    escalation_level        VARCHAR(30) DEFAULT 'COMPLIANCE_OFFICER',
    fatf_typology           VARCHAR(200),
    gcc_guideline_ref       VARCHAR(200),
    enabled                 BOOLEAN NOT NULL DEFAULT true,
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    priority                INT NOT NULL DEFAULT 100,
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_aml_rule_category ON islamic_aml_rule(category);
CREATE INDEX IF NOT EXISTS idx_islamic_aml_rule_enabled  ON islamic_aml_rule(enabled);
CREATE INDEX IF NOT EXISTS idx_islamic_aml_rule_code     ON islamic_aml_rule(rule_code);

-- ============================================================================
-- 2. islamic_aml_alert
-- ============================================================================
CREATE TABLE IF NOT EXISTS islamic_aml_alert (
    id                      BIGSERIAL PRIMARY KEY,
    base_alert_id           BIGINT REFERENCES aml_alert(id),
    alert_ref               VARCHAR(50) UNIQUE NOT NULL,
    rule_id                 BIGINT NOT NULL REFERENCES islamic_aml_rule(id),
    rule_code               VARCHAR(50) NOT NULL,
    detection_date          TIMESTAMP NOT NULL DEFAULT NOW(),
    customer_id             BIGINT NOT NULL,
    customer_name           VARCHAR(300),
    islamic_context         JSONB,
    involved_transactions   JSONB,
    involved_contracts      JSONB,
    involved_accounts       JSONB,
    total_amount_involved   DECIMAL(18,4),
    currency_code           VARCHAR(3),
    risk_score              DECIMAL(8,4),
    assessment_notes        TEXT,
    status                  VARCHAR(30) NOT NULL DEFAULT 'NEW'
                            CHECK (status IN (
                                'NEW', 'UNDER_INVESTIGATION', 'ESCALATED',
                                'SAR_FILED', 'CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE'
                            )),
    assigned_to             VARCHAR(100),
    assigned_at             TIMESTAMP,
    investigated_by         VARCHAR(100),
    investigation_notes     TEXT,
    sar_filed               BOOLEAN DEFAULT false,
    sar_reference           VARCHAR(100),
    closed_by               VARCHAR(100),
    closed_at               TIMESTAMP,
    closure_reason          TEXT,
    sla_deadline            TIMESTAMP,
    sla_breach              BOOLEAN DEFAULT false,
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_aml_alert_ref         ON islamic_aml_alert(alert_ref);
CREATE INDEX IF NOT EXISTS idx_islamic_aml_alert_status      ON islamic_aml_alert(status);
CREATE INDEX IF NOT EXISTS idx_islamic_aml_alert_customer    ON islamic_aml_alert(customer_id);
CREATE INDEX IF NOT EXISTS idx_islamic_aml_alert_rule_code   ON islamic_aml_alert(rule_code);
CREATE INDEX IF NOT EXISTS idx_islamic_aml_alert_sla         ON islamic_aml_alert(sla_deadline);

-- ============================================================================
-- 3. sanctions_list_configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS sanctions_list_configuration (
    id                      BIGSERIAL PRIMARY KEY,
    list_code               VARCHAR(50) UNIQUE NOT NULL,
    list_name               VARCHAR(300) NOT NULL,
    list_provider           VARCHAR(300),
    list_type               VARCHAR(30) NOT NULL
                            CHECK (list_type IN (
                                'SANCTIONS', 'WATCHLIST', 'PEP', 'ADVERSE_MEDIA', 'SHARIAH_RESTRICTED'
                            )),
    applicable_countries    JSONB,
    update_frequency        VARCHAR(20) DEFAULT 'DAILY'
                            CHECK (update_frequency IN ('REAL_TIME', 'DAILY', 'WEEKLY', 'MONTHLY')),
    last_updated            TIMESTAMP,
    data_source_url         VARCHAR(500),
    total_entries           INT DEFAULT 0,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    priority                INT NOT NULL DEFAULT 100,
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT DEFAULT 0
);

-- ============================================================================
-- 4. sanctions_screening_result
-- ============================================================================
CREATE TABLE IF NOT EXISTS sanctions_screening_result (
    id                      BIGSERIAL PRIMARY KEY,
    screening_ref           VARCHAR(50) UNIQUE NOT NULL,
    screening_type          VARCHAR(30) NOT NULL
                            CHECK (screening_type IN (
                                'CUSTOMER_ONBOARDING', 'PERIODIC_REVIEW', 'TRANSACTION',
                                'BENEFICIARY', 'COMMODITY_BROKER', 'TAKAFUL_PROVIDER',
                                'SUKUK_ISSUER', 'COUNTERPARTY_GENERAL'
                            )),
    entity_name             VARCHAR(300) NOT NULL,
    entity_type             VARCHAR(30) NOT NULL
                            CHECK (entity_type IN (
                                'INDIVIDUAL', 'CORPORATE', 'FINANCIAL_INSTITUTION',
                                'COMMODITY_BROKER', 'TAKAFUL_PROVIDER'
                            )),
    entity_identifiers      JSONB,
    entity_country          VARCHAR(3),
    lists_screened          JSONB,
    screening_timestamp     TIMESTAMP NOT NULL DEFAULT NOW(),
    screening_duration_ms   BIGINT,
    overall_result          VARCHAR(20) NOT NULL
                            CHECK (overall_result IN ('CLEAR', 'POTENTIAL_MATCH', 'CONFIRMED_MATCH', 'ERROR')),
    match_details           JSONB,
    highest_match_score     DECIMAL(8,4),
    match_count             INT DEFAULT 0,
    disposition_status      VARCHAR(30) DEFAULT 'PENDING_REVIEW'
                            CHECK (disposition_status IN (
                                'PENDING_REVIEW', 'CLEARED_FALSE_POSITIVE',
                                'CONFIRMED_MATCH_BLOCKED', 'ESCALATED'
                            )),
    reviewed_by             VARCHAR(100),
    reviewed_at             TIMESTAMP,
    review_notes            TEXT,
    customer_id             BIGINT,
    transaction_ref         VARCHAR(100),
    contract_ref            VARCHAR(100),
    alert_id                BIGINT,
    tenant_id               BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sanctions_screening_ref        ON sanctions_screening_result(screening_ref);
CREATE INDEX IF NOT EXISTS idx_sanctions_screening_customer   ON sanctions_screening_result(customer_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_screening_result     ON sanctions_screening_result(overall_result);
CREATE INDEX IF NOT EXISTS idx_sanctions_screening_disp       ON sanctions_screening_result(disposition_status);

-- ============================================================================
-- 5. islamic_str_sar
-- ============================================================================
CREATE TABLE IF NOT EXISTS islamic_str_sar (
    id                          BIGSERIAL PRIMARY KEY,
    base_sar_id                 BIGINT,
    sar_ref                     VARCHAR(50) UNIQUE NOT NULL,
    sar_type                    VARCHAR(20) NOT NULL
                                CHECK (sar_type IN ('STR', 'SAR', 'CTR', 'EFT_REPORT')),
    jurisdiction                VARCHAR(20) NOT NULL
                                CHECK (jurisdiction IN (
                                    'SA_SAFIU', 'AE_GOAML', 'QA_QFIU',
                                    'BH_CBB', 'KW_KFIU', 'OM_CBO'
                                )),
    template_version            VARCHAR(20),
    subject_customer_id         BIGINT NOT NULL,
    subject_customer_name       VARCHAR(300) NOT NULL,
    subject_customer_type       VARCHAR(20) NOT NULL,
    subject_national_id         VARCHAR(50),
    subject_passport_number     VARCHAR(50),
    subject_nationality         VARCHAR(3),
    subject_address             TEXT,
    islamic_product_involved    VARCHAR(50),
    islamic_contract_ref        VARCHAR(100),
    islamic_typology            VARCHAR(200),
    shariah_compliance_alert    BIGINT,
    suspicious_transactions     JSONB,
    total_suspicious_amount     DECIMAL(18,4),
    suspicious_period_from      DATE,
    suspicious_period_to        DATE,
    narrative_summary           TEXT,
    suspicious_indicators       JSONB,
    status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN (
                                    'DRAFT', 'UNDER_REVIEW', 'APPROVED_FOR_FILING',
                                    'FILED', 'ACKNOWLEDGED', 'REJECTED_BY_FIU', 'CLOSED'
                                )),
    prepared_by                 VARCHAR(100),
    prepared_at                 TIMESTAMP DEFAULT NOW(),
    reviewed_by                 VARCHAR(100),
    reviewed_at                 TIMESTAMP,
    mlro_approved_by            VARCHAR(100),
    mlro_approved_at            TIMESTAMP,
    filed_at                    TIMESTAMP,
    filed_via                   VARCHAR(30),
    fiu_reference_number        VARCHAR(100),
    fiu_acknowledged_at         TIMESTAMP,
    fiu_response_notes          TEXT,
    linked_alert_ids            JSONB,
    linked_sanctions_result_ids JSONB,
    linked_shariah_alert_ids    JSONB,
    filing_deadline             DATE NOT NULL,
    is_urgent                   BOOLEAN DEFAULT false,
    deadline_breach             BOOLEAN DEFAULT false,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_str_sar_ref          ON islamic_str_sar(sar_ref);
CREATE INDEX IF NOT EXISTS idx_islamic_str_sar_customer     ON islamic_str_sar(subject_customer_id);
CREATE INDEX IF NOT EXISTS idx_islamic_str_sar_jurisdiction ON islamic_str_sar(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_islamic_str_sar_status       ON islamic_str_sar(status);
CREATE INDEX IF NOT EXISTS idx_islamic_str_sar_deadline     ON islamic_str_sar(filing_deadline);

-- ============================================================================
-- SEED DATA: Islamic AML Rules
-- ============================================================================
INSERT INTO islamic_aml_rule (
    rule_code, name, description, category, islamic_product_context,
    detection_method, rule_parameters, lookback_period_days, minimum_occurrences,
    alert_severity, alert_action, escalation_level, fatf_typology, gcc_guideline_ref,
    enabled, priority, created_by, updated_by
) VALUES
-- 1. IAML-TWR-001: Tawarruq round-tripping
(
    'IAML-TWR-001',
    'Tawarruq Round-Tripping Detection',
    'Detects rapid buy-sell commodity cycles in organised Tawarruq where proceeds are immediately reused to initiate new Tawarruq contracts, indicating potential money laundering through commodity layering.',
    'TAWARRUQ_ABUSE',
    '{"products": ["ORGANISED_TAWARRUQ", "COMMODITY_MURABAHA"], "contract_types": ["TAWARRUQ"]}',
    'VELOCITY',
    '{
        "max_tawarruq_contracts_per_period": 5,
        "period_days": 30,
        "min_amount_per_contract": 10000,
        "proceeds_reuse_window_hours": 48,
        "commodity_same_broker_flag": true,
        "amount_variance_tolerance_pct": 10,
        "escalate_if_cross_border": true
    }',
    90, 3,
    'HIGH', 'ESCALATE_IMMEDIATELY', 'MLRO',
    'FATF Typology: Trade-based ML via commodity Murabaha',
    'MENAFATF Guideline on Islamic Finance ML/TF Risks',
    true, 10,
    'SYSTEM', 'SYSTEM'
),
-- 2. IAML-TWR-002: Tawarruq value structuring
(
    'IAML-TWR-002',
    'Tawarruq Value Structuring',
    'Detects structuring of Tawarruq transactions just below reporting thresholds to avoid detection, a common smurfing technique applied to Islamic finance products.',
    'TAWARRUQ_ABUSE',
    '{"products": ["ORGANISED_TAWARRUQ"], "contract_types": ["TAWARRUQ"]}',
    'THRESHOLD',
    '{
        "reporting_threshold": 50000,
        "structuring_band_pct": 15,
        "min_transactions_below_threshold": 3,
        "period_days": 7,
        "aggregate_exceeds_threshold": true,
        "same_beneficiary_flag": true,
        "different_branches_flag": true
    }',
    30, 3,
    'HIGH', 'GENERATE_ALERT', 'COMPLIANCE_OFFICER',
    'FATF Typology: Structuring / Smurfing in commodity finance',
    'SAMA AML/CFT Guidelines for Islamic Banking',
    true, 20,
    'SYSTEM', 'SYSTEM'
),
-- 3. IAML-POOL-001: Musharakah pool layering
(
    'IAML-POOL-001',
    'Musharakah Pool Layering Detection',
    'Detects layering through multiple Musharakah partnership pools where funds are moved between pools with no genuine economic purpose, obscuring the origin of funds.',
    'POOL_LAYERING',
    '{"products": ["MUSHARAKAH", "DIMINISHING_MUSHARAKAH"], "contract_types": ["MUSHARAKAH", "SHIRKAH"]}',
    'NETWORK',
    '{
        "min_pool_transfers": 3,
        "period_days": 60,
        "circular_flow_detection": true,
        "min_amount": 25000,
        "same_ultimate_beneficiary": true,
        "pool_entry_exit_window_days": 5,
        "related_party_depth": 3,
        "profit_distribution_anomaly_check": true
    }',
    120, 2,
    'CRITICAL', 'ESCALATE_IMMEDIATELY', 'MLRO',
    'FATF Typology: Layering through investment vehicles',
    'MENAFATF Islamic Finance Typologies Report',
    true, 5,
    'SYSTEM', 'SYSTEM'
),
-- 4. IAML-POOL-002: Mudarabah profit manipulation
(
    'IAML-POOL-002',
    'Mudarabah Profit Manipulation',
    'Detects abnormal profit distribution patterns in Mudarabah pools that may indicate fictitious returns used to justify illicit fund movements.',
    'POOL_LAYERING',
    '{"products": ["MUDARABAH", "RESTRICTED_MUDARABAH", "UNRESTRICTED_MUDARABAH"], "contract_types": ["MUDARABAH"]}',
    'BEHAVIORAL',
    '{
        "profit_rate_deviation_threshold_pct": 30,
        "benchmark_profit_rate_source": "POOL_AVERAGE",
        "min_investment_amount": 50000,
        "rapid_withdrawal_after_profit_days": 7,
        "new_investor_high_return_flag": true,
        "period_days": 90,
        "compare_with_market_rate": true
    }',
    180, 2,
    'HIGH', 'GENERATE_ALERT', 'COMPLIANCE_OFFICER',
    'FATF Typology: Investment fraud / Ponzi indicators',
    'AAOIFI Shariah Standard on Mudarabah Compliance',
    true, 15,
    'SYSTEM', 'SYSTEM'
),
-- 5. IAML-AST-001: Asset value manipulation in Ijarah
(
    'IAML-AST-001',
    'Ijarah Asset Value Manipulation',
    'Detects over- or under-valuation of assets in Ijarah (lease) contracts that may be used to move value between parties as part of a laundering scheme.',
    'ASSET_VALUE_MANIPULATION',
    '{"products": ["IJARAH", "IJARAH_MUNTAHIA_BITTAMLEEK", "IJARAH_MAWSUFA"], "contract_types": ["IJARAH"]}',
    'COMPOSITE',
    '{
        "valuation_deviation_threshold_pct": 25,
        "valuation_source": "MARKET_COMPARABLE",
        "asset_types": ["REAL_ESTATE", "EQUIPMENT", "VEHICLE"],
        "rapid_succession_contracts_same_asset": true,
        "succession_window_days": 180,
        "related_party_transaction_flag": true,
        "min_asset_value": 100000,
        "cross_reference_land_registry": true
    }',
    365, 1,
    'HIGH', 'ESCALATE_IMMEDIATELY', 'MLRO',
    'FATF Typology: Real estate / Asset-based ML',
    'MENAFATF Real Estate ML Typologies',
    true, 10,
    'SYSTEM', 'SYSTEM'
),
-- 6. IAML-MSH-001: Musharakah partnership layering
(
    'IAML-MSH-001',
    'Musharakah Partnership Shell Layering',
    'Detects the use of multiple nested Musharakah partnerships to create complex ownership structures that obscure beneficial ownership and facilitate layering of illicit funds.',
    'PARTNERSHIP_LAYERING',
    '{"products": ["MUSHARAKAH", "DIMINISHING_MUSHARAKAH"], "contract_types": ["MUSHARAKAH", "SHIRKAH"]}',
    'NETWORK',
    '{
        "max_partnership_depth": 3,
        "min_partnerships_in_chain": 2,
        "period_days": 365,
        "dormant_partner_activity_flag": true,
        "rapid_partner_change_days": 30,
        "nominee_shareholder_detection": true,
        "beneficial_ownership_opacity_score_min": 0.7,
        "cross_jurisdiction_flag": true,
        "min_total_value": 500000
    }',
    365, 1,
    'CRITICAL', 'ESCALATE_IMMEDIATELY', 'MLRO',
    'FATF Typology: Shell companies and complex ownership',
    'FATF Guidance on Beneficial Ownership for Legal Persons',
    true, 5,
    'SYSTEM', 'SYSTEM'
),
-- 7. IAML-CHR-001: Charity / Waqf misuse
(
    'IAML-CHR-001',
    'Charity and Waqf Fund Misuse Detection',
    'Detects misuse of Islamic charity (Zakat, Sadaqah) and Waqf endowment channels for terrorism financing or money laundering, including diversion of funds to non-charitable purposes.',
    'CHARITY_MISUSE',
    '{"products": ["WAQF", "ZAKAT", "SADAQAH"], "contract_types": ["WAQF", "CHARITY"]}',
    'PATTERN',
    '{
        "unusual_beneficiary_pattern": true,
        "high_value_single_donation_threshold": 100000,
        "frequent_small_donations_count": 20,
        "frequent_small_donations_period_days": 30,
        "cross_border_charity_flag": true,
        "high_risk_country_list": ["FATF_GREYLIST", "FATF_BLACKLIST"],
        "beneficiary_screening_required": true,
        "cash_donation_ratio_threshold_pct": 60,
        "dormant_waqf_sudden_activity": true,
        "min_total_amount": 50000
    }',
    180, 2,
    'HIGH', 'ESCALATE_IMMEDIATELY', 'MLRO',
    'FATF Typology: NPO / Charity abuse for TF',
    'FATF Best Practices on Combating the Abuse of NPOs',
    true, 5,
    'SYSTEM', 'SYSTEM'
),
-- 8. IAML-XBR-001: Cross-border Islamic finance layering
(
    'IAML-XBR-001',
    'Cross-Border Islamic Finance Layering',
    'Detects complex cross-border Islamic finance arrangements involving Sukuk, syndicated Murabaha, or cross-border Ijarah used to layer and integrate illicit funds across multiple jurisdictions.',
    'CROSS_BORDER_ISLAMIC',
    '{"products": ["SUKUK", "SYNDICATED_MURABAHA", "CROSS_BORDER_IJARAH", "WAKALA"], "contract_types": ["SUKUK", "MURABAHA", "IJARAH", "WAKALA"]}',
    'COMPOSITE',
    '{
        "min_jurisdictions_involved": 2,
        "high_risk_jurisdiction_flag": true,
        "rapid_cross_border_transfers_count": 3,
        "rapid_cross_border_transfers_period_days": 14,
        "sukuk_rapid_trading_flag": true,
        "sukuk_holding_period_min_days": 1,
        "correspondent_bank_chain_depth_max": 4,
        "amount_threshold": 250000,
        "currency_mismatch_flag": true,
        "trade_document_verification": true,
        "sanctions_country_involvement": true
    }',
    90, 1,
    'CRITICAL', 'AUTO_BLOCK', 'MLRO',
    'FATF Typology: Trade-based ML / Cross-border layering',
    'MENAFATF Cross-Border Islamic Finance Risks Guidance',
    true, 3,
    'SYSTEM', 'SYSTEM'
)
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Sanctions List Configurations
-- ============================================================================
INSERT INTO sanctions_list_configuration (
    list_code, list_name, list_provider, list_type, applicable_countries,
    update_frequency, data_source_url, total_entries, is_active, priority,
    created_by, updated_by
) VALUES
(
    'SAFIU',
    'Saudi Arabia Financial Intelligence Unit Sanctions List',
    'Saudi Arabian Monetary Authority (SAMA)',
    'SANCTIONS',
    '["SA"]',
    'DAILY',
    'https://safiu.gov.sa/sanctions',
    0, true, 10,
    'SYSTEM', 'SYSTEM'
),
(
    'GOAML_UAE',
    'UAE goAML Financial Intelligence Unit List',
    'UAE Financial Intelligence Unit',
    'SANCTIONS',
    '["AE"]',
    'DAILY',
    'https://goaml.gov.ae',
    0, true, 10,
    'SYSTEM', 'SYSTEM'
),
(
    'CBUAE_SANCTIONS',
    'Central Bank of UAE Local Sanctions List',
    'Central Bank of the UAE',
    'SANCTIONS',
    '["AE"]',
    'REAL_TIME',
    'https://cbuae.gov.ae/sanctions',
    0, true, 5,
    'SYSTEM', 'SYSTEM'
),
(
    'QFIU',
    'Qatar Financial Intelligence Unit List',
    'Qatar Financial Information Unit',
    'SANCTIONS',
    '["QA"]',
    'DAILY',
    'https://qfiu.gov.qa',
    0, true, 10,
    'SYSTEM', 'SYSTEM'
),
(
    'CBB_SANCTIONS',
    'Central Bank of Bahrain Sanctions List',
    'Central Bank of Bahrain',
    'SANCTIONS',
    '["BH"]',
    'DAILY',
    'https://cbb.gov.bh/sanctions',
    0, true, 10,
    'SYSTEM', 'SYSTEM'
),
(
    'UNSC',
    'United Nations Security Council Consolidated Sanctions List',
    'United Nations',
    'SANCTIONS',
    NULL,
    'DAILY',
    'https://scsanctions.un.org/consolidated',
    0, true, 1,
    'SYSTEM', 'SYSTEM'
),
(
    'OFAC_SDN',
    'OFAC Specially Designated Nationals and Blocked Persons List',
    'U.S. Department of the Treasury',
    'SANCTIONS',
    NULL,
    'DAILY',
    'https://sanctionssearch.ofac.treas.gov',
    0, true, 1,
    'SYSTEM', 'SYSTEM'
),
(
    'EU_SANCTIONS',
    'European Union Consolidated Sanctions List',
    'European Commission',
    'SANCTIONS',
    NULL,
    'DAILY',
    'https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions',
    0, true, 5,
    'SYSTEM', 'SYSTEM'
),
(
    'UK_HMT',
    'UK HM Treasury Financial Sanctions List',
    'HM Treasury',
    'SANCTIONS',
    '["GB"]',
    'DAILY',
    'https://ofsistorage.blob.core.windows.net/publishlive/ConList.csv',
    0, true, 5,
    'SYSTEM', 'SYSTEM'
),
(
    'PEP_GLOBAL',
    'Global Politically Exposed Persons Database',
    'Aggregated PEP Data Provider',
    'PEP',
    NULL,
    'WEEKLY',
    NULL,
    0, true, 20,
    'SYSTEM', 'SYSTEM'
)
ON CONFLICT (list_code) DO NOTHING;
