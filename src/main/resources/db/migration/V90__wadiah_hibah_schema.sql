SET search_path TO cbs;

-- ---------------------------------------------------------------------------
-- Wadiah current accounts and Hibah support tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hibah_policy (
    id                                     BIGSERIAL PRIMARY KEY,
    policy_code                            VARCHAR(40) NOT NULL UNIQUE,
    name                                   VARCHAR(200) NOT NULL,
    name_ar                                VARCHAR(200),
    description                            TEXT,
    minimum_balance_for_eligibility        NUMERIC(18,2),
    minimum_days_active                    INT NOT NULL DEFAULT 0,
    exclude_dormant_accounts               BOOLEAN NOT NULL DEFAULT TRUE,
    exclude_blocked_accounts               BOOLEAN NOT NULL DEFAULT TRUE,
    maximum_distributions_per_year         INT NOT NULL DEFAULT 4,
    minimum_days_between_distributions     INT NOT NULL DEFAULT 60,
    maximum_hibah_rate_per_annum           NUMERIC(8,4),
    variability_requirement                VARCHAR(30) NOT NULL
                                               CHECK (variability_requirement IN (
                                                   'MANDATORY_VARIATION', 'RECOMMENDED_VARIATION', 'NO_REQUIREMENT'
                                               )),
    maximum_consecutive_same_rate          INT NOT NULL DEFAULT 2,
    maximum_total_distribution_per_period  NUMERIC(18,2),
    funding_source_gl                      VARCHAR(20) NOT NULL,
    fatwa_id                               BIGINT,
    approval_required                      BOOLEAN NOT NULL DEFAULT TRUE,
    ssb_review_frequency                   VARCHAR(20) NOT NULL
                                               CHECK (ssb_review_frequency IN ('QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY')),
    last_ssb_review                        DATE,
    next_ssb_review                        DATE,
    status                                 VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                               CHECK (status IN ('ACTIVE', 'SUSPENDED', 'UNDER_REVIEW')),
    tenant_id                              BIGINT,
    created_at                             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                             VARCHAR(100),
    updated_by                             VARCHAR(100),
    version                                BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wadiah_account (
    id                              BIGSERIAL PRIMARY KEY,
    account_id                      BIGINT NOT NULL UNIQUE REFERENCES account(id),
    wadiah_type                     VARCHAR(20) NOT NULL
                                        CHECK (wadiah_type IN ('YAD_DHAMANAH', 'YAD_AMANAH')),
    contract_reference              VARCHAR(50) NOT NULL UNIQUE,
    contract_signed_date            DATE,
    contract_version                INT NOT NULL DEFAULT 1,
    islamic_product_template_id     BIGINT,
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
    sweep_target_account_id         BIGINT,
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
                                        CHECK (statement_frequency IN ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'ON_DEMAND')),
    preferred_language              VARCHAR(10) NOT NULL DEFAULT 'EN'
                                        CHECK (preferred_language IN ('EN', 'AR', 'EN_AR')),
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hibah_distribution_batch (
    id                          BIGSERIAL PRIMARY KEY,
    policy_id                   BIGINT REFERENCES hibah_policy(id),
    batch_ref                   VARCHAR(50) NOT NULL UNIQUE,
    distribution_date           DATE NOT NULL,
    period_from                 DATE NOT NULL,
    period_to                   DATE NOT NULL,
    total_distribution_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
    account_count               INT NOT NULL DEFAULT 0,
    average_hibah_rate          NUMERIC(8,4),
    distribution_method         VARCHAR(30) NOT NULL
                                    CHECK (distribution_method IN (
                                        'FLAT_AMOUNT', 'BALANCE_WEIGHTED', 'TIERED', 'DISCRETIONARY_MANUAL'
                                    )),
    decision_table_code         VARCHAR(100),
    funding_source              VARCHAR(30) NOT NULL
                                    CHECK (funding_source IN ('BANK_EQUITY', 'RETAINED_EARNINGS', 'SPECIFIC_INCOME_POOL')),
    funding_source_gl           VARCHAR(20) NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                    CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'CANCELLED')),
    approved_by                 VARCHAR(100),
    approved_at                 TIMESTAMP,
    shariah_board_notified      BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at                TIMESTAMP,
    processed_by                VARCHAR(100),
    total_journal_entries       INT NOT NULL DEFAULT 0,
    journal_batch_ref           VARCHAR(50),
    notes                       TEXT,
    tenant_id                   BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hibah_distribution_item (
    id                  BIGSERIAL PRIMARY KEY,
    batch_id            BIGINT NOT NULL REFERENCES hibah_distribution_batch(id) ON DELETE CASCADE,
    account_id          BIGINT NOT NULL,
    wadiah_account_id   BIGINT NOT NULL REFERENCES wadiah_account(id),
    customer_id         BIGINT NOT NULL,
    average_balance     NUMERIC(18,2),
    minimum_balance     NUMERIC(18,2),
    hibah_amount        NUMERIC(18,2) NOT NULL,
    hibah_rate          NUMERIC(8,4),
    calculation_basis   VARCHAR(300),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'CREDITED', 'FAILED', 'EXCLUDED')),
    exclusion_reason    VARCHAR(250),
    transaction_ref     VARCHAR(40),
    credited_at         TIMESTAMP,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wadiah_onboarding_application (
    id                                  BIGSERIAL PRIMARY KEY,
    application_ref                     VARCHAR(50) NOT NULL UNIQUE,
    customer_id                         BIGINT,
    new_customer_onboarding_id          BIGINT,
    product_template_id                 BIGINT NOT NULL REFERENCES product_template(id),
    product_code                        VARCHAR(30) NOT NULL,
    currency_code                       VARCHAR(3) NOT NULL,
    branch_code                         VARCHAR(20),
    officer_id                          VARCHAR(100),
    channel                             VARCHAR(20) NOT NULL
                                            CHECK (channel IN ('BRANCH', 'ONLINE', 'MOBILE', 'AGENT')),
    status                              VARCHAR(30) NOT NULL DEFAULT 'INITIATED'
                                            CHECK (status IN (
                                                'INITIATED', 'KYC_VERIFICATION', 'PRODUCT_SELECTION', 'SHARIAH_DISCLOSURE',
                                                'DOCUMENT_SIGNING', 'COMPLIANCE_CHECK', 'PENDING_APPROVAL', 'APPROVED',
                                                'REJECTED', 'CANCELLED', 'EXPIRED'
                                            )),
    current_step                        INT NOT NULL DEFAULT 1,
    steps                               JSONB NOT NULL DEFAULT '[]'::jsonb,
    shariah_disclosure_presented        BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_disclosure_accepted         BOOLEAN NOT NULL DEFAULT FALSE,
    shariah_disclosure_accepted_at      TIMESTAMP,
    hibah_non_guarantee_acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
    hibah_acknowledged_at               TIMESTAMP,
    zakat_obligation_disclosed          BOOLEAN NOT NULL DEFAULT FALSE,
    zakat_acknowledged_at               TIMESTAMP,
    kyc_verified                        BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_verification_id                 BIGINT,
    aml_screening_passed                BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_check_passed              BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_notes                    TEXT,
    requested_features                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    account_id                          BIGINT REFERENCES account(id),
    wadiah_account_id                   BIGINT REFERENCES wadiah_account(id),
    contract_reference                  VARCHAR(50),
    rejection_reason                    TEXT,
    approved_by                         VARCHAR(100),
    approved_at                         TIMESTAMP,
    initiated_at                        TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at                        TIMESTAMP,
    expires_at                          TIMESTAMP NOT NULL,
    tenant_id                           BIGINT,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          VARCHAR(100),
    updated_by                          VARCHAR(100),
    version                             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wadiah_statement_config (
    id                          BIGSERIAL PRIMARY KEY,
    wadiah_account_id           BIGINT NOT NULL UNIQUE REFERENCES wadiah_account(id) ON DELETE CASCADE,
    language                    VARCHAR(10) NOT NULL DEFAULT 'EN'
                                    CHECK (language IN ('EN', 'AR', 'EN_AR')),
    include_hibah_disclaimer    BOOLEAN NOT NULL DEFAULT TRUE,
    include_zakat_summary       BOOLEAN NOT NULL DEFAULT TRUE,
    include_islamic_dates       BOOLEAN NOT NULL DEFAULT TRUE,
    show_average_balance        BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_method             VARCHAR(30) NOT NULL DEFAULT 'PORTAL'
                                    CHECK (delivery_method IN ('PAPER', 'EMAIL', 'PORTAL', 'SMS_NOTIFICATION')),
    tenant_id                   BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    version                     BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hibah_policy_status
    ON hibah_policy (status);
CREATE INDEX IF NOT EXISTS idx_hibah_policy_tenant
    ON hibah_policy (tenant_id);

CREATE INDEX IF NOT EXISTS idx_wadiah_account_tenant
    ON wadiah_account (tenant_id);
CREATE INDEX IF NOT EXISTS idx_wadiah_account_hibah
    ON wadiah_account (hibah_eligible, last_hibah_distribution_date);
CREATE INDEX IF NOT EXISTS idx_wadiah_account_last_activity
    ON wadiah_account (last_activity_date);

CREATE INDEX IF NOT EXISTS idx_hibah_distribution_batch_date
    ON hibah_distribution_batch (distribution_date, status);
CREATE INDEX IF NOT EXISTS idx_hibah_distribution_batch_policy
    ON hibah_distribution_batch (policy_id);

CREATE INDEX IF NOT EXISTS idx_hibah_distribution_item_batch
    ON hibah_distribution_item (batch_id);
CREATE INDEX IF NOT EXISTS idx_hibah_distribution_item_account
    ON hibah_distribution_item (account_id);
CREATE INDEX IF NOT EXISTS idx_hibah_distribution_item_wadiah_account
    ON hibah_distribution_item (wadiah_account_id);

CREATE INDEX IF NOT EXISTS idx_wadiah_onboarding_status
    ON wadiah_onboarding_application (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_wadiah_onboarding_customer
    ON wadiah_onboarding_application (customer_id);
CREATE INDEX IF NOT EXISTS idx_wadiah_onboarding_wadiah_account
    ON wadiah_onboarding_application (wadiah_account_id);
