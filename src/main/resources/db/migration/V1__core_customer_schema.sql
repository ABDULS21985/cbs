-- V1__core_customer_schema.sql
-- Core Banking System - Customer Information File (CIF) foundation
-- Capability 1: 360° Customer View

CREATE SCHEMA IF NOT EXISTS cbs;
SET search_path TO cbs;

-- ============================================================
-- ENUMERATIONS AS LOOKUP TABLES
-- ============================================================

CREATE TABLE customer_type (
    code        VARCHAR(20) PRIMARY KEY,
    description VARCHAR(100) NOT NULL
);
INSERT INTO customer_type (code, description) VALUES
    ('INDIVIDUAL', 'Individual / Personal'),
    ('SOLE_PROPRIETOR', 'Sole Proprietorship'),
    ('SME', 'Small and Medium Enterprise'),
    ('CORPORATE', 'Corporate Entity'),
    ('TRUST', 'Trust / Foundation'),
    ('GOVERNMENT', 'Government Entity'),
    ('NGO', 'Non-Governmental Organisation');

CREATE TABLE gender (
    code        VARCHAR(10) PRIMARY KEY,
    description VARCHAR(50) NOT NULL
);
INSERT INTO gender (code, description) VALUES
    ('MALE', 'Male'), ('FEMALE', 'Female'), ('OTHER', 'Other');

CREATE TABLE marital_status (
    code        VARCHAR(20) PRIMARY KEY,
    description VARCHAR(50) NOT NULL
);
INSERT INTO marital_status (code, description) VALUES
    ('SINGLE', 'Single'), ('MARRIED', 'Married'), ('DIVORCED', 'Divorced'),
    ('WIDOWED', 'Widowed'), ('SEPARATED', 'Separated');

CREATE TABLE id_type (
    code        VARCHAR(30) PRIMARY KEY,
    description VARCHAR(100) NOT NULL,
    country     VARCHAR(3) DEFAULT 'NGA'
);
INSERT INTO id_type (code, description, country) VALUES
    ('NIN', 'National Identification Number', 'NGA'),
    ('BVN', 'Bank Verification Number', 'NGA'),
    ('VOTERS_CARD', 'Voter''s Card', 'NGA'),
    ('DRIVERS_LICENSE', 'Driver''s License', 'NGA'),
    ('INTL_PASSPORT', 'International Passport', 'NGA'),
    ('TIN', 'Tax Identification Number', 'NGA'),
    ('CAC_REG', 'CAC Registration Number', 'NGA'),
    ('RC_NUMBER', 'RC Number (Corporate)', 'NGA'),
    ('NIMC_SLIP', 'NIMC Enrollment Slip', 'NGA');

-- ============================================================
-- CORE CUSTOMER TABLE (CIF)
-- ============================================================

CREATE TABLE customer (
    id                  BIGSERIAL PRIMARY KEY,
    cif_number          VARCHAR(20) NOT NULL UNIQUE,
    customer_type       VARCHAR(20) NOT NULL REFERENCES customer_type(code),
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
    gender              VARCHAR(10) REFERENCES gender(code),
    marital_status      VARCHAR(20) REFERENCES marital_status(code),
    nationality         VARCHAR(3) DEFAULT 'NGA',
    state_of_origin     VARCHAR(50),
    lga_of_origin       VARCHAR(100),
    mother_maiden_name  VARCHAR(100),

    -- Corporate/SME fields
    registered_name     VARCHAR(255),
    trading_name        VARCHAR(255),
    registration_number VARCHAR(50),
    registration_date   DATE,
    industry_code       VARCHAR(20),
    sector_code         VARCHAR(20),

    -- Common fields
    tax_id              VARCHAR(30),
    email               VARCHAR(150),
    phone_primary       VARCHAR(20),
    phone_secondary     VARCHAR(20),
    preferred_language  VARCHAR(10) DEFAULT 'en',
    preferred_channel   VARCHAR(20) DEFAULT 'MOBILE',

    -- Metadata
    relationship_manager VARCHAR(100),
    branch_code          VARCHAR(10),
    onboarded_channel    VARCHAR(30),
    profile_photo_url    VARCHAR(500),
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
    state           VARCHAR(50),
    country         VARCHAR(3) NOT NULL DEFAULT 'NGA',
    postal_code     VARCHAR(20),
    lga             VARCHAR(100),
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
    id_type         VARCHAR(30) NOT NULL REFERENCES id_type(code),
    id_number       VARCHAR(50) NOT NULL,
    issue_date      DATE,
    expiry_date     DATE,
    issuing_authority VARCHAR(100),
    issuing_country VARCHAR(3) DEFAULT 'NGA',
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMP WITH TIME ZONE,
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
-- CUSTOMER CONTACTS (beyond primary phone/email)
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
-- CUSTOMER RELATIONSHIPS (parent-child, guarantor, beneficial owner)
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
CREATE INDEX idx_customer_rel_type ON customer_relationship(relationship_type);

-- ============================================================
-- CUSTOMER NOTES / INTERACTION LOG
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
-- CIF NUMBER SEQUENCE
-- ============================================================

CREATE SEQUENCE cif_number_seq START WITH 100000 INCREMENT BY 1;
