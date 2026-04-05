-- ============================================================================
-- V101__islamic_payment_hub.sql
-- Islamic Payment Hub
-- NOTE: V92 is already occupied in this repository, so the Islamic payment hub
-- migration is introduced as V101 to preserve Flyway ordering.
-- ============================================================================

SET search_path TO cbs;

-- ---------------------------------------------------------------------------
-- Payment Islamic extension
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_islamic_extension (
    id                              BIGSERIAL PRIMARY KEY,
    payment_id                      BIGINT NOT NULL UNIQUE REFERENCES payment_instruction(id),
    shariah_screened                BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_screening_ref           VARCHAR(50),
    shariah_screening_result        VARCHAR(20) CHECK (shariah_screening_result IN ('PASS','FAIL','ALERT','WARN','NOT_SCREENED')),
    shariah_screened_at             TIMESTAMP,
    merchant_category_code          VARCHAR(10),
    merchant_name                   VARCHAR(200),
    merchant_country                VARCHAR(10),
    is_haram_mcc                    BOOLEAN NOT NULL DEFAULT FALSE,
    counterparty_on_exclusion_list  BOOLEAN NOT NULL DEFAULT FALSE,
    exclusion_list_match_details    TEXT,
    source_account_is_islamic       BOOLEAN NOT NULL DEFAULT FALSE,
    source_contract_type_code       VARCHAR(30),
    source_product_code             VARCHAR(30),
    payment_purpose                 VARCHAR(40) CHECK (payment_purpose IN (
                                        'GENERAL','SALARY','SUPPLIER_PAYMENT','UTILITY','RENT','GOVERNMENT',
                                        'CHARITY_DONATION','ZAKAT','TAKAFUL_PREMIUM','FINANCING_REPAYMENT',
                                        'INVESTMENT','INTRA_BANK_TRANSFER','FOREIGN_REMITTANCE','OTHER'
                                    )),
    purpose_description             TEXT,
    shariah_purpose_flag            VARCHAR(30) CHECK (shariah_purpose_flag IN (
                                        'COMPLIANT','NON_COMPLIANT','REQUIRES_REVIEW','NOT_APPLICABLE'
                                    )),
    islamic_transaction_code        VARCHAR(50),
    aaoifi_reporting_category       VARCHAR(100),
    compliance_action_taken         VARCHAR(30) CHECK (compliance_action_taken IN (
                                        'NONE','PASSED','BLOCKED','ALLOWED_WITH_ALERT','MANUAL_OVERRIDE'
                                    )),
    manual_override_by              VARCHAR(100),
    manual_override_reason          TEXT,
    manual_override_approved_by     VARCHAR(100),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payment_islamic_result
    ON payment_islamic_extension (shariah_screening_result);
CREATE INDEX IF NOT EXISTS idx_payment_islamic_haram_mcc
    ON payment_islamic_extension (is_haram_mcc);
CREATE INDEX IF NOT EXISTS idx_payment_islamic_action
    ON payment_islamic_extension (compliance_action_taken);
CREATE INDEX IF NOT EXISTS idx_payment_islamic_source
    ON payment_islamic_extension (source_account_is_islamic);

-- ---------------------------------------------------------------------------
-- Payment screening audit log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_shariah_audit_log (
    id                              BIGSERIAL PRIMARY KEY,
    payment_id                      BIGINT NOT NULL UNIQUE REFERENCES payment_instruction(id),
    payment_ref                     VARCHAR(40) NOT NULL,
    screening_timestamp             TIMESTAMP NOT NULL,
    screening_duration_ms           BIGINT NOT NULL,
    source_account_number           VARCHAR(34),
    destination_account_number      VARCHAR(34),
    beneficiary_name                VARCHAR(200),
    beneficiary_bank_swift          VARCHAR(20),
    mcc_code                        VARCHAR(10),
    amount                          NUMERIC(18,2) NOT NULL,
    currency                        VARCHAR(3) NOT NULL,
    payment_channel                 VARCHAR(20) NOT NULL,
    overall_result                  VARCHAR(20) NOT NULL CHECK (overall_result IN ('PASS','FAIL','ALERT','WARN','NOT_SCREENED')),
    rules_checked                   INT NOT NULL DEFAULT 0,
    rules_failed                    INT NOT NULL DEFAULT 0,
    failed_rule_codes               JSONB NOT NULL DEFAULT '[]'::jsonb,
    failed_rule_descriptions        JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_taken                    VARCHAR(30) NOT NULL CHECK (action_taken IN ('ALLOWED','BLOCKED','ALLOWED_WITH_ALERT','MANUAL_OVERRIDE')),
    alert_generated                 BOOLEAN NOT NULL DEFAULT FALSE,
    alert_id                        BIGINT,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payment_shariah_audit_payment_ref
    ON payment_shariah_audit_log (payment_ref);
CREATE INDEX IF NOT EXISTS idx_payment_shariah_audit_result_ts
    ON payment_shariah_audit_log (overall_result, screening_timestamp);
CREATE INDEX IF NOT EXISTS idx_payment_shariah_audit_action
    ON payment_shariah_audit_log (action_taken);

-- ---------------------------------------------------------------------------
-- Domestic rails
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS domestic_payment_config (
    id                              BIGSERIAL PRIMARY KEY,
    country_code                    VARCHAR(3) NOT NULL,
    rail_name                       VARCHAR(40) NOT NULL,
    rail_type                       VARCHAR(20) NOT NULL CHECK (rail_type IN ('RTGS','ACH','IPS')),
    operating_hours_start           VARCHAR(10),
    operating_hours_end             VARCHAR(10),
    operating_days                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    currency_code                   VARCHAR(3) NOT NULL,
    minimum_amount                  NUMERIC(18,2),
    maximum_amount                  NUMERIC(18,2),
    settlement_cutoff_time          VARCHAR(10),
    message_format                  VARCHAR(20) NOT NULL CHECK (message_format IN ('ISO_20022','SWIFT_MT','PROPRIETARY')),
    bank_participant_code           VARCHAR(30),
    is_active                       BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_domestic_payment_config UNIQUE (country_code, rail_name)
);

CREATE INDEX IF NOT EXISTS idx_domestic_payment_config_active
    ON domestic_payment_config (is_active);

CREATE TABLE IF NOT EXISTS domestic_payment_message (
    id                              BIGSERIAL PRIMARY KEY,
    payment_id                      BIGINT NOT NULL REFERENCES payment_instruction(id),
    rail_config_id                  BIGINT NOT NULL REFERENCES domestic_payment_config(id),
    message_ref                     VARCHAR(50) NOT NULL UNIQUE,
    message_type                    VARCHAR(30) NOT NULL,
    message_direction               VARCHAR(10) NOT NULL CHECK (message_direction IN ('OUTBOUND','INBOUND')),
    message_content                 TEXT,
    islamic_transaction_code        VARCHAR(50),
    shariah_compliance_flag         VARCHAR(5),
    submitted_at                    TIMESTAMP,
    acknowledged_at                 TIMESTAMP,
    settled_at                      TIMESTAMP,
    rejected_at                     TIMESTAMP,
    rejection_code                  VARCHAR(30),
    rejection_reason                TEXT,
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','SUBMITTED','ACKNOWLEDGED','SETTLED','REJECTED','TIMED_OUT','CANCELLED')),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_domestic_payment_message_payment
    ON domestic_payment_message (payment_id);
CREATE INDEX IF NOT EXISTS idx_domestic_payment_message_status_submitted
    ON domestic_payment_message (status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_domestic_payment_message_rail_status
    ON domestic_payment_message (rail_config_id, status);

-- ---------------------------------------------------------------------------
-- Cross-border and instant extensions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cross_border_payment_extension (
    id                              BIGSERIAL PRIMARY KEY,
    payment_id                      BIGINT NOT NULL UNIQUE REFERENCES payment_instruction(id),
    swift_message_ref               VARCHAR(50),
    message_type                    VARCHAR(20),
    correspondent_bank_swift        VARCHAR(20),
    correspondent_bank_name         VARCHAR(200),
    beneficiary_bank_swift          VARCHAR(20),
    beneficiary_bank_name           VARCHAR(200),
    beneficiary_bank_country        VARCHAR(10),
    field72_narrative               TEXT,
    islamic_purpose_code            VARCHAR(40),
    regulatory_reporting_code       VARCHAR(40),
    correspondent_screened          BOOLEAN NOT NULL DEFAULT FALSE,
    correspondent_screening_result  VARCHAR(20) CHECK (correspondent_screening_result IN ('PASS','FAIL','ALERT','WARN','NOT_SCREENED')),
    beneficiary_bank_screened       BOOLEAN NOT NULL DEFAULT FALSE,
    beneficiary_bank_screening_result VARCHAR(20) CHECK (beneficiary_bank_screening_result IN ('PASS','FAIL','ALERT','WARN','NOT_SCREENED')),
    charges_option                  VARCHAR(10) CHECK (charges_option IN ('OUR','BEN','SHA')),
    estimated_charges               NUMERIC(18,2),
    actual_charges                  NUMERIC(18,2),
    charges_gl_ref                  VARCHAR(50),
    fx_required                     BOOLEAN NOT NULL DEFAULT FALSE,
    source_currency                 VARCHAR(3),
    destination_currency            VARCHAR(3),
    fx_rate                         NUMERIC(18,8),
    fx_spot_date                    DATE,
    fx_deal_ref                     VARCHAR(50),
    fx_settlement_amount            NUMERIC(18,2),
    swift_status                    VARCHAR(20) NOT NULL CHECK (swift_status IN ('PENDING','SENT','ACKNOWLEDGED','DELIVERED','RETURNED','REJECTED')),
    swift_status_timestamp          TIMESTAMP,
    swift_tracking_url              VARCHAR(255),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cross_border_swift_status
    ON cross_border_payment_extension (swift_status);
CREATE INDEX IF NOT EXISTS idx_cross_border_beneficiary_country
    ON cross_border_payment_extension (beneficiary_bank_country);

CREATE TABLE IF NOT EXISTS instant_payment_extension (
    id                              BIGSERIAL PRIMARY KEY,
    payment_id                      BIGINT NOT NULL UNIQUE REFERENCES payment_instruction(id),
    ips_rail                        VARCHAR(40),
    ips_transaction_id              VARCHAR(50),
    ips_response_code               VARCHAR(20),
    ips_response_message            TEXT,
    request_received_at             TIMESTAMP NOT NULL,
    screening_completed_at          TIMESTAMP,
    screening_duration_ms           BIGINT,
    payment_submitted_at            TIMESTAMP,
    payment_confirmed_at            TIMESTAMP,
    total_processing_ms             BIGINT,
    screening_mode                  VARCHAR(20) CHECK (screening_mode IN ('REAL_TIME','DEFERRED')),
    deferred_screening_result       VARCHAR(20) CHECK (deferred_screening_result IN ('PENDING','PASS','FAIL','ALERT')),
    deferred_screening_completed_at TIMESTAMP,
    proxy_type                      VARCHAR(20) CHECK (proxy_type IN ('MOBILE','EMAIL','NATIONAL_ID','CR_NUMBER','IBAN')),
    proxy_value                     VARCHAR(100),
    resolved_account_number         VARCHAR(34),
    resolved_bank_code              VARCHAR(20),
    status                          VARCHAR(20) NOT NULL CHECK (status IN ('INITIATED','SCREENING','SUBMITTED','CONFIRMED','REJECTED','TIMED_OUT','RETURNED')),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_instant_payment_rail_status
    ON instant_payment_extension (ips_rail, status);
CREATE INDEX IF NOT EXISTS idx_instant_payment_screening_mode
    ON instant_payment_extension (screening_mode);
CREATE INDEX IF NOT EXISTS idx_instant_payment_status_received
    ON instant_payment_extension (status, request_received_at);

-- ---------------------------------------------------------------------------
-- Domestic rail seed data
-- ---------------------------------------------------------------------------

INSERT INTO domestic_payment_config (
    country_code, rail_name, rail_type, operating_hours_start, operating_hours_end,
    operating_days, currency_code, minimum_amount, maximum_amount, settlement_cutoff_time,
    message_format, bank_participant_code, is_active, tenant_id, created_by, updated_by
)
VALUES
    ('SA', 'SARIE', 'RTGS', '08:00', '14:00', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY"]'::jsonb, 'SAR', 50000, NULL, '14:00', 'ISO_20022', 'SA-SARIE-001', TRUE, NULL, 'SYSTEM', 'SYSTEM'),
    ('SA', 'SADAD', 'ACH', '00:00', '23:59', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]'::jsonb, 'SAR', NULL, NULL, '23:59', 'PROPRIETARY', 'SA-SADAD-001', TRUE, NULL, 'SYSTEM', 'SYSTEM'),
    ('AE', 'UAEFTS', 'RTGS', '08:30', '13:00', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY"]'::jsonb, 'AED', NULL, NULL, '13:00', 'ISO_20022', 'AE-UAEFTS-001', TRUE, NULL, 'SYSTEM', 'SYSTEM'),
    ('AE', 'UAEACH', 'ACH', '08:30', '16:00', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY"]'::jsonb, 'AED', NULL, NULL, '16:00', 'ISO_20022', 'AE-UAEACH-001', TRUE, NULL, 'SYSTEM', 'SYSTEM'),
    ('QA', 'QPAY', 'RTGS', '07:30', '13:30', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY"]'::jsonb, 'QAR', NULL, NULL, '13:30', 'ISO_20022', 'QA-QPAY-001', TRUE, NULL, 'SYSTEM', 'SYSTEM'),
    ('BH', 'BHEFTS', 'RTGS', '08:00', '13:30', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY"]'::jsonb, 'BHD', NULL, NULL, '13:30', 'ISO_20022', 'BH-EFTS-001', TRUE, NULL, 'SYSTEM', 'SYSTEM'),
    ('KW', 'KASSIP', 'IPS', '00:00', '23:59', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]'::jsonb, 'KWD', NULL, NULL, '23:59', 'ISO_20022', 'KW-KASSIP-001', TRUE, NULL, 'SYSTEM', 'SYSTEM'),
    ('OM', 'OMSWITCH', 'IPS', '00:00', '23:59', '["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]'::jsonb, 'OMR', NULL, NULL, '23:59', 'ISO_20022', 'OM-IP-001', TRUE, NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (country_code, rail_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Exclusion lists and entries for payment screening
-- ---------------------------------------------------------------------------

INSERT INTO shariah_exclusion_list (list_code, name, description, list_type, status, last_updated_at, approved_by, created_by, updated_by)
VALUES
    ('PROHIBITED_COUNTERPARTIES', 'Prohibited counterparties', 'Counterparties prohibited for Islamic payment execution', 'COUNTERPARTY_ID', 'ACTIVE', NOW(), 'SYSTEM', 'SYSTEM', 'SYSTEM'),
    ('PROHIBITED_PAYMENT_PURPOSES', 'Prohibited payment purpose keywords', 'Keywords that require payment purpose review', 'KEYWORD', 'ACTIVE', NOW(), 'SYSTEM', 'SYSTEM', 'SYSTEM'),
    ('PROHIBITED_BANKS', 'Restricted beneficiary banks', 'Banks that must be reviewed or blocked for Islamic cross-border flows', 'COUNTERPARTY_ID', 'ACTIVE', NOW(), 'SYSTEM', 'SYSTEM', 'SYSTEM'),
    ('SANCTIONED_COUNTRIES', 'Sanctioned countries', 'Countries blocked for Islamic payment routing', 'COUNTRY', 'ACTIVE', NOW(), 'SYSTEM', 'SYSTEM', 'SYSTEM')
ON CONFLICT (list_code) DO NOTHING;

INSERT INTO shariah_exclusion_list_entry (list_id, entry_value, entry_description, reason, added_at, added_by, status)
SELECT l.id, e.entry_value, e.entry_description, e.reason, CURRENT_DATE, 'SYSTEM', 'ACTIVE'
FROM shariah_exclusion_list l
JOIN (
    VALUES
        ('PROHIBITED_COUNTERPARTIES', 'CASINO ROYALE LLC', 'Gambling operator', 'Haram gaming activity'),
        ('PROHIBITED_COUNTERPARTIES', 'INTEREST FINANCE LTD', 'Conventional lender', 'Interest-based lender'),
        ('PROHIBITED_PAYMENT_PURPOSES', 'gambling', 'Gambling payment', 'Requires Shariah review'),
        ('PROHIBITED_PAYMENT_PURPOSES', 'alcohol', 'Alcohol purchase', 'Requires Shariah review'),
        ('PROHIBITED_PAYMENT_PURPOSES', 'interest payment', 'Interest payment', 'Requires Shariah review'),
        ('PROHIBITED_BANKS', 'RIBAINTX', 'Restricted bank SWIFT', 'Bank on restricted list'),
        ('SANCTIONED_COUNTRIES', 'IR', 'Iran', 'Sanctioned jurisdiction')
) AS e(list_code, entry_value, entry_description, reason)
    ON l.list_code = e.list_code
WHERE NOT EXISTS (
    SELECT 1
    FROM shariah_exclusion_list_entry existing
    WHERE existing.list_id = l.id
      AND existing.entry_value = e.entry_value
      AND existing.status = 'ACTIVE'
);

-- ---------------------------------------------------------------------------
-- Payment-specific screening rules
-- ---------------------------------------------------------------------------

INSERT INTO shariah_screening_rule (
    rule_code, name, description, category, applicable_transaction_types,
    applicable_contract_types, screening_point, action, severity, rule_type,
    reference_list_code, effective_from, enabled, priority,
    condition_expression, threshold_field, threshold_operator, threshold_value,
    created_by, updated_by
)
VALUES
    ('SHARIAH-PAY-001', 'Payments from Islamic accounts must be screened against compliant source products',
        'Block payments from Islamic accounts whose underlying product is not compliant or lacks active fatwa',
        'PRODUCT_COMPLIANCE', '["PAYMENT"]'::jsonb, '["ALL"]'::jsonb, 'PRE_EXECUTION', 'BLOCK', 'CRITICAL',
        'CONDITION_EXPRESSION', NULL, CURRENT_DATE, TRUE, 10,
        '#sourceAccountIsIslamic == true && (#productFatwaActive == false || #shariahComplianceStatus != ''COMPLIANT'')',
        NULL, NULL, NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-PAY-002', 'Haram MCC payments prohibited',
        'Block payments to merchants whose MCC is on the Haram list',
        'MERCHANT_CATEGORY', '["PAYMENT"]'::jsonb, '["ALL"]'::jsonb, 'PRE_EXECUTION', 'BLOCK', 'CRITICAL',
        'MCC_LIST', 'HARAM_MCC', CURRENT_DATE, TRUE, 20,
        NULL, NULL, NULL, NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-PAY-003', 'FX must be spot settlement (no forward)',
        'Block payment flows requesting forward FX settlement',
        'GENERAL_SHARIAH', '["PAYMENT"]'::jsonb, '["ALL"]'::jsonb, 'PRE_EXECUTION', 'BLOCK', 'HIGH',
        'CONDITION_EXPRESSION', NULL, CURRENT_DATE, TRUE, 30,
        '#forwardFxRequested == true', NULL, NULL, NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-PAY-004', 'Large payment enhanced review',
        'Alert on large payments requiring enhanced review',
        'GENERAL_SHARIAH', '["PAYMENT"]'::jsonb, '["ALL"]'::jsonb, 'PRE_EXECUTION', 'ALERT', 'MEDIUM',
        'THRESHOLD', NULL, CURRENT_DATE, TRUE, 40,
        NULL, 'amount', 'GTE', 1000000.00, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-PAY-005', 'Prohibited purpose keywords',
        'Alert when payment purpose contains prohibited keywords',
        'GENERAL_SHARIAH', '["PAYMENT"]'::jsonb, '["ALL"]'::jsonb, 'PRE_EXECUTION', 'ALERT', 'MEDIUM',
        'CONDITION_EXPRESSION', NULL, CURRENT_DATE, TRUE, 50,
        '#paymentPurposeKeywordMatch == true', NULL, NULL, NULL, 'SYSTEM', 'SYSTEM'),
    ('SHARIAH-PAY-006', 'Prohibited counterparties',
        'Block payments to prohibited counterparties',
        'COUNTERPARTY', '["PAYMENT"]'::jsonb, '["ALL"]'::jsonb, 'PRE_EXECUTION', 'BLOCK', 'CRITICAL',
        'ENTITY_LIST', 'PROHIBITED_COUNTERPARTIES', CURRENT_DATE, TRUE, 60,
        NULL, NULL, NULL, NULL, 'SYSTEM', 'SYSTEM')
ON CONFLICT (rule_code) DO NOTHING;
