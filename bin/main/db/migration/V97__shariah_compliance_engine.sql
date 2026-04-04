-- ============================================================================
-- V97: Shariah Compliance Engine
-- Capabilities: Screening, SNCI, Purification, Audit
-- ============================================================================

SET search_path TO cbs;

-- ============================================================================
-- CAPABILITY 1: SCREENING
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. shariah_screening_rule
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_screening_rule (
    id                          BIGSERIAL PRIMARY KEY,
    rule_code                   VARCHAR(50) UNIQUE NOT NULL,
    name                        VARCHAR(300) NOT NULL,
    name_ar                     VARCHAR(300),
    description                 TEXT,
    description_ar              TEXT,
    category                    VARCHAR(30) NOT NULL CHECK (category IN (
                                    'MERCHANT_CATEGORY', 'COUNTERPARTY', 'STRUCTURAL',
                                    'PRODUCT_COMPLIANCE', 'PRICING', 'GHARAR', 'RIBA',
                                    'OWNERSHIP', 'POOL_SEGREGATION', 'GENERAL_SHARIAH')),
    applicable_transaction_types JSONB,
    applicable_contract_types   JSONB,
    screening_point             VARCHAR(20) NOT NULL DEFAULT 'PRE_EXECUTION'
                                    CHECK (screening_point IN ('PRE_EXECUTION', 'POST_EXECUTION', 'BOTH')),
    action                      VARCHAR(20) NOT NULL DEFAULT 'ALERT'
                                    CHECK (action IN ('BLOCK', 'ALERT', 'WARN', 'LOG_ONLY')),
    severity                    VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                                    CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    rule_type                   VARCHAR(30) NOT NULL CHECK (rule_type IN (
                                    'MCC_LIST', 'ENTITY_LIST', 'BUSINESS_RULE_REF',
                                    'THRESHOLD', 'CONDITION_EXPRESSION', 'COMPOSITE')),
    business_rule_code          VARCHAR(100),
    condition_expression        TEXT,
    threshold_field             VARCHAR(100),
    threshold_operator          VARCHAR(10) CHECK (threshold_operator IN (
                                    'GT', 'GTE', 'LT', 'LTE', 'EQ', 'BETWEEN')),
    threshold_value             DECIMAL(18,4),
    threshold_value_to          DECIMAL(18,4),
    reference_list_code         VARCHAR(50),
    shariah_reference           VARCHAR(200),
    approved_by                 VARCHAR(100),
    approved_at                 TIMESTAMP,
    effective_from              DATE NOT NULL,
    effective_to                DATE,
    enabled                     BOOLEAN NOT NULL DEFAULT true,
    priority                    INT NOT NULL DEFAULT 100,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_screening_rule_category ON shariah_screening_rule (category);
CREATE INDEX IF NOT EXISTS idx_screening_rule_enabled ON shariah_screening_rule (enabled);
CREATE INDEX IF NOT EXISTS idx_screening_rule_code ON shariah_screening_rule (rule_code);

-- --------------------------------------------------------------------------
-- 2. shariah_exclusion_list
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_exclusion_list (
    id                          BIGSERIAL PRIMARY KEY,
    list_code                   VARCHAR(50) UNIQUE NOT NULL,
    name                        VARCHAR(200) NOT NULL,
    description                 TEXT,
    list_type                   VARCHAR(20) NOT NULL CHECK (list_type IN (
                                    'MCC_CODE', 'COUNTERPARTY_ID', 'SECTOR_CODE',
                                    'KEYWORD', 'COUNTRY')),
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_updated_at             TIMESTAMP,
    last_updated_by             VARCHAR(100),
    approved_by                 VARCHAR(100),
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

-- --------------------------------------------------------------------------
-- 3. shariah_exclusion_list_entry
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_exclusion_list_entry (
    id                          BIGSERIAL PRIMARY KEY,
    list_id                     BIGINT NOT NULL REFERENCES shariah_exclusion_list(id),
    entry_value                 VARCHAR(200) NOT NULL,
    entry_description           VARCHAR(500),
    reason                      TEXT,
    added_at                    DATE NOT NULL DEFAULT CURRENT_DATE,
    added_by                    VARCHAR(100),
    expires_at                  DATE,
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exclusion_entry_list_id ON shariah_exclusion_list_entry (list_id);
CREATE INDEX IF NOT EXISTS idx_exclusion_entry_value ON shariah_exclusion_list_entry (entry_value);
CREATE INDEX IF NOT EXISTS idx_exclusion_entry_status ON shariah_exclusion_list_entry (status);

-- --------------------------------------------------------------------------
-- 4. shariah_screening_result
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_screening_result (
    id                          BIGSERIAL PRIMARY KEY,
    screening_ref               VARCHAR(50) UNIQUE NOT NULL,
    transaction_ref             VARCHAR(100),
    transaction_type            VARCHAR(50),
    transaction_amount          DECIMAL(18,4),
    transaction_currency        VARCHAR(3),
    contract_ref                VARCHAR(100),
    contract_type_code          VARCHAR(30),
    customer_id                 BIGINT,
    counterparty_name           VARCHAR(200),
    merchant_category_code      VARCHAR(10),
    overall_result              VARCHAR(10) NOT NULL CHECK (overall_result IN (
                                    'PASS', 'FAIL', 'ALERT', 'WARN')),
    rules_evaluated             INT DEFAULT 0,
    rules_passed                INT DEFAULT 0,
    rules_failed                INT DEFAULT 0,
    rules_alerted               INT DEFAULT 0,
    rule_results                JSONB,
    action_taken                VARCHAR(30) NOT NULL CHECK (action_taken IN (
                                    'ALLOWED', 'BLOCKED', 'ALLOWED_WITH_ALERT',
                                    'ALLOWED_WITH_WARNING')),
    block_reason                TEXT,
    block_reason_ar             TEXT,
    alert_id                    BIGINT,
    screened_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
    screened_by                 VARCHAR(100),
    processing_time_ms          BIGINT,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_screening_result_txn_ref ON shariah_screening_result (transaction_ref);
CREATE INDEX IF NOT EXISTS idx_screening_result_overall ON shariah_screening_result (overall_result);
CREATE INDEX IF NOT EXISTS idx_screening_result_screened_at ON shariah_screening_result (screened_at);

-- --------------------------------------------------------------------------
-- 5. shariah_compliance_alert
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_compliance_alert (
    id                          BIGSERIAL PRIMARY KEY,
    alert_ref                   VARCHAR(50) UNIQUE NOT NULL,
    screening_result_id         BIGINT REFERENCES shariah_screening_result(id),
    transaction_ref             VARCHAR(100),
    contract_ref                VARCHAR(100),
    customer_id                 BIGINT,
    customer_name               VARCHAR(200),
    alert_type                  VARCHAR(30) NOT NULL CHECK (alert_type IN (
                                    'HARAM_ACTIVITY', 'STRUCTURAL_VIOLATION',
                                    'PRODUCT_NON_COMPLIANCE', 'RATE_VIOLATION',
                                    'GHARAR', 'RIBA_INDICATOR', 'OWNERSHIP_VIOLATION',
                                    'POOL_VIOLATION', 'OTHER')),
    severity                    VARCHAR(10) NOT NULL,
    description                 TEXT NOT NULL,
    description_ar              TEXT,
    rule_code                   VARCHAR(50),
    matched_value               VARCHAR(200),
    expected_value              VARCHAR(200),
    status                      VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (status IN (
                                    'NEW', 'UNDER_REVIEW', 'ESCALATED',
                                    'RESOLVED_COMPLIANT', 'RESOLVED_NON_COMPLIANT',
                                    'RESOLVED_FALSE_POSITIVE', 'CLOSED')),
    assigned_to                 VARCHAR(100),
    assigned_at                 TIMESTAMP,
    resolution                  TEXT,
    resolution_ar               TEXT,
    resolved_by                 VARCHAR(100),
    resolved_at                 TIMESTAMP,
    escalated_to                VARCHAR(100),
    escalated_at                TIMESTAMP,
    generated_snci_record       BOOLEAN DEFAULT false,
    snci_record_id              BIGINT,
    sla_deadline                TIMESTAMP,
    sla_breach                  BOOLEAN DEFAULT false,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_compliance_alert_status ON shariah_compliance_alert (status);
CREATE INDEX IF NOT EXISTS idx_compliance_alert_severity ON shariah_compliance_alert (severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alert_type ON shariah_compliance_alert (alert_type);

-- ============================================================================
-- CAPABILITY 2: SNCI (Suspected Non-Compliant Income)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 6. snci_record
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS snci_record (
    id                              BIGSERIAL PRIMARY KEY,
    snci_ref                        VARCHAR(50) UNIQUE NOT NULL,
    detection_date                  DATE NOT NULL,
    detection_method                VARCHAR(30) NOT NULL CHECK (detection_method IN (
                                        'SCREENING_ALERT', 'SHARIAH_AUDIT', 'SSB_RULING',
                                        'SELF_REPORTED', 'REGULATORY_DIRECTION',
                                        'AUTOMATED_MONITORING')),
    detection_source                VARCHAR(200),
    source_transaction_ref          VARCHAR(100),
    source_contract_ref             VARCHAR(100),
    source_contract_type            VARCHAR(30),
    source_account_code             VARCHAR(20),
    income_type                     VARCHAR(30) CHECK (income_type IN (
                                        'PROFIT', 'FEE', 'PENALTY', 'FX_GAIN',
                                        'INVESTMENT_RETURN', 'OTHER')),
    amount                          DECIMAL(18,4) NOT NULL,
    currency_code                   VARCHAR(3) NOT NULL,
    income_date                     DATE,
    non_compliance_type             VARCHAR(40) NOT NULL CHECK (non_compliance_type IN (
                                        'HARAM_ACTIVITY', 'STRUCTURAL_VIOLATION',
                                        'RIBA_ELEMENT', 'GHARAR', 'OWNERSHIP_VIOLATION',
                                        'PRODUCT_NON_COMPLIANT', 'INVESTMENT_NON_COMPLIANT',
                                        'RETROACTIVE_RULING', 'OTHER')),
    non_compliance_description      TEXT,
    non_compliance_description_ar   TEXT,
    shariah_rule_violated           VARCHAR(200),
    ssb_ruling_ref                  VARCHAR(100),
    quarantine_status               VARCHAR(30) NOT NULL DEFAULT 'DETECTED'
                                        CHECK (quarantine_status IN (
                                            'DETECTED', 'QUARANTINED', 'PENDING_PURIFICATION',
                                            'PURIFICATION_APPROVED', 'PURIFIED',
                                            'DISPUTED', 'WAIVED_BY_SSB')),
    quarantined_at                  TIMESTAMP,
    quarantine_journal_ref          VARCHAR(50),
    quarantine_gl_account           VARCHAR(20),
    purification_batch_id           BIGINT,
    purified_at                     TIMESTAMP,
    purification_journal_ref        VARCHAR(50),
    charity_recipient               VARCHAR(200),
    approved_for_purification_by    VARCHAR(100),
    approved_for_purification_at    TIMESTAMP,
    disputed_by                     VARCHAR(100),
    dispute_reason                  TEXT,
    dispute_resolved_by             VARCHAR(100),
    dispute_resolved_at             TIMESTAMP,
    alert_id                        BIGINT,
    audit_finding_id                BIGINT,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_snci_quarantine_status ON snci_record (quarantine_status);
CREATE INDEX IF NOT EXISTS idx_snci_detection_date ON snci_record (detection_date);
CREATE INDEX IF NOT EXISTS idx_snci_ref ON snci_record (snci_ref);

-- ============================================================================
-- CAPABILITY 3: PURIFICATION
-- ============================================================================

-- --------------------------------------------------------------------------
-- 7. purification_batch
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purification_batch (
    id                          BIGSERIAL PRIMARY KEY,
    batch_ref                   VARCHAR(50) UNIQUE NOT NULL,
    period_from                 DATE,
    period_to                   DATE,
    total_amount                DECIMAL(18,4) NOT NULL DEFAULT 0,
    currency_code               VARCHAR(3) NOT NULL DEFAULT 'SAR',
    item_count                  INT DEFAULT 0,
    status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
                                    'DRAFT', 'PENDING_SSB_APPROVAL', 'SSB_APPROVED',
                                    'PROCESSING', 'DISBURSED', 'CANCELLED')),
    ssb_approval_ref            VARCHAR(100),
    ssb_approved_by             VARCHAR(100),
    ssb_approved_at             TIMESTAMP,
    ssb_comments                TEXT,
    disbursed_at                TIMESTAMP,
    disbursed_by                VARCHAR(100),
    total_disbursed             DECIMAL(18,4),
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

-- --------------------------------------------------------------------------
-- 8. charity_recipient
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charity_recipient (
    id                          BIGSERIAL PRIMARY KEY,
    recipient_code              VARCHAR(50) UNIQUE NOT NULL,
    name                        VARCHAR(200) NOT NULL,
    name_ar                     VARCHAR(200),
    registration_number         VARCHAR(100),
    country                     VARCHAR(3),
    category                    VARCHAR(30) CHECK (category IN (
                                    'EDUCATION', 'HEALTHCARE', 'POVERTY_RELIEF',
                                    'ORPHAN_CARE', 'DISASTER_RELIEF', 'MOSQUE',
                                    'WATER_SANITATION', 'GENERAL_WELFARE', 'OTHER')),
    bank_account_number         VARCHAR(50),
    bank_name                   VARCHAR(200),
    bank_swift_code             VARCHAR(20),
    contact_person              VARCHAR(200),
    contact_email               VARCHAR(200),
    contact_phone               VARCHAR(30),
    ssb_approved                BOOLEAN DEFAULT false,
    ssb_approval_date           DATE,
    ssb_approval_ref            VARCHAR(100),
    max_annual_disbursement     DECIMAL(18,4),
    total_disbursed_ytd         DECIMAL(18,4) DEFAULT 0,
    total_disbursed_lifetime    DECIMAL(18,4) DEFAULT 0,
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

-- --------------------------------------------------------------------------
-- 9. purification_disbursement
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purification_disbursement (
    id                          BIGSERIAL PRIMARY KEY,
    batch_id                    BIGINT NOT NULL REFERENCES purification_batch(id),
    recipient_id                BIGINT NOT NULL REFERENCES charity_recipient(id),
    amount                      DECIMAL(18,4) NOT NULL,
    currency_code               VARCHAR(3) NOT NULL,
    purpose                     TEXT,
    snci_record_ids             JSONB,
    payment_ref                 VARCHAR(100),
    payment_date                DATE,
    payment_status              VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN (
                                    'PENDING', 'SENT', 'CONFIRMED', 'FAILED')),
    journal_ref                 VARCHAR(50),
    receipt_ref                 VARCHAR(100),
    receipt_date                DATE,
    notes                       TEXT,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

-- ============================================================================
-- CAPABILITY 4: AUDIT
-- ============================================================================

-- --------------------------------------------------------------------------
-- 10. shariah_audit
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_audit (
    id                          BIGSERIAL PRIMARY KEY,
    audit_ref                   VARCHAR(50) UNIQUE NOT NULL,
    audit_type                  VARCHAR(20) NOT NULL CHECK (audit_type IN (
                                    'ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY',
                                    'SPECIAL', 'THEMATIC')),
    audit_scope                 TEXT,
    audit_scope_ar              TEXT,
    period_from                 DATE NOT NULL,
    period_to                   DATE NOT NULL,
    audit_plan_date             DATE,
    audit_start_date            DATE,
    audit_end_date              DATE,
    report_date                 DATE,
    lead_auditor                VARCHAR(100),
    audit_team_members          JSONB,
    ssb_liaison                 VARCHAR(100),
    total_transactions_in_scope INT DEFAULT 0,
    sample_size                 INT DEFAULT 0,
    sampling_methodology        VARCHAR(20) CHECK (sampling_methodology IN (
                                    'RANDOM', 'STRATIFIED', 'JUDGMENTAL', 'CENSUS')),
    sampling_confidence_level   DECIMAL(8,4),
    sampling_error_margin       DECIMAL(8,4),
    total_findings_count        INT DEFAULT 0,
    critical_findings           INT DEFAULT 0,
    high_findings               INT DEFAULT 0,
    medium_findings             INT DEFAULT 0,
    low_findings                INT DEFAULT 0,
    compliance_score            DECIMAL(8,4),
    overall_opinion             VARCHAR(30) CHECK (overall_opinion IN (
                                    'FULLY_COMPLIANT', 'SUBSTANTIALLY_COMPLIANT',
                                    'PARTIALLY_COMPLIANT', 'NON_COMPLIANT',
                                    'UNABLE_TO_DETERMINE')),
    opinion_narrative           TEXT,
    opinion_narrative_ar        TEXT,
    status                      VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN (
                                    'PLANNED', 'IN_PROGRESS', 'FIELDWORK_COMPLETE',
                                    'DRAFT_REPORT', 'SSB_REVIEW', 'FINAL_REPORT', 'CLOSED')),
    notes                       TEXT,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

-- --------------------------------------------------------------------------
-- 11. shariah_audit_sample
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_audit_sample (
    id                          BIGSERIAL PRIMARY KEY,
    audit_id                    BIGINT NOT NULL REFERENCES shariah_audit(id),
    sample_number               INT NOT NULL,
    entity_type                 VARCHAR(30) NOT NULL CHECK (entity_type IN (
                                    'MURABAHA_CONTRACT', 'IJARAH_CONTRACT',
                                    'MUDARABAH_DEPOSIT', 'INVESTMENT_POOL',
                                    'PROFIT_DISTRIBUTION', 'FEE_CHARGE', 'PAYMENT',
                                    'PRODUCT_TEMPLATE', 'OTHER')),
    entity_ref                  VARCHAR(100),
    entity_id                   BIGINT,
    transaction_date            DATE,
    amount                      DECIMAL(18,4),
    currency_code               VARCHAR(3),
    review_status               VARCHAR(20) DEFAULT 'PENDING' CHECK (review_status IN (
                                    'PENDING', 'IN_REVIEW', 'REVIEWED', 'SKIPPED')),
    reviewed_by                 VARCHAR(100),
    reviewed_at                 TIMESTAMP,
    compliance_result           VARCHAR(20) CHECK (compliance_result IN (
                                    'COMPLIANT', 'NON_COMPLIANT', 'OBSERVATION',
                                    'NOT_APPLICABLE')),
    evidence_collected          JSONB,
    checklist_results           JSONB,
    notes                       TEXT,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_audit_sample_audit_id ON shariah_audit_sample (audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_sample_review_status ON shariah_audit_sample (review_status);

-- --------------------------------------------------------------------------
-- 12. shariah_audit_finding
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shariah_audit_finding (
    id                          BIGSERIAL PRIMARY KEY,
    audit_id                    BIGINT NOT NULL REFERENCES shariah_audit(id),
    finding_ref                 VARCHAR(50) UNIQUE NOT NULL,
    sample_id                   BIGINT REFERENCES shariah_audit_sample(id),
    title                       VARCHAR(500) NOT NULL,
    title_ar                    VARCHAR(500),
    description                 TEXT NOT NULL,
    description_ar              TEXT,
    category                    VARCHAR(30) NOT NULL CHECK (category IN (
                                    'STRUCTURAL', 'OPERATIONAL', 'PRODUCT', 'PRICING',
                                    'DISCLOSURE', 'DOCUMENTATION', 'SEGREGATION',
                                    'PURIFICATION', 'GOVERNANCE', 'OTHER')),
    severity                    VARCHAR(20) NOT NULL CHECK (severity IN (
                                    'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'OBSERVATION')),
    shariah_rule_violated       VARCHAR(200),
    impact                      TEXT,
    impact_ar                   TEXT,
    recommendation              TEXT,
    recommendation_ar           TEXT,
    has_snci_implication         BOOLEAN DEFAULT false,
    snci_amount                 DECIMAL(18,4),
    snci_record_id              BIGINT,
    remediation_status          VARCHAR(20) DEFAULT 'OPEN' CHECK (remediation_status IN (
                                    'OPEN', 'IN_PROGRESS', 'REMEDIATED',
                                    'ACCEPTED_RISK', 'CLOSED')),
    remediation_owner           VARCHAR(200),
    remediation_due_date        DATE,
    remediation_completed_date  DATE,
    remediation_notes           TEXT,
    remediation_verified_by     VARCHAR(100),
    remediation_verified_at     TIMESTAMP,
    management_response         TEXT,
    management_responded_by     VARCHAR(100),
    management_responded_at     TIMESTAMP,
    ssb_accepted                BOOLEAN DEFAULT false,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_audit_finding_audit_id ON shariah_audit_finding (audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_finding_severity ON shariah_audit_finding (severity);
CREATE INDEX IF NOT EXISTS idx_audit_finding_remediation ON shariah_audit_finding (remediation_status);

-- ============================================================================
-- SEED DATA: GL Accounts
-- ============================================================================

INSERT INTO cbs.chart_of_accounts (gl_code, gl_name, gl_category, normal_balance, is_postable, is_active, is_islamic_account, islamic_account_category, created_at, updated_at)
VALUES
    ('2350-000-001', 'SNCI Quarantine Account', 'LIABILITY', 'CREDIT', true, true, true, 'CHARITY_FUND', NOW(), NOW()),
    ('6650-000-001', 'SNCI Purification Expense', 'EXPENSE', 'DEBIT', true, true, true, 'CHARITY_FUND', NOW(), NOW())
ON CONFLICT (gl_code) DO NOTHING;

-- ============================================================================
-- SEED DATA: HARAM MCC Exclusion List
-- ============================================================================

INSERT INTO cbs.shariah_exclusion_list (list_code, name, description, list_type, status, created_at, updated_at, created_by)
VALUES ('HARAM_MCC', 'Haram Merchant Category Codes', 'MCC codes for prohibited business categories', 'MCC_CODE', 'ACTIVE', NOW(), NOW(), 'SYSTEM')
ON CONFLICT (list_code) DO NOTHING;

INSERT INTO cbs.shariah_exclusion_list_entry (list_id, entry_value, entry_description, reason, added_by, status, created_at, updated_at, created_by)
SELECT id, v.entry_value, v.entry_description, v.reason, 'SYSTEM', 'ACTIVE', NOW(), NOW(), 'SYSTEM'
FROM cbs.shariah_exclusion_list, (VALUES
    ('5813', 'Drinking Places (Alcoholic Beverages)', 'Alcohol sale and consumption is strictly prohibited (haram)'),
    ('5921', 'Package Stores - Beer, Wine, Liquor', 'Sale of alcoholic beverages is prohibited'),
    ('5993', 'Cigar Stores and Stands', 'Tobacco products are considered harmful and prohibited by many scholars'),
    ('7995', 'Gambling Transactions', 'Gambling (maysir) is strictly prohibited in Islam'),
    ('7800', 'Government-Owned Lotteries', 'Lotteries are a form of gambling (maysir)'),
    ('7801', 'Internet Gambling', 'Online gambling is a form of maysir'),
    ('7802', 'Government-Licensed Horse/Dog Racing', 'Betting on races is a form of gambling'),
    ('6010', 'Financial Institutions - Manual Cash Disbursements', 'Potential riba-based lending transactions'),
    ('6011', 'Financial Institutions - Automated Cash Disbursements', 'Potential riba-based lending transactions'),
    ('6012', 'Financial Institutions - Merchandise and Services', 'Potential riba-based financial services')
) AS v(entry_value, entry_description, reason)
WHERE list_code = 'HARAM_MCC'
AND NOT EXISTS (
    SELECT 1 FROM cbs.shariah_exclusion_list_entry e
    WHERE e.list_id = shariah_exclusion_list.id AND e.entry_value = v.entry_value
);

-- ============================================================================
-- SEED DATA: Screening Rules
-- ============================================================================

INSERT INTO cbs.shariah_screening_rule (
    rule_code, name, description, category, screening_point, action, severity,
    rule_type, reference_list_code, shariah_reference, effective_from, enabled,
    priority, condition_expression, threshold_field, threshold_operator,
    threshold_value, business_rule_code, created_at, updated_at, created_by
) VALUES
-- SSR-MCC-001: Haram Merchant Category Code screening
(
    'SSR-MCC-001',
    'Haram Merchant Category Code Screening',
    'Screens transactions against the list of prohibited merchant category codes including alcohol, gambling, tobacco, and conventional interest-based financial services',
    'MERCHANT_CATEGORY', 'PRE_EXECUTION', 'BLOCK', 'CRITICAL',
    'MCC_LIST', 'HARAM_MCC',
    'Quran 2:275 (prohibition of riba), Quran 5:90 (prohibition of intoxicants and gambling)',
    '2024-01-01', true, 10,
    NULL, NULL, NULL, NULL, NULL,
    NOW(), NOW(), 'SYSTEM'
),
-- SSR-STRUCT-001: Murabaha structural compliance
(
    'SSR-STRUCT-001',
    'Murabaha Structural Compliance Check',
    'Validates that Murabaha contracts have proper asset ownership transfer documentation and sequence of events (bank purchases asset before selling to customer)',
    'STRUCTURAL', 'PRE_EXECUTION', 'BLOCK', 'CRITICAL',
    'CONDITION_EXPRESSION', NULL,
    'AAOIFI FAS 2 - Murabaha standard requiring genuine purchase and ownership',
    '2024-01-01', true, 20,
    'contract.type == ''MURABAHA'' AND (contract.asset_ownership_doc IS NULL OR contract.purchase_order_date > contract.sale_date)',
    NULL, NULL, NULL, NULL,
    NOW(), NOW(), 'SYSTEM'
),
-- SSR-STRUCT-002: Ijarah structural compliance
(
    'SSR-STRUCT-002',
    'Ijarah Asset Ownership Verification',
    'Ensures the lessor (bank) retains ownership of the leased asset throughout the Ijarah contract period and bears major maintenance responsibility',
    'STRUCTURAL', 'BOTH', 'ALERT', 'HIGH',
    'CONDITION_EXPRESSION', NULL,
    'AAOIFI FAS 8 - Ijarah standard requiring lessor ownership and maintenance obligation',
    '2024-01-01', true, 25,
    'contract.type == ''IJARAH'' AND (contract.lessor_ownership_verified == false OR contract.major_maintenance_by != ''LESSOR'')',
    NULL, NULL, NULL, NULL,
    NOW(), NOW(), 'SYSTEM'
),
-- SSR-RATE-001: Profit rate threshold check
(
    'SSR-RATE-001',
    'Excessive Profit Rate Detection',
    'Detects contracts where the effective profit rate exceeds the approved maximum, which may indicate gharar (excessive uncertainty) or exploitation',
    'PRICING', 'PRE_EXECUTION', 'ALERT', 'HIGH',
    'THRESHOLD', NULL,
    'AAOIFI Shariah Standard No. 8 - Murabaha, fair pricing principles',
    '2024-01-01', true, 30,
    NULL, 'contract.effective_profit_rate', 'GT', 25.0000, NULL,
    NOW(), NOW(), 'SYSTEM'
),
-- SSR-RIBA-001: Interest component detection
(
    'SSR-RIBA-001',
    'Interest (Riba) Component Detection',
    'Screens for any explicit interest component in Islamic finance transactions, including late payment interest charges that are not structured as charity donations',
    'RIBA', 'PRE_EXECUTION', 'BLOCK', 'CRITICAL',
    'CONDITION_EXPRESSION', NULL,
    'Quran 2:275-279 - Absolute prohibition of riba in all forms',
    '2024-01-01', true, 5,
    'transaction.has_interest_component == true OR (transaction.late_payment_charge IS NOT NULL AND transaction.late_payment_charity == false)',
    NULL, NULL, NULL, NULL,
    NOW(), NOW(), 'SYSTEM'
),
-- SSR-RIBA-002: Conventional benchmark dependency
(
    'SSR-RIBA-002',
    'Conventional Benchmark Dependency Check',
    'Identifies contracts that are solely dependent on conventional interest rate benchmarks (e.g. LIBOR/SOFR) without an independent Islamic pricing mechanism',
    'RIBA', 'POST_EXECUTION', 'WARN', 'MEDIUM',
    'CONDITION_EXPRESSION', NULL,
    'AAOIFI Shariah Standards - permissibility of benchmarking with independent pricing',
    '2024-01-01', true, 40,
    'contract.pricing_benchmark IN (''LIBOR'', ''SOFR'', ''EURIBOR'') AND contract.independent_pricing_mechanism == false',
    NULL, NULL, NULL, NULL,
    NOW(), NOW(), 'SYSTEM'
),
-- SSR-PROD-001: Product Shariah approval check
(
    'SSR-PROD-001',
    'Product Shariah Board Approval Verification',
    'Ensures that all products used in transactions have a valid and current Shariah Supervisory Board (SSB) approval before any customer-facing execution',
    'PRODUCT_COMPLIANCE', 'PRE_EXECUTION', 'BLOCK', 'CRITICAL',
    'CONDITION_EXPRESSION', NULL,
    'AAOIFI Governance Standard No. 1 - SSB role in product approval',
    '2024-01-01', true, 15,
    'product.ssb_approved == false OR product.ssb_approval_expiry < CURRENT_DATE',
    NULL, NULL, NULL, NULL,
    NOW(), NOW(), 'SYSTEM'
),
-- SSR-POOL-001: Investment pool segregation
(
    'SSR-POOL-001',
    'Investment Pool Segregation Check',
    'Validates that Islamic investment pool funds are properly segregated from conventional funds and that commingling has not occurred',
    'POOL_SEGREGATION', 'BOTH', 'ALERT', 'HIGH',
    'CONDITION_EXPRESSION', NULL,
    'AAOIFI FAS 6 - Equity of Investment Account Holders, fund segregation requirements',
    '2024-01-01', true, 20,
    'pool.type == ''ISLAMIC'' AND (pool.segregation_verified == false OR pool.commingling_detected == true)',
    NULL, NULL, NULL, NULL,
    NOW(), NOW(), 'SYSTEM'
)
ON CONFLICT (rule_code) DO NOTHING;
