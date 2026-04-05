ALTER TABLE cbs.regulatory_return_templates
    ADD COLUMN IF NOT EXISTS filing_deadline_business_days BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS filing_calendar_code VARCHAR(40) NOT NULL DEFAULT 'CALENDAR_DAYS',
    ADD COLUMN IF NOT EXISTS schema_definition JSONB,
    ADD COLUMN IF NOT EXISTS submission_config JSONB;

ALTER TABLE cbs.regulatory_returns
    ADD COLUMN IF NOT EXISTS submission_payload TEXT,
    ADD COLUMN IF NOT EXISTS submission_response JSONB,
    ADD COLUMN IF NOT EXISTS submission_attempt_count INTEGER NOT NULL DEFAULT 0;

UPDATE cbs.regulatory_return_templates
SET filing_deadline_business_days = TRUE,
    filing_calendar_code = 'ISLAMIC_GCC',
    schema_definition = jsonb_build_object(
            'schemaVersion', '1.0',
            'namespace', CASE jurisdiction
                WHEN 'SA_SAMA' THEN 'urn:cbs:sama:regulatory:v1'
                WHEN 'AE_CBUAE' THEN 'urn:cbs:cbuae:eprs:v1'
                ELSE 'urn:cbs:regulatory:v1'
            END,
            'rootElement', CASE jurisdiction
                WHEN 'SA_SAMA' THEN 'SamaRegulatoryReturn'
                WHEN 'AE_CBUAE' THEN 'CbuaeEprsReturn'
                ELSE 'RegulatoryReturn'
            END,
            'formNumber', regulator_form_number
    ),
    submission_config = jsonb_build_object(
            'defaultMethod', 'API',
            'timeoutMs', 30000,
            'referenceHeader', 'X-Reference',
            'authHeader', 'Authorization',
            'authPrefix', 'Bearer ',
            'authTokenParameterKey', CASE jurisdiction
                WHEN 'SA_SAMA' THEN 'regulatory.submission.sa_sama.token'
                WHEN 'AE_CBUAE' THEN 'regulatory.submission.ae_cbuae.token'
                ELSE 'regulatory.submission.default.token'
            END,
            'endpoint', CASE jurisdiction
                WHEN 'SA_SAMA' THEN 'https://eprudential.sama.gov.sa/api/returns'
                WHEN 'AE_CBUAE' THEN 'https://eprs.centralbank.ae/api/returns'
                ELSE regulator_portal_url
            END
    )
WHERE jurisdiction IN ('SA_SAMA', 'AE_CBUAE');

