-- ============================================================================
-- V129__islamic_debit_card_management.sql
-- Islamic debit card products, MCC restriction profiles, routing, and GL linkage
-- ============================================================================

SET search_path TO cbs;

CREATE TABLE IF NOT EXISTS islamic_card_profile (
    id                      BIGSERIAL PRIMARY KEY,
    profile_code            VARCHAR(40) NOT NULL UNIQUE,
    profile_name            VARCHAR(120) NOT NULL,
    description             TEXT,
    restricted_mccs         JSONB NOT NULL DEFAULT '[]'::jsonb,
    active                  BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id               BIGINT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_card_profile_active
    ON islamic_card_profile(active, profile_code);
CREATE INDEX IF NOT EXISTS idx_islamic_card_profile_mccs
    ON islamic_card_profile USING gin (restricted_mccs);

CREATE TABLE IF NOT EXISTS islamic_card_product (
    id                      BIGSERIAL PRIMARY KEY,
    product_code            VARCHAR(40) NOT NULL UNIQUE,
    product_name            VARCHAR(120) NOT NULL,
    description             TEXT,
    contract_type           VARCHAR(20) NOT NULL CHECK (contract_type IN ('WADIAH','MUDARABAH')),
    card_scheme             VARCHAR(20) NOT NULL CHECK (card_scheme IN ('VISA','MASTERCARD','VERVE','AMEX','UNIONPAY','LOCAL')),
    card_tier               VARCHAR(20) NOT NULL DEFAULT 'CLASSIC' CHECK (card_tier IN ('CLASSIC','GOLD','PLATINUM','INFINITE','BUSINESS')),
    restriction_profile_id  BIGINT REFERENCES islamic_card_profile(id),
    settlement_gl_code      VARCHAR(20) NOT NULL,
    fee_gl_code             VARCHAR(20),
    issuance_fee_code       VARCHAR(30),
    replacement_fee_code    VARCHAR(30),
    allow_atm               BOOLEAN NOT NULL DEFAULT TRUE,
    allow_pos               BOOLEAN NOT NULL DEFAULT TRUE,
    allow_online            BOOLEAN NOT NULL DEFAULT TRUE,
    allow_international     BOOLEAN NOT NULL DEFAULT FALSE,
    allow_contactless       BOOLEAN NOT NULL DEFAULT TRUE,
    require_verified_kyc    BOOLEAN NOT NULL DEFAULT TRUE,
    allow_overdraft         BOOLEAN NOT NULL DEFAULT FALSE,
    active                  BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id               BIGINT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_islamic_card_product_active
    ON islamic_card_product(active, product_code);

CREATE TABLE IF NOT EXISTS islamic_card (
    id                      BIGSERIAL PRIMARY KEY,
    card_id                 BIGINT NOT NULL UNIQUE REFERENCES card(id) ON DELETE CASCADE,
    islamic_card_product_id BIGINT NOT NULL REFERENCES islamic_card_product(id),
    restriction_profile_id  BIGINT REFERENCES islamic_card_profile(id),
    contract_type           VARCHAR(20) NOT NULL CHECK (contract_type IN ('WADIAH','MUDARABAH')),
    wadiah_account_id       BIGINT REFERENCES wadiah_account(id),
    mudarabah_account_id    BIGINT REFERENCES mudarabah_account(id),
    shariah_compliant       BOOLEAN NOT NULL DEFAULT TRUE,
    last_screening_ref      VARCHAR(40),
    issued_fee_journal_ref  VARCHAR(50),
    issued_fee_charge_log_id BIGINT,
    settlement_gl_code      VARCHAR(20) NOT NULL,
    fee_gl_code             VARCHAR(20),
    tenant_id               BIGINT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_islamic_card_contract_linkage CHECK (
        (contract_type = 'WADIAH' AND wadiah_account_id IS NOT NULL AND mudarabah_account_id IS NULL)
        OR (contract_type = 'MUDARABAH' AND mudarabah_account_id IS NOT NULL AND wadiah_account_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_islamic_card_product
    ON islamic_card(islamic_card_product_id);
CREATE INDEX IF NOT EXISTS idx_islamic_card_contract_type
    ON islamic_card(contract_type);

ALTER TABLE card_transaction
    ADD COLUMN IF NOT EXISTS islamic_card_id BIGINT REFERENCES islamic_card(id),
    ADD COLUMN IF NOT EXISTS shariah_screening_ref VARCHAR(40),
    ADD COLUMN IF NOT EXISTS shariah_decision VARCHAR(20),
    ADD COLUMN IF NOT EXISTS shariah_reason VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_card_txn_islamic_card
    ON card_transaction(islamic_card_id);
CREATE INDEX IF NOT EXISTS idx_card_txn_shariah_decision
    ON card_transaction(shariah_decision);

INSERT INTO islamic_card_profile (profile_code, profile_name, description, restricted_mccs, active)
SELECT 'ISLAMIC_STANDARD_MCC',
       'Islamic Standard MCC Block List',
       'Default Shariah-sensitive merchant category restrictions for Islamic debit cards.',
       '["5813","5921","5922","7800","7801","7802","7995"]'::jsonb,
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_card_profile WHERE profile_code = 'ISLAMIC_STANDARD_MCC'
);

INSERT INTO islamic_card_profile (profile_code, profile_name, description, restricted_mccs, active)
SELECT 'ISLAMIC_STRICT_MCC',
       'Islamic Strict MCC Block List',
       'Enhanced Shariah-sensitive MCC restrictions for conservative Islamic card programs.',
       '["5813","5921","5922","7800","7801","7802","7995","5933","6211"]'::jsonb,
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_card_profile WHERE profile_code = 'ISLAMIC_STRICT_MCC'
);

INSERT INTO islamic_fee_configurations (
    fee_code,
    name,
    description,
    shariah_classification,
    shariah_justification,
    shariah_reference,
    ssb_approved,
    ssb_approval_date,
    ssb_approval_ref,
    fee_type,
    flat_amount,
    minimum_amount,
    maximum_amount,
    applicable_contract_types,
    applicable_product_codes,
    applicable_transaction_types,
    fee_category,
    charge_frequency,
    charge_timing,
    income_gl_account,
    is_charity_routed,
    percentage_of_financing_prohibited,
    compounding_prohibited,
    status,
    effective_from
)
SELECT 'ISL_CARD_ISS_WADIAH',
       'Islamic Wadiah Card Issuance Fee',
       'One-time ujrah fee for Wadiah-linked Islamic debit card issuance.',
       'UJRAH_PERMISSIBLE',
       'Permissible administrative recovery for physical card issuance and lifecycle servicing.',
       'AAOIFI Shariah Standard No. 2',
       TRUE,
       CURRENT_DATE,
       'SEED-V129-WADIAH',
       'FLAT',
       10.00,
       10.00,
       10.00,
       '["WADIAH"]'::jsonb,
       '["ISL_WADIAH_DEBIT"]'::jsonb,
       '["CARD_ISSUANCE"]'::jsonb,
       'CARD_ISSUANCE',
       'ONE_TIME',
       'AT_EVENT',
       '4100-ISL-CARDFEE',
       FALSE,
       FALSE,
       TRUE,
       'ACTIVE',
       CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_fee_configurations WHERE fee_code = 'ISL_CARD_ISS_WADIAH'
);

INSERT INTO islamic_fee_configurations (
    fee_code,
    name,
    description,
    shariah_classification,
    shariah_justification,
    shariah_reference,
    ssb_approved,
    ssb_approval_date,
    ssb_approval_ref,
    fee_type,
    flat_amount,
    minimum_amount,
    maximum_amount,
    applicable_contract_types,
    applicable_product_codes,
    applicable_transaction_types,
    fee_category,
    charge_frequency,
    charge_timing,
    income_gl_account,
    is_charity_routed,
    percentage_of_financing_prohibited,
    compounding_prohibited,
    status,
    effective_from
)
SELECT 'ISL_CARD_ISS_MUDARABAH',
       'Islamic Mudarabah Card Issuance Fee',
       'One-time ujrah fee for Mudarabah-linked Islamic debit card issuance.',
       'UJRAH_PERMISSIBLE',
       'Permissible administrative recovery for physical card issuance and lifecycle servicing.',
       'AAOIFI Shariah Standard No. 2',
       TRUE,
       CURRENT_DATE,
       'SEED-V129-MUDARABAH',
       'FLAT',
       15.00,
       15.00,
       15.00,
       '["MUDARABAH"]'::jsonb,
       '["ISL_MUDARABAH_DEBIT"]'::jsonb,
       '["CARD_ISSUANCE"]'::jsonb,
       'CARD_ISSUANCE',
       'ONE_TIME',
       'AT_EVENT',
       '4100-ISL-CARDFEE',
       FALSE,
       FALSE,
       TRUE,
       'ACTIVE',
       CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM islamic_fee_configurations WHERE fee_code = 'ISL_CARD_ISS_MUDARABAH'
);

INSERT INTO islamic_card_product (
    product_code,
    product_name,
    description,
    contract_type,
    card_scheme,
    card_tier,
    restriction_profile_id,
    settlement_gl_code,
    fee_gl_code,
    issuance_fee_code,
    allow_atm,
    allow_pos,
    allow_online,
    allow_international,
    allow_contactless,
    require_verified_kyc,
    allow_overdraft,
    active
)
SELECT 'ISL_WADIAH_DEBIT',
       'Islamic Wadiah Debit Card',
       'Shariah-compliant debit card product linked to Wadiah demand deposits.',
       'WADIAH',
       'VISA',
       'CLASSIC',
       p.id,
       '2100-ISL-CARD-SETTLE',
       '4100-ISL-CARDFEE',
       'ISL_CARD_ISS_WADIAH',
       TRUE,
       TRUE,
       TRUE,
       FALSE,
       TRUE,
       TRUE,
       FALSE,
       TRUE
FROM islamic_card_profile p
WHERE p.profile_code = 'ISLAMIC_STANDARD_MCC'
  AND NOT EXISTS (
      SELECT 1 FROM islamic_card_product WHERE product_code = 'ISL_WADIAH_DEBIT'
  );

INSERT INTO islamic_card_product (
    product_code,
    product_name,
    description,
    contract_type,
    card_scheme,
    card_tier,
    restriction_profile_id,
    settlement_gl_code,
    fee_gl_code,
    issuance_fee_code,
    allow_atm,
    allow_pos,
    allow_online,
    allow_international,
    allow_contactless,
    require_verified_kyc,
    allow_overdraft,
    active
)
SELECT 'ISL_MUDARABAH_DEBIT',
       'Islamic Mudarabah Debit Card',
       'Shariah-compliant debit card product linked to unrestricted Mudarabah investment accounts.',
       'MUDARABAH',
       'VISA',
       'CLASSIC',
       p.id,
       '2100-ISL-CARD-SETTLE',
       '4100-ISL-CARDFEE',
       'ISL_CARD_ISS_MUDARABAH',
       TRUE,
       TRUE,
       TRUE,
       FALSE,
       TRUE,
       TRUE,
       FALSE,
       TRUE
FROM islamic_card_profile p
WHERE p.profile_code = 'ISLAMIC_STRICT_MCC'
  AND NOT EXISTS (
      SELECT 1 FROM islamic_card_product WHERE product_code = 'ISL_MUDARABAH_DEBIT'
  );