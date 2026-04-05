CREATE TABLE IF NOT EXISTS cbs.regulatory_return_templates (
    id BIGSERIAL PRIMARY KEY,
    template_code VARCHAR(80) NOT NULL UNIQUE,
    jurisdiction VARCHAR(20) NOT NULL,
    return_type VARCHAR(40) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    version_number INTEGER NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    sections JSONB,
    validation_rules JSONB,
    cross_validations JSONB,
    output_format VARCHAR(20) NOT NULL,
    xbrl_taxonomy VARCHAR(150),
    reporting_frequency VARCHAR(20) NOT NULL,
    filing_deadline_days_after_period INTEGER NOT NULL,
    regulator_form_number VARCHAR(80),
    regulator_portal_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by VARCHAR(100),
    tenant_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT
);

CREATE TABLE IF NOT EXISTS cbs.regulatory_returns (
    id BIGSERIAL PRIMARY KEY,
    return_ref VARCHAR(100) NOT NULL UNIQUE,
    template_id BIGINT NOT NULL REFERENCES cbs.regulatory_return_templates(id),
    template_code VARCHAR(80) NOT NULL,
    jurisdiction VARCHAR(20) NOT NULL,
    return_type VARCHAR(40) NOT NULL,
    reporting_period_type VARCHAR(20) NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    reporting_date DATE NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    data_extraction_status VARCHAR(20) NOT NULL,
    data_extracted_at TIMESTAMP,
    data_extracted_by VARCHAR(100),
    extraction_errors JSONB,
    return_data JSONB,
    return_data_version INTEGER NOT NULL DEFAULT 1,
    validation_status VARCHAR(20) NOT NULL,
    validation_errors JSONB,
    validation_warnings JSONB,
    cross_validation_status VARCHAR(20),
    status VARCHAR(30) NOT NULL,
    generated_by VARCHAR(100),
    generated_at TIMESTAMP,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    submitted_by VARCHAR(100),
    submitted_at TIMESTAMP,
    submission_method VARCHAR(20),
    regulator_reference_number VARCHAR(120),
    regulator_acknowledged_at TIMESTAMP,
    regulator_feedback TEXT,
    filing_deadline DATE NOT NULL,
    deadline_breach BOOLEAN NOT NULL DEFAULT FALSE,
    is_amendment BOOLEAN NOT NULL DEFAULT FALSE,
    original_return_id BIGINT REFERENCES cbs.regulatory_returns(id),
    amendment_reason TEXT,
    previous_period_return_id BIGINT REFERENCES cbs.regulatory_returns(id),
    variance_from_previous JSONB,
    tenant_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT
);

CREATE TABLE IF NOT EXISTS cbs.regulatory_return_line_items (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES cbs.regulatory_returns(id) ON DELETE CASCADE,
    line_number VARCHAR(40) NOT NULL,
    section_code VARCHAR(40),
    line_description VARCHAR(255) NOT NULL,
    line_description_ar VARCHAR(255),
    data_type VARCHAR(20) NOT NULL,
    line_value TEXT,
    previous_period_value TEXT,
    variance TEXT,
    variance_percentage NUMERIC(18,6),
    source_type VARCHAR(20),
    source_gl_account_code VARCHAR(120),
    source_query TEXT,
    calculation_formula TEXT,
    manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    manual_override_by VARCHAR(100),
    manual_override_reason TEXT,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validation_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT,
    CONSTRAINT uq_regulatory_return_line UNIQUE (return_id, line_number)
);

