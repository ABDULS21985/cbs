-- V1__core_customer_schema.sql
-- Core Banking System — Global Customer Information File (CIF)
-- Country-agnostic: all locale-specific data loaded via deployment config, not hardcoded

CREATE SCHEMA IF NOT EXISTS cbs;
SET search_path TO cbs;

-- ============================================================
-- FLEXIBLE LOOKUP TABLES (populated per-deployment, not hardcoded)
-- ============================================================

CREATE TABLE lookup_category (
    code        VARCHAR(30) PRIMARY KEY,
    description VARCHAR(100) NOT NULL
);

INSERT INTO lookup_category (code, description) VALUES
    ('CUSTOMER_TYPE', 'Customer entity types'),
    ('GENDER', 'Gender options'),
    ('MARITAL_STATUS', 'Marital status options'),
    ('ID_TYPE', 'Identity document types'),
    ('INDUSTRY', 'Industry classification'),
    ('SECTOR', 'Economic sector classification');

CREATE TABLE lookup_value (
    id          BIGSERIAL PRIMARY KEY,
    category    VARCHAR(30) NOT NULL REFERENCES lookup_category(code),
    code        VARCHAR(50) NOT NULL,
    label       VARCHAR(200) NOT NULL,
    country     VARCHAR(3),               -- NULL = global, ISO 3166 alpha-3 = country-specific
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    metadata    JSONB DEFAULT '{}',
    UNIQUE(category, code, country)
);

CREATE INDEX idx_lookup_category ON lookup_value(category);
CREATE INDEX idx_lookup_country ON lookup_value(country);

-- Global customer types (available in all deployments)
INSERT INTO lookup_value (category, code, label, sort_order) VALUES
    ('CUSTOMER_TYPE', 'INDIVIDUAL', 'Individual / Personal', 1),
    ('CUSTOMER_TYPE', 'SOLE_PROPRIETOR', 'Sole Proprietorship', 2),
    ('CUSTOMER_TYPE', 'SME', 'Small and Medium Enterprise', 3),
    ('CUSTOMER_TYPE', 'CORPORATE', 'Corporate Entity', 4),
    ('CUSTOMER_TYPE', 'TRUST', 'Trust / Foundation', 5),
    ('CUSTOMER_TYPE', 'GOVERNMENT', 'Government Entity', 6),
    ('CUSTOMER_TYPE', 'NGO', 'Non-Governmental Organisation', 7),
    ('GENDER', 'MALE', 'Male', 1),
    ('GENDER', 'FEMALE', 'Female', 2),
    ('GENDER', 'OTHER', 'Other', 3),
    ('MARITAL_STATUS', 'SINGLE', 'Single', 1),
    ('MARITAL_STATUS', 'MARRIED', 'Married', 2),
    ('MARITAL_STATUS', 'DIVORCED', 'Divorced', 3),
    ('MARITAL_STATUS', 'WIDOWED', 'Widowed', 4),
    ('MARITAL_STATUS', 'SEPARATED', 'Separated', 5);

-- Global ID types (universal documents)
INSERT INTO lookup_value (category, code, label, sort_order) VALUES
    ('ID_TYPE', 'PASSPORT', 'International Passport', 1),
    ('ID_TYPE', 'NATIONAL_ID', 'National Identity Card', 2),
    ('ID_TYPE', 'DRIVERS_LICENSE', 'Driver''s License', 3),
    ('ID_TYPE', 'TAX_ID', 'Tax Identification Number', 4),
    ('ID_TYPE', 'CORPORATE_REG', 'Corporate Registration Number', 5),
    ('ID_TYPE', 'RESIDENCE_PERMIT', 'Residence Permit', 6),
    ('ID_TYPE', 'VOTER_ID', 'Voter Registration Card', 7),
    ('ID_TYPE', 'SOCIAL_SECURITY', 'Social Security / Insurance Number', 8);

-- ============================================================
-- CORE CUSTOMER TABLE (CIF) — GLOBAL
-- ============================================================

