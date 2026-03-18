SET search_path TO cbs;

-- V30: Reference Data Platform (BIAN Gap Remediation Batch 25)

-- ============================================================
-- BIAN SD: Financial Instrument Reference Data Management
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_instrument (
    id                      BIGSERIAL PRIMARY KEY,
    instrument_code         VARCHAR(30)  NOT NULL UNIQUE,
    isin                    VARCHAR(12)  UNIQUE,
    cusip                   VARCHAR(9),
    sedol                   VARCHAR(7),
    ticker                  VARCHAR(20),
    instrument_name         VARCHAR(300) NOT NULL,
    instrument_type         VARCHAR(30)  NOT NULL
                            CHECK (instrument_type IN ('EQUITY','GOVERNMENT_BOND','CORPORATE_BOND','TREASURY_BILL',
                                   'SUKUK','MUTUAL_FUND','ETF','DERIVATIVE','FX_SPOT','FX_FORWARD','FX_SWAP',
                                   'INTEREST_RATE_SWAP','REPO','COMMERCIAL_PAPER','CERTIFICATE_OF_DEPOSIT')),
    asset_class             VARCHAR(20)  NOT NULL
                            CHECK (asset_class IN ('FIXED_INCOME','EQUITY','MONEY_MARKET','FX','COMMODITY','DERIVATIVE','ALTERNATIVE')),
    issuer_name             VARCHAR(200),
    issuer_country          VARCHAR(3),
    currency                VARCHAR(3)   NOT NULL,
    face_value              NUMERIC(20,4),
    coupon_rate             NUMERIC(8,4),
    coupon_frequency        VARCHAR(15),
    maturity_date           DATE,
    issue_date              DATE,
    credit_rating           VARCHAR(10),
    rating_agency           VARCHAR(30),
    exchange                VARCHAR(40),
    day_count_convention    VARCHAR(20),
    settlement_days         INT          DEFAULT 2,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_fi_type_class ON financial_instrument(instrument_type, asset_class, is_active);

-- ============================================================
-- BIAN SD: Counterparty Administration
-- ============================================================
CREATE TABLE IF NOT EXISTS counterparty (
    id                      BIGSERIAL PRIMARY KEY,
    counterparty_code       VARCHAR(30)  NOT NULL UNIQUE,
    counterparty_name       VARCHAR(200) NOT NULL,
    counterparty_type       VARCHAR(20)  NOT NULL
                            CHECK (counterparty_type IN ('BANK','BROKER_DEALER','INSURANCE','FUND_MANAGER',
                                   'CORPORATE','SOVEREIGN','CENTRAL_BANK','CLEARING_HOUSE','EXCHANGE','SPV')),
    lei                     VARCHAR(20),
    bic_code                VARCHAR(11),
    country                 VARCHAR(3)   NOT NULL,
    credit_rating           VARCHAR(10),
    rating_agency           VARCHAR(30),
    total_exposure_limit    NUMERIC(20,4),
    current_exposure        NUMERIC(20,4) DEFAULT 0,
    available_limit         NUMERIC(20,4),
    settlement_instructions JSONB,
    netting_agreement       BOOLEAN      NOT NULL DEFAULT FALSE,
    isda_agreement          BOOLEAN      NOT NULL DEFAULT FALSE,
    csa_agreement           BOOLEAN      NOT NULL DEFAULT FALSE,
    kyc_status              VARCHAR(15)  DEFAULT 'PENDING'
                            CHECK (kyc_status IN ('PENDING','VERIFIED','EXPIRED','REJECTED')),
    kyc_review_date         DATE,
    risk_category           VARCHAR(10)  DEFAULT 'MEDIUM'
                            CHECK (risk_category IN ('LOW','MEDIUM','HIGH','PROHIBITED')),
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

CREATE INDEX idx_cp_type_status ON counterparty(counterparty_type, status);

-- ============================================================
-- BIAN SD: Product Directory + Product Design
-- ============================================================
CREATE TABLE IF NOT EXISTS product_catalog_entry (
    id                      BIGSERIAL PRIMARY KEY,
    product_code            VARCHAR(30)  NOT NULL UNIQUE,
    product_name            VARCHAR(200) NOT NULL,
    product_family          VARCHAR(30)  NOT NULL
                            CHECK (product_family IN ('DEPOSITS','LENDING','CARDS','PAYMENTS','TRADE_FINANCE',
                                   'TREASURY','INVESTMENT','INSURANCE','DIGITAL','FOREIGN_EXCHANGE')),
    product_sub_type        VARCHAR(40),
    description             TEXT,
    target_segment          VARCHAR(60),
    available_channels      JSONB,
    eligibility_criteria    JSONB,
    key_features            JSONB,
    fee_schedule            JSONB,
    interest_rates          JSONB,
    terms_and_conditions    TEXT,
    regulatory_classification VARCHAR(40),
    risk_weight_pct         NUMERIC(6,2),
    is_sharia_compliant     BOOLEAN      NOT NULL DEFAULT FALSE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','RETIRED')),
    launched_at             TIMESTAMP,
    retired_at              TIMESTAMP,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- BIAN SD: Correspondent Bank Directory
-- ============================================================
CREATE TABLE IF NOT EXISTS correspondent_bank (
    id                      BIGSERIAL PRIMARY KEY,
    bank_code               VARCHAR(30)  NOT NULL UNIQUE,
    bank_name               VARCHAR(200) NOT NULL,
    bic_code                VARCHAR(11)  NOT NULL,
    country                 VARCHAR(3)   NOT NULL,
    city                    VARCHAR(100),
    relationship_type       VARCHAR(20)  NOT NULL
                            CHECK (relationship_type IN ('NOSTRO','VOSTRO','LORO','BILATERAL','CLEARING','AGENCY')),
    currencies_supported    JSONB,
    nostro_account_id       BIGINT,
    vostro_account_id       BIGINT,
    routing_codes           JSONB,
    preferred_for           JSONB,
    daily_limit             NUMERIC(20,4),
    per_txn_limit           NUMERIC(20,4),
    fee_structure           JSONB,
    due_diligence_status    VARCHAR(15)  DEFAULT 'VERIFIED'
                            CHECK (due_diligence_status IN ('PENDING','VERIFIED','EXPIRED','FAILED')),
    dd_review_date          DATE,
    rma_key_exchanged       BOOLEAN      NOT NULL DEFAULT FALSE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- BIAN SD: Location Data Management
-- (no created_by/updated_by — lightweight reference data)
-- ============================================================
CREATE TABLE IF NOT EXISTS location_reference (
    id                      BIGSERIAL PRIMARY KEY,
    location_code           VARCHAR(30)  NOT NULL UNIQUE,
    location_type           VARCHAR(20)  NOT NULL
                            CHECK (location_type IN ('COUNTRY','STATE','CITY','DISTRICT','POSTAL_CODE',
                                   'BRANCH_AREA','ATM_ZONE','AGENT_ZONE')),
    location_name           VARCHAR(200) NOT NULL,
    parent_location_id      BIGINT       REFERENCES location_reference(id),
    iso_country_code        VARCHAR(3),
    iso_subdivision_code    VARCHAR(6),
    latitude                NUMERIC(10,7),
    longitude               NUMERIC(10,7),
    timezone                VARCHAR(40),
    currency                VARCHAR(3),
    regulatory_zone         VARCHAR(40),
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- BIAN SD: Party Routing Profile
-- (no created_by/updated_by — customer-facing preference record)
-- ============================================================
CREATE TABLE IF NOT EXISTS party_routing_profile (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT       NOT NULL UNIQUE,
    preferred_channel       VARCHAR(20),
    preferred_language      VARCHAR(10)  DEFAULT 'en',
    preferred_branch_id     BIGINT,
    assigned_rm_id          VARCHAR(80),
    contact_preferences     JSONB,
    marketing_consent       BOOLEAN      NOT NULL DEFAULT TRUE,
    data_sharing_consent    BOOLEAN      NOT NULL DEFAULT FALSE,
    risk_profile            VARCHAR(20)  DEFAULT 'MODERATE'
                            CHECK (risk_profile IN ('CONSERVATIVE','MODERATE','AGGRESSIVE','SPECULATIVE')),
    service_tier            VARCHAR(20)  DEFAULT 'STANDARD'
                            CHECK (service_tier IN ('BASIC','STANDARD','PREMIUM','PRIVATE','ULTRA_HNW')),
    special_handling        JSONB,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- BIAN SD: Interbank Relationship Management
-- ============================================================
CREATE TABLE IF NOT EXISTS interbank_relationship (
    id                      BIGSERIAL PRIMARY KEY,
    relationship_code       VARCHAR(30)  NOT NULL UNIQUE,
    counterparty_bank_id    BIGINT       REFERENCES counterparty(id),
    bank_name               VARCHAR(200) NOT NULL,
    bic_code                VARCHAR(11),
    relationship_type       VARCHAR(30)  NOT NULL
                            CHECK (relationship_type IN ('MONEY_MARKET','FX_TRADING','REPO','SECURITIES_LENDING',
                                   'PAYMENT_CLEARING','TRADE_FINANCE','SYNDICATION','AGENCY')),
    credit_line_amount      NUMERIC(20,4),
    credit_line_used        NUMERIC(20,4) DEFAULT 0,
    agreement_date          DATE,
    review_date             DATE,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PENDING','ACTIVE','UNDER_REVIEW','SUSPENDED','TERMINATED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);

-- ============================================================
-- BIAN SD: Syndicate Management
-- ============================================================
CREATE TABLE IF NOT EXISTS syndicate_arrangement (
    id                      BIGSERIAL PRIMARY KEY,
    syndicate_code          VARCHAR(30)  NOT NULL UNIQUE,
    syndicate_name          VARCHAR(200) NOT NULL,
    syndicate_type          VARCHAR(20)  NOT NULL
                            CHECK (syndicate_type IN ('LOAN_SYNDICATION','BOND_UNDERWRITING','IPO','RIGHTS_ISSUE',
                                   'GUARANTEE','TRADE_FINANCE','PROJECT_FINANCE')),
    lead_arranger           VARCHAR(200) NOT NULL,
    total_facility_amount   NUMERIC(20,4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    our_commitment          NUMERIC(20,4) NOT NULL,
    our_share_pct           NUMERIC(6,2),
    participants            JSONB,
    borrower_name           VARCHAR(200),
    purpose                 TEXT,
    tenor_months            INT,
    pricing                 JSONB,
    status                  VARCHAR(15)  NOT NULL DEFAULT 'STRUCTURING'
                            CHECK (status IN ('STRUCTURING','MARKETING','COMMITTED','ACTIVE','AMORTIZING',
                                   'MATURED','CANCELLED')),
    signing_date            DATE,
    maturity_date           DATE,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now(),
    version                 BIGINT       DEFAULT 0
);