CREATE TABLE IF NOT EXISTS cbs.return_audit_events (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES cbs.regulatory_returns(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    event_timestamp TIMESTAMP NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT
);

CREATE INDEX IF NOT EXISTS idx_regulatory_return_templates_jurisdiction_active
    ON cbs.regulatory_return_templates (jurisdiction, is_active);
CREATE INDEX IF NOT EXISTS idx_regulatory_return_templates_jurisdiction_type_active
    ON cbs.regulatory_return_templates (jurisdiction, return_type, is_active);

CREATE INDEX IF NOT EXISTS idx_regulatory_returns_template_period
    ON cbs.regulatory_returns (template_id, period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_regulatory_returns_jurisdiction_status
    ON cbs.regulatory_returns (jurisdiction, status);
CREATE INDEX IF NOT EXISTS idx_regulatory_returns_status_deadline
    ON cbs.regulatory_returns (status, filing_deadline);
CREATE INDEX IF NOT EXISTS idx_regulatory_returns_jurisdiction_type_period
    ON cbs.regulatory_returns (jurisdiction, return_type, period_from);

CREATE INDEX IF NOT EXISTS idx_regulatory_return_line_items_return_line
    ON cbs.regulatory_return_line_items (return_id, line_number);
CREATE INDEX IF NOT EXISTS idx_regulatory_return_line_items_section
    ON cbs.regulatory_return_line_items (return_id, section_code);
CREATE INDEX IF NOT EXISTS idx_regulatory_return_line_items_manual_override
    ON cbs.regulatory_return_line_items (manual_override);

CREATE INDEX IF NOT EXISTS idx_return_audit_events_return_time
    ON cbs.return_audit_events (return_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_return_audit_events_return_type
    ON cbs.return_audit_events (return_id, event_type);

INSERT INTO cbs.regulatory_return_templates (
    template_code, jurisdiction, return_type, name, name_ar, description, version_number, effective_from,
    sections, validation_rules, cross_validations, output_format, reporting_frequency,
    filing_deadline_days_after_period, regulator_form_number, regulator_portal_url,
    is_active, approved_by, tenant_id
)
VALUES
(
    'SAMA-BS-ISL-V1', 'SA_SAMA', 'BALANCE_SHEET',
    'SAMA Islamic Balance Sheet', 'الميزانية العمومية الإسلامية - ساما',
    'AAOIFI-structured balance sheet for Islamic prudential filing.',
    1, DATE '2026-01-01',
    $$[
      {"sectionCode":"ASSETS","sectionName":"Assets","displayOrder":1,"lineItems":[
        {"lineNumber":"L001","description":"Cash and Balances with SAMA","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1100-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L002","description":"Due from Banks and Financial Institutions","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1101-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L003","description":"Murabaha Financing - Gross","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1200-MRB-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L004","description":"Less: Deferred Profit - Murabaha","dataType":"AMOUNT","displayOrder":4,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1200-MRB-002"],"balanceType":"CLOSING"}},
        {"lineNumber":"L005","description":"Less: Impairment Provision - Murabaha","dataType":"AMOUNT","displayOrder":5,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1700-MRB-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L006","description":"Murabaha Financing - Net","dataType":"AMOUNT","displayOrder":6,"extractionRule":{"type":"CALCULATED","formula":"L003 - L004 - L005"}},
        {"lineNumber":"L007","description":"Ijarah Assets - Gross","dataType":"AMOUNT","displayOrder":7,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1400-IJR-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L008","description":"Less: Accumulated Depreciation","dataType":"AMOUNT","displayOrder":8,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1400-IJR-002"],"balanceType":"CLOSING"}},
        {"lineNumber":"L009","description":"Less: Impairment Provision - Ijarah","dataType":"AMOUNT","displayOrder":9,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1700-IJR-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L010","description":"Ijarah Assets - Net","dataType":"AMOUNT","displayOrder":10,"extractionRule":{"type":"CALCULATED","formula":"L007 - L008 - L009"}},
        {"lineNumber":"L011","description":"Musharakah Investments","dataType":"AMOUNT","displayOrder":11,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1500-MSH-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L012","description":"Less: Impairment Provision - Musharakah","dataType":"AMOUNT","displayOrder":12,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1700-MSH-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L013","description":"Musharakah Investments - Net","dataType":"AMOUNT","displayOrder":13,"extractionRule":{"type":"CALCULATED","formula":"L011 - L012"}},
        {"lineNumber":"L014","description":"Investments in Sukuk","dataType":"AMOUNT","displayOrder":14,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1300-SKK-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L015","description":"Other Assets","dataType":"AMOUNT","displayOrder":15,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1600-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L016","description":"TOTAL ASSETS","dataType":"AMOUNT","displayOrder":16,"extractionRule":{"type":"CALCULATED","formula":"SUM(L001:L015)"}}
      ]},
      {"sectionCode":"LIABILITIES","sectionName":"Liabilities","displayOrder":2,"lineItems":[
        {"lineNumber":"L017","description":"Current Accounts - Wadiah","dataType":"AMOUNT","displayOrder":17,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2100-WAD-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L018","description":"Current Accounts - Qard Hasan","dataType":"AMOUNT","displayOrder":18,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2100-QRD-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L019","description":"Zakat Payable","dataType":"AMOUNT","displayOrder":19,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2200-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L020","description":"Charity Fund","dataType":"AMOUNT","displayOrder":20,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2300-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L021","description":"Other Liabilities","dataType":"AMOUNT","displayOrder":21,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2400-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L022","description":"TOTAL LIABILITIES","dataType":"AMOUNT","displayOrder":22,"extractionRule":{"type":"CALCULATED","formula":"SUM(L017:L021)"}}
      ]},
      {"sectionCode":"UIA","sectionName":"Unrestricted Investment Accounts","displayOrder":3,"lineItems":[
        {"lineNumber":"L023","description":"Mudarabah Investment Accounts - Gross","dataType":"AMOUNT","displayOrder":23,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["3100-MDR-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L024","description":"Less: Profit Equalisation Reserve (PER)","dataType":"AMOUNT","displayOrder":24,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["3200-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L025","description":"Less: Investment Risk Reserve (IRR)","dataType":"AMOUNT","displayOrder":25,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["3300-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L026","description":"Unrestricted Investment Accounts - Net","dataType":"AMOUNT","displayOrder":26,"extractionRule":{"type":"CALCULATED","formula":"L023 - L024 - L025"}}
      ]},
      {"sectionCode":"RIA","sectionName":"Restricted Investment Accounts","displayOrder":4,"lineItems":[
        {"lineNumber":"L027","description":"Restricted Investment Pools - Assets","dataType":"AMOUNT","displayOrder":27,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["3500-MDR-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L028","description":"Restricted Investment Pools - Obligations","dataType":"AMOUNT","displayOrder":28,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["3500-MDR-002"],"balanceType":"CLOSING"}}
      ]},
      {"sectionCode":"EQUITY","sectionName":"Owners Equity","displayOrder":5,"lineItems":[
        {"lineNumber":"L029","description":"Paid-up Capital","dataType":"AMOUNT","displayOrder":29,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["4100-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L030","description":"Reserves","dataType":"AMOUNT","displayOrder":30,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["4200-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L031","description":"Retained Earnings","dataType":"AMOUNT","displayOrder":31,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["4300-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"L032","description":"TOTAL OWNERS EQUITY","dataType":"AMOUNT","displayOrder":32,"extractionRule":{"type":"CALCULATED","formula":"SUM(L029:L031)"}},
        {"lineNumber":"L033","description":"TOTAL LIABILITIES + UIA + EQUITY","dataType":"AMOUNT","displayOrder":33,"extractionRule":{"type":"CALCULATED","formula":"L022 + L026 + L032"}}
      ]}
    ]$$::jsonb,
    $$[
      {"ruleCode":"BS_BALANCE","description":"Balance sheet must balance","expression":"L016 == L033","severity":"ERROR","message":"Balance sheet does not balance"},
      {"ruleCode":"MURABAHA_NET","description":"Murabaha net must be non-negative","expression":"L006 >= 0","severity":"WARNING","message":"Murabaha net is negative"}
    ]$$::jsonb,
    $$[
      {"thisLine":"L003","otherTemplate":"SAMA-FP-ISL-V1","otherLine":"FP_MRB_TOTAL","operator":"EQUALS","message":"Murabaha on balance sheet must match financing portfolio"}
    ]$$::jsonb,
    'EXCEL', 'MONTHLY', 15, 'SAMA-BS-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-FP-ISL-V1', 'SA_SAMA', 'FINANCING_PORTFOLIO',
    'SAMA Islamic Financing Portfolio', 'محفظة التمويل الإسلامية - ساما',
    'Islamic financing portfolio by contract type and stage.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"PORTFOLIO","sectionName":"Portfolio","displayOrder":1,"lineItems":[
        {"lineNumber":"FP_MRB_TOTAL","description":"Murabaha Outstanding","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"ENTITY_QUERY","entityType":"MURABAHA_CONTRACT","field":"OUTSTANDING","filter":"status=ACTIVE"}},
        {"lineNumber":"FP_IJR_TOTAL","description":"Ijarah Outstanding","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"ENTITY_QUERY","entityType":"IJARAH_CONTRACT","field":"OUTSTANDING","filter":"status=ACTIVE"}},
        {"lineNumber":"FP_MSH_TOTAL","description":"Musharakah Outstanding","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"ENTITY_QUERY","entityType":"MUSHARAKAH_CONTRACT","field":"OUTSTANDING","filter":"status=ACTIVE"}},
        {"lineNumber":"FP_TOTAL","description":"Total Financing","dataType":"AMOUNT","displayOrder":4,"extractionRule":{"type":"CALCULATED","formula":"FP_MRB_TOTAL + FP_IJR_TOTAL + FP_MSH_TOTAL"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb,
    $$[]$$::jsonb,
    'EXCEL', 'MONTHLY', 15, 'SAMA-FP-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-CAR-ISL-V1', 'SA_SAMA', 'CAPITAL_ADEQUACY',
    'SAMA Capital Adequacy', 'كفاية رأس المال - ساما',
    'IFSB-based capital adequacy return.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"CAR","sectionName":"Capital Adequacy","displayOrder":1,"lineItems":[
        {"lineNumber":"CAR_T1","description":"Tier 1 Capital","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"CONSTANT","value":"0"}},
        {"lineNumber":"CAR_T2","description":"Tier 2 Capital","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"CONSTANT","value":"0"}},
        {"lineNumber":"CAR_RATIO","description":"Capital Adequacy Ratio","dataType":"PERCENTAGE","displayOrder":3,"extractionRule":{"type":"CONSTANT","value":"0"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 20, 'SAMA-CAR-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-AQ-ISL-V1', 'SA_SAMA', 'ASSET_QUALITY',
    'SAMA Asset Quality', 'جودة الأصول - ساما',
    'Islamic asset quality and provisioning return.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"AQ","sectionName":"Asset Quality","displayOrder":1,"lineItems":[
        {"lineNumber":"AQ_STAGE1","description":"Stage 1 Exposure","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"ECL_DATA","contractType":"MURABAHA","metric":"STAGE_ECL","stage":"STAGE_1"}},
        {"lineNumber":"AQ_STAGE2","description":"Stage 2 Exposure","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"ECL_DATA","contractType":"MURABAHA","metric":"STAGE_ECL","stage":"STAGE_2"}},
        {"lineNumber":"AQ_STAGE3","description":"Stage 3 Exposure","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"ECL_DATA","contractType":"MURABAHA","metric":"STAGE_ECL","stage":"STAGE_3"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 20, 'SAMA-AQ-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-IA-ISL-V1', 'SA_SAMA', 'INVESTMENT_ACCOUNTS',
    'SAMA Investment Accounts', 'حسابات الاستثمار - ساما',
    'Unrestricted and restricted investment account positions.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"IAH","sectionName":"Investment Accounts","displayOrder":1,"lineItems":[
        {"lineNumber":"IA_UIA","description":"Unrestricted Investment Accounts","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"POOL_DATA","poolType":"UNRESTRICTED","metric":"TOTAL_BALANCE"}},
        {"lineNumber":"IA_RIA","description":"Restricted Investment Accounts","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"POOL_DATA","poolType":"RESTRICTED","metric":"TOTAL_BALANCE"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'MONTHLY', 15, 'SAMA-IA-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-PD-ISL-V1', 'SA_SAMA', 'PROFIT_DISTRIBUTION',
    'SAMA Profit Distribution', 'توزيع الأرباح - ساما',
    'Pool performance and profit distribution return.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"PD","sectionName":"Profit Distribution","displayOrder":1,"lineItems":[
        {"lineNumber":"PD_UIA_BAL","description":"Unrestricted Pool Balance","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"POOL_DATA","poolType":"UNRESTRICTED","metric":"TOTAL_BALANCE"}},
        {"lineNumber":"PD_PER","description":"PER Balance","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["3200-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"PD_IRR","description":"IRR Balance","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["3300-000-001"],"balanceType":"CLOSING"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 20, 'SAMA-PD-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-LIQ-ISL-V1', 'SA_SAMA', 'LIQUIDITY',
    'SAMA Liquidity', 'السيولة - ساما',
    'Islamic liquidity metrics and HQLA position.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"LIQ","sectionName":"Liquidity","displayOrder":1,"lineItems":[
        {"lineNumber":"LIQ_CASH","description":"Cash and Central Bank Balances","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1100-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"LIQ_SUKUK","description":"Eligible Sukuk","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1300-SKK-001"],"balanceType":"CLOSING"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'MONTHLY', 15, 'SAMA-LIQ-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-SC-ISL-V1', 'SA_SAMA', 'SHARIAH_COMPLIANCE',
    'SAMA Shariah Compliance', 'الالتزام الشرعي - ساما',
    'SNCI, screening, and Shariah audit metrics.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"SC","sectionName":"Shariah Compliance","displayOrder":1,"lineItems":[
        {"lineNumber":"SC_SNCI","description":"SNCI Cases","dataType":"COUNT","displayOrder":1,"extractionRule":{"type":"CONSTANT","value":"0"}},
        {"lineNumber":"SC_CHARITY","description":"Charity Fund Balance","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2300-000-001"],"balanceType":"CLOSING"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'ANNUAL', 30, 'SAMA-SC-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-ZAK-ISL-V1', 'SA_SAMA', 'ZAKAT',
    'SAMA Zakat', 'الزكاة - ساما',
    'Zakat payable and calculation memorandum.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"ZAK","sectionName":"Zakat","displayOrder":1,"lineItems":[
        {"lineNumber":"ZAK_PAYABLE","description":"Zakat Payable","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2200-000-001"],"balanceType":"CLOSING"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'ANNUAL', 30, 'SAMA-ZAK-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'SAMA-AML-ISL-V1', 'SA_SAMA', 'AML_STATISTICAL',
    'SAMA AML Statistical Return', 'الإحصائية لمكافحة غسل الأموال - ساما',
    'Islamic AML/CFT statistics return.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"AML","sectionName":"AML","displayOrder":1,"lineItems":[
        {"lineNumber":"AML_SARS","description":"SARs Filed","dataType":"COUNT","displayOrder":1,"extractionRule":{"type":"CONSTANT","value":"0"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 20, 'SAMA-AML-ISL', 'https://eprudential.sama.gov.sa', TRUE, 'SYSTEM', 1
),
(
    'CBUAE-BS-ISL-V1', 'AE_CBUAE', 'BALANCE_SHEET',
    'CBUAE Islamic Balance Sheet', 'الميزانية العمومية الإسلامية - مصرف الإمارات',
    'EPRS balance sheet for Islamic bank reporting.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"FORM1000","sectionName":"Form 1000-ISL","displayOrder":1,"lineItems":[
        {"lineNumber":"A1","description":"Cash and Central Bank Balances","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1100-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"A2","description":"Murabaha Financing by Product","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"ENTITY_QUERY","entityType":"MURABAHA_CONTRACT","field":"OUTSTANDING","filter":"status=ACTIVE"}},
        {"lineNumber":"A3","description":"Ijarah Financing by Product","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"ENTITY_QUERY","entityType":"IJARAH_CONTRACT","field":"OUTSTANDING","filter":"status=ACTIVE"}},
        {"lineNumber":"L1","description":"Wadiah and Current Accounts","dataType":"AMOUNT","displayOrder":4,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["2100-WAD-001","2100-QRD-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"IA1","description":"Investment Accounts","dataType":"AMOUNT","displayOrder":5,"extractionRule":{"type":"POOL_DATA","poolType":"UNRESTRICTED","metric":"TOTAL_BALANCE"}},
        {"lineNumber":"EQ1","description":"Owners Equity","dataType":"AMOUNT","displayOrder":6,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["4100-000-001","4200-000-001","4300-000-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"TOT_AST","description":"Total Assets","dataType":"AMOUNT","displayOrder":7,"extractionRule":{"type":"CALCULATED","formula":"A1 + A2 + A3"}},
        {"lineNumber":"TOT_LIA","description":"Total Liabilities and Equity","dataType":"AMOUNT","displayOrder":8,"extractionRule":{"type":"CALCULATED","formula":"L1 + IA1 + EQ1"}}
      ]}
    ]$$::jsonb,
    $$[
      {"ruleCode":"CBUAE_BS_BALANCE","description":"CBUAE balance sheet must balance","expression":"TOT_AST == TOT_LIA","severity":"ERROR","message":"CBUAE balance sheet does not balance"}
    ]$$::jsonb,
    $$[]$$::jsonb,
    'EXCEL', 'MONTHLY', 10, 'Form 1000-ISL', 'https://eprs.centralbank.ae', TRUE, 'SYSTEM', 1
),
(
    'CBUAE-AQ-ISL-V1', 'AE_CBUAE', 'ASSET_QUALITY',
    'CBUAE Asset Quality', 'جودة الأصول - مصرف الإمارات',
    'CBUAE Islamic asset quality return.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"AQ","sectionName":"Asset Quality","displayOrder":1,"lineItems":[
        {"lineNumber":"AQ_PROV_MIN","description":"CBUAE Minimum Provision Benchmark","dataType":"PERCENTAGE","displayOrder":1,"extractionRule":{"type":"CONSTANT","value":"13.00"}},
        {"lineNumber":"AQ_COVERAGE","description":"Murabaha Provision Coverage","dataType":"PERCENTAGE","displayOrder":2,"extractionRule":{"type":"ECL_DATA","contractType":"MURABAHA","metric":"PROVISION_COVERAGE","stage":"ALL"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 12, 'Form 2000-ISL', 'https://eprs.centralbank.ae', TRUE, 'SYSTEM', 1
),
(
    'CBUAE-CAR-ISL-V1', 'AE_CBUAE', 'CAPITAL_ADEQUACY',
    'CBUAE Capital Adequacy', 'كفاية رأس المال - مصرف الإمارات',
    'CBUAE/IFSB capital adequacy return.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"CAR","sectionName":"Capital Adequacy","displayOrder":1,"lineItems":[
        {"lineNumber":"CAR_MIN","description":"Regulatory Minimum CAR","dataType":"PERCENTAGE","displayOrder":1,"extractionRule":{"type":"CONSTANT","value":"13.00"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 12, 'Form CAR-ISL', 'https://eprs.centralbank.ae', TRUE, 'SYSTEM', 1
),
(
    'CBUAE-LIQ-ISL-V1', 'AE_CBUAE', 'LIQUIDITY',
    'CBUAE Liquidity', 'السيولة - مصرف الإمارات',
    'Liquidity and HQLA return for Islamic banks.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"LIQ","sectionName":"Liquidity","displayOrder":1,"lineItems":[
        {"lineNumber":"HQLA_SUKUK","description":"Eligible Sukuk HQLA","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"GL_BALANCE","glAccountCodes":["1300-SKK-001"],"balanceType":"CLOSING"}},
        {"lineNumber":"IAH_BAL","description":"Unrestricted IAH Balance","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"POOL_DATA","poolType":"UNRESTRICTED","metric":"TOTAL_BALANCE"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'MONTHLY', 10, 'Form 3000-ISL', 'https://eprs.centralbank.ae', TRUE, 'SYSTEM', 1
),
(
    'CBUAE-CON-ISL-V1', 'AE_CBUAE', 'CONCENTRATION',
    'CBUAE Concentration', 'التركيز - مصرف الإمارات',
    'Large exposure and concentration return.', 1, DATE '2026-01-01',
    $$[
      {"sectionCode":"CON","sectionName":"Concentration","displayOrder":1,"lineItems":[
        {"lineNumber":"CON_TOTAL","description":"Total Financing Exposure","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"ENTITY_QUERY","entityType":"MURABAHA_CONTRACT","field":"OUTSTANDING","filter":"status=ACTIVE"}}
      ]}
    ]$$::jsonb,
    $$[]$$::jsonb, $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 12, 'Form CON-ISL', 'https://eprs.centralbank.ae', TRUE, 'SYSTEM', 1
)
ON CONFLICT (template_code) DO NOTHING;