CREATE TABLE customer (
    id                  BIGSERIAL PRIMARY KEY,
    cif_number          VARCHAR(30) NOT NULL UNIQUE,
    customer_type       VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('PROSPECT','ACTIVE','DORMANT','SUSPENDED','CLOSED','DECEASED')),
    risk_rating         VARCHAR(10) DEFAULT 'MEDIUM'
                            CHECK (risk_rating IN ('LOW','MEDIUM','HIGH','VERY_HIGH','PEP','SANCTIONED')),

    -- Individual fields
    title               VARCHAR(20),
    first_name          VARCHAR(100),
    middle_name         VARCHAR(100),
    last_name           VARCHAR(100),
    date_of_birth       DATE,
    gender              VARCHAR(10),
    marital_status      VARCHAR(20),
    nationality         VARCHAR(3),         -- ISO 3166-1 alpha-3
    state_of_origin     VARCHAR(100),       -- State / Province / Region
    lga_of_origin       VARCHAR(100),       -- Local government / District / County
    mother_maiden_name  VARCHAR(100),

    -- Corporate/SME fields
    registered_name     VARCHAR(255),
    trading_name        VARCHAR(255),
    registration_number VARCHAR(50),
    registration_date   DATE,
    industry_code       VARCHAR(20),
    sector_code         VARCHAR(20),

    -- Common
    tax_id              VARCHAR(50),
    email               VARCHAR(150),
    phone_primary       VARCHAR(20),
    phone_secondary     VARCHAR(20),
    preferred_language  VARCHAR(10) DEFAULT 'en',
    preferred_channel   VARCHAR(20) DEFAULT 'MOBILE',

    -- Operational
    relationship_manager VARCHAR(100),
    branch_code          VARCHAR(20),
    onboarded_channel    VARCHAR(30),
    profile_photo_url    VARCHAR(500),
    country_of_residence VARCHAR(3),        -- ISO 3166-1 alpha-3
    metadata             JSONB DEFAULT '{}',

    -- Audit
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_customer_cif ON customer(cif_number);
CREATE INDEX idx_customer_type ON customer(customer_type);
CREATE INDEX idx_customer_status ON customer(status);
CREATE INDEX idx_customer_email ON customer(email);
CREATE INDEX idx_customer_phone ON customer(phone_primary);
CREATE INDEX idx_customer_name_individual ON customer(last_name, first_name) WHERE customer_type = 'INDIVIDUAL';
CREATE INDEX idx_customer_name_corporate ON customer(registered_name) WHERE customer_type IN ('SME','CORPORATE','GOVERNMENT','NGO');
CREATE INDEX idx_customer_branch ON customer(branch_code);
CREATE INDEX idx_customer_risk ON customer(risk_rating);
CREATE INDEX idx_customer_country ON customer(country_of_residence);

-- ============================================================
-- CUSTOMER ADDRESSES
-- ============================================================

CREATE TABLE customer_address (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    address_type    VARCHAR(20) NOT NULL CHECK (address_type IN ('RESIDENTIAL','OFFICE','REGISTERED','MAILING','NEXT_OF_KIN')),
    address_line1   VARCHAR(255) NOT NULL,
    address_line2   VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),           -- State / Province / Region / Canton
    country         VARCHAR(3) NOT NULL,    -- ISO 3166-1 alpha-3
    postal_code     VARCHAR(20),
    district        VARCHAR(100),           -- LGA / District / County / Borough
    landmark        VARCHAR(200),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMP WITH TIME ZONE,
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_customer_address_customer ON customer_address(customer_id);

-- ============================================================
-- CUSTOMER IDENTIFICATION DOCUMENTS
-- ============================================================

CREATE TABLE customer_identification (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    id_type         VARCHAR(50) NOT NULL,
    id_number       VARCHAR(100) NOT NULL,
    issue_date      DATE,
    expiry_date     DATE,
    issuing_authority VARCHAR(200),
    issuing_country VARCHAR(3),             -- ISO 3166-1 alpha-3
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMP WITH TIME ZONE,
    verification_provider VARCHAR(50),
    verification_ref VARCHAR(100),
    document_url    VARCHAR(500),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(customer_id, id_type, id_number)
);

CREATE INDEX idx_customer_id_customer ON customer_identification(customer_id);
CREATE INDEX idx_customer_id_type_number ON customer_identification(id_type, id_number);

-- ============================================================
-- CUSTOMER CONTACTS
-- ============================================================

CREATE TABLE customer_contact (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    contact_type    VARCHAR(20) NOT NULL CHECK (contact_type IN ('PHONE','EMAIL','FAX','SOCIAL')),
    contact_value   VARCHAR(200) NOT NULL,
    label           VARCHAR(50),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_customer_contact_customer ON customer_contact(customer_id);

-- ============================================================
-- CUSTOMER RELATIONSHIPS
-- ============================================================

CREATE TABLE customer_relationship (
    id                      BIGSERIAL PRIMARY KEY,
    customer_id             BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    related_customer_id     BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    relationship_type       VARCHAR(30) NOT NULL CHECK (relationship_type IN (
                                'PARENT_COMPANY','SUBSIDIARY','GUARANTOR','BENEFICIAL_OWNER',
                                'DIRECTOR','SIGNATORY','NEXT_OF_KIN','SPOUSE','GUARDIAN','OTHER')),
    ownership_percentage    NUMERIC(5,2),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    notes                   TEXT,
    effective_from          DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to            DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0,
    CHECK (customer_id <> related_customer_id)
);

CREATE INDEX idx_customer_rel_customer ON customer_relationship(customer_id);
CREATE INDEX idx_customer_rel_related ON customer_relationship(related_customer_id);

-- ============================================================
-- CUSTOMER NOTES
-- ============================================================

CREATE TABLE customer_note (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    note_type       VARCHAR(20) NOT NULL DEFAULT 'GENERAL' CHECK (note_type IN ('GENERAL','COMPLAINT','INTERACTION','KYC','RISK','INTERNAL')),
    subject         VARCHAR(200),
    content         TEXT NOT NULL,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_customer_note_customer ON customer_note(customer_id);

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE cif_number_seq START WITH 100000 INCREMENT BY 1;