UPDATE cbs.regulatory_return_templates
SET output_format = 'XBRL',
    xbrl_taxonomy = 'urn:cbs:sama:car:v1',
    sections = $$[
      {"sectionCode":"CAR","sectionName":"Capital Adequacy","displayOrder":1,"lineItems":[
        {"lineNumber":"CAR_T1","description":"Tier 1 Capital","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"CAPITAL_DATA","metric":"TIER1_CAPITAL"}},
        {"lineNumber":"CAR_T2","description":"Tier 2 Capital","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"CAPITAL_DATA","metric":"TIER2_CAPITAL"}},
        {"lineNumber":"CAR_RWA","description":"Risk-Weighted Assets","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"CAPITAL_DATA","metric":"RISK_WEIGHTED_ASSETS"}},
        {"lineNumber":"CAR_IAH","description":"Investment Account Holders Funds","dataType":"AMOUNT","displayOrder":4,"extractionRule":{"type":"CAPITAL_DATA","metric":"IAH_FUNDS"}},
        {"lineNumber":"CAR_ALPHA","description":"IFSB Alpha Factor","dataType":"PERCENTAGE","displayOrder":5,"extractionRule":{"type":"CAPITAL_DATA","metric":"ALPHA_FACTOR"}},
        {"lineNumber":"CAR_ADJ_RWA","description":"Adjusted Risk-Weighted Assets","dataType":"AMOUNT","displayOrder":6,"extractionRule":{"type":"CAPITAL_DATA","metric":"ADJUSTED_RISK_WEIGHTED_ASSETS"}},
        {"lineNumber":"CAR_RATIO","description":"Capital Adequacy Ratio","dataType":"PERCENTAGE","displayOrder":7,"extractionRule":{"type":"CAPITAL_DATA","metric":"CAPITAL_ADEQUACY_RATIO"}}
      ]}
    ]$$::jsonb,
    validation_rules = $$[
      {"ruleCode":"SAMA_CAR_MIN","description":"CAR must remain above internal floor","expression":"CAR_RATIO >= 8","severity":"ERROR","message":"Capital adequacy ratio below internal floor"},
      {"ruleCode":"SAMA_CAR_RWA","description":"Adjusted RWA cannot exceed gross RWA","expression":"CAR_RWA >= CAR_ADJ_RWA","severity":"WARNING","message":"Adjusted RWA exceeds gross RWA"}
    ]$$::jsonb
WHERE template_code = 'SAMA-CAR-ISL-V1';

UPDATE cbs.regulatory_return_templates
SET sections = $$[
      {"sectionCode":"SC","sectionName":"Shariah Compliance","displayOrder":1,"lineItems":[
        {"lineNumber":"SC_SNCI","description":"SNCI Cases","dataType":"COUNT","displayOrder":1,"extractionRule":{"type":"SHARIAH_DATA","metric":"SNCI_DETECTED"}},
        {"lineNumber":"SC_CHARITY","description":"Charity Fund Balance","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"SHARIAH_DATA","metric":"CHARITY_FUND_BALANCE"}},
        {"lineNumber":"SC_SCREENINGS","description":"Total Screenings","dataType":"COUNT","displayOrder":3,"extractionRule":{"type":"SHARIAH_DATA","metric":"SCREENINGS_TOTAL"}},
        {"lineNumber":"SC_BLOCKED","description":"Blocked Screenings","dataType":"COUNT","displayOrder":4,"extractionRule":{"type":"SHARIAH_DATA","metric":"SCREENINGS_BLOCKED"}},
        {"lineNumber":"SC_ALERTED","description":"Alerted Screenings","dataType":"COUNT","displayOrder":5,"extractionRule":{"type":"SHARIAH_DATA","metric":"SCREENINGS_ALERTED"}},
        {"lineNumber":"SC_AUDIT_OPEN","description":"Open Shariah Audit Findings","dataType":"COUNT","displayOrder":6,"extractionRule":{"type":"SHARIAH_DATA","metric":"OPEN_AUDIT_FINDINGS"}},
        {"lineNumber":"SC_AUDIT_CLOSED","description":"Closed Shariah Audit Findings","dataType":"COUNT","displayOrder":7,"extractionRule":{"type":"SHARIAH_DATA","metric":"CLOSED_AUDIT_FINDINGS"}}
      ]}
    ]$$::jsonb
WHERE template_code = 'SAMA-SC-ISL-V1';

UPDATE cbs.regulatory_return_templates
SET sections = $$[
      {"sectionCode":"AML","sectionName":"AML","displayOrder":1,"lineItems":[
        {"lineNumber":"AML_SARS","description":"SARs Filed","dataType":"COUNT","displayOrder":1,"extractionRule":{"type":"AML_DATA","metric":"TOTAL_SARS_FILED","jurisdiction":"SA_SAFIU"}},
        {"lineNumber":"AML_SANCTIONS","description":"Sanctions Matches","dataType":"COUNT","displayOrder":2,"extractionRule":{"type":"AML_DATA","metric":"SANCTIONS_MATCHES","jurisdiction":"SA_SAFIU"}},
        {"lineNumber":"AML_ALERTS","description":"Islamic AML Alerts","dataType":"COUNT","displayOrder":3,"extractionRule":{"type":"AML_DATA","metric":"ISLAMIC_ALERTS","jurisdiction":"SA_SAFIU"}}
      ]}
    ]$$::jsonb
WHERE template_code = 'SAMA-AML-ISL-V1';

UPDATE cbs.regulatory_return_templates
SET sections = $$[
      {"sectionCode":"AQ","sectionName":"Asset Quality","displayOrder":1,"lineItems":[
        {"lineNumber":"AQ_MIN_SUBSTANDARD","description":"CBUAE Minimum Provision - Substandard","dataType":"PERCENTAGE","displayOrder":1,"extractionRule":{"type":"CONSTANT","value":"25.00"}},
        {"lineNumber":"AQ_MIN_DOUBTFUL","description":"CBUAE Minimum Provision - Doubtful","dataType":"PERCENTAGE","displayOrder":2,"extractionRule":{"type":"CONSTANT","value":"50.00"}},
        {"lineNumber":"AQ_MIN_LOSS","description":"CBUAE Minimum Provision - Loss","dataType":"PERCENTAGE","displayOrder":3,"extractionRule":{"type":"CONSTANT","value":"100.00"}},
        {"lineNumber":"AQ_STAGE1","description":"Murabaha Stage 1 Exposure","dataType":"AMOUNT","displayOrder":4,"extractionRule":{"type":"FINANCING_DATA","contractType":"MURABAHA","metric":"STAGE_TOTAL","dimension":"STAGE_1"}},
        {"lineNumber":"AQ_STAGE2","description":"Murabaha Stage 2 Exposure","dataType":"AMOUNT","displayOrder":5,"extractionRule":{"type":"FINANCING_DATA","contractType":"MURABAHA","metric":"STAGE_TOTAL","dimension":"STAGE_2"}},
        {"lineNumber":"AQ_STAGE3","description":"Murabaha Stage 3 Exposure","dataType":"AMOUNT","displayOrder":6,"extractionRule":{"type":"FINANCING_DATA","contractType":"MURABAHA","metric":"STAGE_TOTAL","dimension":"STAGE_3"}},
        {"lineNumber":"AQ_COVERAGE","description":"Murabaha Provision Coverage","dataType":"PERCENTAGE","displayOrder":7,"extractionRule":{"type":"ECL_DATA","contractType":"MURABAHA","metric":"PROVISION_COVERAGE","stage":"ALL"}}
      ]}
    ]$$::jsonb
WHERE template_code = 'CBUAE-AQ-ISL-V1';

UPDATE cbs.regulatory_return_templates
SET output_format = 'XML',
    sections = $$[
      {"sectionCode":"CAR","sectionName":"Capital Adequacy","displayOrder":1,"lineItems":[
        {"lineNumber":"CAR_MIN","description":"Regulatory Minimum CAR","dataType":"PERCENTAGE","displayOrder":1,"extractionRule":{"type":"CONSTANT","value":"13.00"}},
        {"lineNumber":"CAR_T1","description":"Tier 1 Capital","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"CAPITAL_DATA","metric":"TIER1_CAPITAL"}},
        {"lineNumber":"CAR_T2","description":"Tier 2 Capital","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"CAPITAL_DATA","metric":"TIER2_CAPITAL"}},
        {"lineNumber":"CAR_RATIO","description":"Actual Capital Adequacy Ratio","dataType":"PERCENTAGE","displayOrder":4,"extractionRule":{"type":"CAPITAL_DATA","metric":"CAPITAL_ADEQUACY_RATIO"}}
      ]}
    ]$$::jsonb,
    validation_rules = $$[
      {"ruleCode":"CBUAE_CAR_MIN","description":"CBUAE minimum CAR","expression":"CAR_RATIO >= CAR_MIN","severity":"ERROR","message":"Capital adequacy ratio below CBUAE minimum"}
    ]$$::jsonb
WHERE template_code = 'CBUAE-CAR-ISL-V1';

INSERT INTO cbs.regulatory_return_templates (
    template_code, jurisdiction, return_type, name, name_ar, description, version_number, effective_from,
    sections, validation_rules, cross_validations, output_format, reporting_frequency,
    filing_deadline_days_after_period, filing_deadline_business_days, filing_calendar_code,
    regulator_form_number, regulator_portal_url, schema_definition, submission_config,
    is_active, approved_by, tenant_id
)
VALUES (
    'SAMA-IS-ISL-V1', 'SA_SAMA', 'INCOME_STATEMENT',
    'SAMA Islamic Income Statement', 'قائمة الدخل الإسلامية - ساما',
    'Periodic Islamic income statement aligned to AAOIFI-led prudential reporting.',
    1, DATE '2026-01-01',
    $$[
      {"sectionCode":"INCOME","sectionName":"Income Statement","displayOrder":1,"lineItems":[
        {"lineNumber":"IS_MRB","description":"Murabaha Profit Income","dataType":"AMOUNT","displayOrder":1,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["5100-MRB-001"],"movementType":"NET"}},
        {"lineNumber":"IS_IJR","description":"Ijarah Income","dataType":"AMOUNT","displayOrder":2,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["5100-IJR-001"],"movementType":"NET"}},
        {"lineNumber":"IS_MSH","description":"Musharakah Income","dataType":"AMOUNT","displayOrder":3,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["5100-MSH-001","5100-MSH-002"],"movementType":"NET"}},
        {"lineNumber":"IS_MDR","description":"Mudarabah Income","dataType":"AMOUNT","displayOrder":4,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["5100-MDR-001"],"movementType":"NET"}},
        {"lineNumber":"IS_SUKUK","description":"Sukuk Income","dataType":"AMOUNT","displayOrder":5,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["5200-SKK-001"],"movementType":"NET"}},
        {"lineNumber":"IS_TOTAL_INCOME","description":"Total Operating Income","dataType":"AMOUNT","displayOrder":6,"extractionRule":{"type":"CALCULATED","formula":"IS_MRB + IS_IJR + IS_MSH + IS_MDR + IS_SUKUK"}},
        {"lineNumber":"IS_IAH_SHARE","description":"IAH Share of Profit","dataType":"AMOUNT","displayOrder":7,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["6100-000-001"],"movementType":"NET"}},
        {"lineNumber":"IS_DEPR","description":"Ijarah Depreciation","dataType":"AMOUNT","displayOrder":8,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["6200-IJR-001"],"movementType":"NET"}},
        {"lineNumber":"IS_IMPAIR","description":"Financing Impairment Expense","dataType":"AMOUNT","displayOrder":9,"extractionRule":{"type":"GL_MOVEMENT","glAccountCodes":["6300-000-001"],"movementType":"NET"}},
        {"lineNumber":"IS_TOTAL_EXP","description":"Total Operating Expense","dataType":"AMOUNT","displayOrder":10,"extractionRule":{"type":"CALCULATED","formula":"IS_IAH_SHARE + IS_DEPR + IS_IMPAIR"}},
        {"lineNumber":"IS_NET","description":"Net Profit for Period","dataType":"AMOUNT","displayOrder":11,"extractionRule":{"type":"CALCULATED","formula":"IS_TOTAL_INCOME - IS_TOTAL_EXP"}}
      ]}
    ]$$::jsonb,
    $$[
      {"ruleCode":"SAMA_IS_TOTAL","description":"Net profit must reconcile to income less expenses","expression":"IS_TOTAL_INCOME >= 0","severity":"WARNING","message":"Total income is negative"}
    ]$$::jsonb,
    $$[]$$::jsonb,
    'JSON', 'QUARTERLY', 20, TRUE, 'ISLAMIC_GCC',
    'SAMA-IS-ISL', 'https://eprudential.sama.gov.sa',
    jsonb_build_object(
        'schemaVersion', '1.0',
        'namespace', 'urn:cbs:sama:regulatory:v1',
        'rootElement', 'SamaRegulatoryReturn',
        'formNumber', 'SAMA-IS-ISL'
    ),
    jsonb_build_object(
        'defaultMethod', 'API',
        'timeoutMs', 30000,
        'referenceHeader', 'X-Reference',
        'authHeader', 'Authorization',
        'authPrefix', 'Bearer ',
        'authTokenParameterKey', 'regulatory.submission.sa_sama.token',
        'endpoint', 'https://eprudential.sama.gov.sa/api/returns'
    ),
    TRUE, 'SYSTEM', 1
)
ON CONFLICT (template_code) DO NOTHING;
