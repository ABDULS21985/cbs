-- V13__trade_finance_schema.sql
-- Capabilities 47-51: LC, Guarantees, Documentary Collections, Supply Chain Finance, Trade Docs

SET search_path TO cbs;

-- ============================================================
-- CAPABILITY 47: LETTERS OF CREDIT (LC)
-- ============================================================

CREATE TABLE letter_of_credit (
    id                      BIGSERIAL PRIMARY KEY,
    lc_number               VARCHAR(30) NOT NULL UNIQUE,
    lc_type                 VARCHAR(30) NOT NULL CHECK (lc_type IN (
                                'IMPORT_LC','EXPORT_LC','STANDBY_LC','TRANSFERABLE_LC',
                                'REVOLVING_LC','RED_CLAUSE','GREEN_CLAUSE','BACK_TO_BACK')),
    lc_role                 VARCHAR(20) NOT NULL CHECK (lc_role IN ('ISSUING','ADVISING','CONFIRMING','NEGOTIATING')),
    -- Parties
    applicant_customer_id   BIGINT NOT NULL REFERENCES customer(id),
    beneficiary_name        VARCHAR(200) NOT NULL,
    beneficiary_address     TEXT,
    beneficiary_bank_code   VARCHAR(20),
    beneficiary_bank_name   VARCHAR(200),
    issuing_bank_code       VARCHAR(20),
    advising_bank_code      VARCHAR(20),
    confirming_bank_code    VARCHAR(20),
    -- Amount
    amount                  NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    tolerance_positive_pct  NUMERIC(5,2) DEFAULT 0,
    tolerance_negative_pct  NUMERIC(5,2) DEFAULT 0,
    utilized_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    -- Dates
    issue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date             DATE NOT NULL,
    latest_shipment_date    DATE,
    -- Terms
    tenor_days              INT,
    payment_terms           VARCHAR(30) CHECK (payment_terms IN ('SIGHT','DEFERRED','MIXED','ACCEPTANCE','NEGOTIATION')),
    incoterms               VARCHAR(10),
    port_of_loading         VARCHAR(100),
    port_of_discharge       VARCHAR(100),
    goods_description       TEXT NOT NULL,
    -- Documents required
    required_documents      JSONB NOT NULL DEFAULT '[]',
    special_conditions      JSONB DEFAULT '[]',
    -- UCP 600
    is_irrevocable          BOOLEAN NOT NULL DEFAULT TRUE,
    is_confirmed            BOOLEAN NOT NULL DEFAULT FALSE,
    is_transferable         BOOLEAN NOT NULL DEFAULT FALSE,
    ucp_version             VARCHAR(10) DEFAULT 'UCP 600',
    -- Accounts
    margin_account_id       BIGINT REFERENCES account(id),
    settlement_account_id   BIGINT REFERENCES account(id),
    margin_percentage       NUMERIC(5,2) DEFAULT 100,
    margin_amount           NUMERIC(18,2) DEFAULT 0,
    -- Fees
    commission_rate         NUMERIC(5,4),
    commission_amount       NUMERIC(18,2) DEFAULT 0,
    swift_charges           NUMERIC(18,2) DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','ISSUED','ADVISED','CONFIRMED','AMENDED',
                                    'PARTIALLY_UTILIZED','FULLY_UTILIZED','EXPIRED','CANCELLED','CLOSED')),
    -- Audit
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_lc_applicant ON letter_of_credit(applicant_customer_id);
CREATE INDEX idx_lc_status ON letter_of_credit(status);
CREATE INDEX idx_lc_expiry ON letter_of_credit(expiry_date);

CREATE TABLE lc_amendment (
    id                      BIGSERIAL PRIMARY KEY,
    lc_id                   BIGINT NOT NULL REFERENCES letter_of_credit(id),
    amendment_number        INT NOT NULL,
    amendment_type          VARCHAR(30) NOT NULL,
    old_value               TEXT,
    new_value               TEXT,
    description             TEXT NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
    requested_by            VARCHAR(100),
    approved_by             VARCHAR(100),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE lc_document_presentation (
    id                      BIGSERIAL PRIMARY KEY,
    lc_id                   BIGINT NOT NULL REFERENCES letter_of_credit(id),
    presentation_number     INT NOT NULL,
    presented_date          DATE NOT NULL,
    documents_presented     JSONB NOT NULL DEFAULT '[]',
    amount_claimed          NUMERIC(18,2) NOT NULL,
    -- Examination
    examination_status      VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                CHECK (examination_status IN ('PENDING','COMPLIANT','DISCREPANT','REFUSED')),
    discrepancies           JSONB DEFAULT '[]',
    discrepancy_waived      BOOLEAN DEFAULT FALSE,
    -- Settlement
    settlement_amount       NUMERIC(18,2),
    settlement_date         DATE,
    settlement_ref          VARCHAR(50),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_lc_doc_pres ON lc_document_presentation(lc_id);

-- ============================================================
-- CAPABILITY 48: BANK GUARANTEES & BONDS
-- ============================================================

CREATE TABLE bank_guarantee (
    id                      BIGSERIAL PRIMARY KEY,
    guarantee_number        VARCHAR(30) NOT NULL UNIQUE,
    guarantee_type          VARCHAR(30) NOT NULL CHECK (guarantee_type IN (
                                'PERFORMANCE','BID_BOND','ADVANCE_PAYMENT','CUSTOMS',
                                'FINANCIAL','PAYMENT','RETENTION','WARRANTY','SHIPPING','OTHER')),
    -- Parties
    applicant_customer_id   BIGINT NOT NULL REFERENCES customer(id),
    beneficiary_name        VARCHAR(200) NOT NULL,
    beneficiary_address     TEXT,
    -- Amount
    amount                  NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Dates
    issue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date             DATE NOT NULL,
    claim_expiry_date       DATE,
    auto_extend             BOOLEAN NOT NULL DEFAULT FALSE,
    extension_period_days   INT,
    -- Terms
    underlying_contract_ref VARCHAR(100),
    purpose                 TEXT NOT NULL,
    governing_law           VARCHAR(50),
    is_demand_guarantee     BOOLEAN NOT NULL DEFAULT TRUE,
    claim_conditions        JSONB DEFAULT '[]',
    -- Collateral
    margin_account_id       BIGINT REFERENCES account(id),
    margin_percentage       NUMERIC(5,2) DEFAULT 100,
    margin_amount           NUMERIC(18,2) DEFAULT 0,
    collateral_id           BIGINT REFERENCES collateral(id),
    -- Fees
    commission_rate         NUMERIC(5,4),
    commission_amount       NUMERIC(18,2) DEFAULT 0,
    -- Claims
    claimed_amount          NUMERIC(18,2) DEFAULT 0,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','ISSUED','ACTIVE','CLAIMED','PARTIALLY_CLAIMED',
                                    'EXPIRED','CANCELLED','RELEASED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_bg_applicant ON bank_guarantee(applicant_customer_id);
CREATE INDEX idx_bg_status ON bank_guarantee(status);
CREATE INDEX idx_bg_expiry ON bank_guarantee(expiry_date);

-- ============================================================
-- CAPABILITY 49: DOCUMENTARY COLLECTIONS
-- ============================================================

CREATE TABLE documentary_collection (
    id                      BIGSERIAL PRIMARY KEY,
    collection_number       VARCHAR(30) NOT NULL UNIQUE,
    collection_type         VARCHAR(10) NOT NULL CHECK (collection_type IN ('DP','DA')),
    collection_role         VARCHAR(20) NOT NULL CHECK (collection_role IN ('REMITTING','COLLECTING','PRESENTING')),
    -- Parties
    drawer_customer_id      BIGINT REFERENCES customer(id),
    drawee_name             VARCHAR(200) NOT NULL,
    drawee_address          TEXT,
    remitting_bank_code     VARCHAR(20),
    collecting_bank_code    VARCHAR(20),
    -- Amount
    amount                  NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Documents
    documents_list          JSONB NOT NULL DEFAULT '[]',
    -- Terms
    tenor_days              INT,
    maturity_date           DATE,
    acceptance_date         DATE,
    protest_instructions    VARCHAR(200),
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'RECEIVED'
                                CHECK (status IN ('RECEIVED','PRESENTED','ACCEPTED','PAID',
                                    'PROTESTED','RETURNED','CANCELLED')),
    paid_amount             NUMERIC(18,2) DEFAULT 0,
    paid_date               DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_dc_drawer ON documentary_collection(drawer_customer_id);

-- ============================================================
-- CAPABILITY 50: SUPPLY CHAIN FINANCE
-- ============================================================

CREATE TABLE supply_chain_programme (
    id                      BIGSERIAL PRIMARY KEY,
    programme_code          VARCHAR(20) NOT NULL UNIQUE,
    programme_name          VARCHAR(200) NOT NULL,
    programme_type          VARCHAR(30) NOT NULL CHECK (programme_type IN (
                                'APPROVED_PAYABLES','RECEIVABLES_DISCOUNT','DYNAMIC_DISCOUNT',
                                'DISTRIBUTOR_FINANCE','DEALER_FINANCE')),
    anchor_customer_id      BIGINT NOT NULL REFERENCES customer(id),
    -- Limits
    programme_limit         NUMERIC(18,2) NOT NULL,
    utilized_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    available_amount        NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL REFERENCES currency(code),
    -- Rate
    discount_rate           NUMERIC(8,4),
    margin_over_base        NUMERIC(8,4),
    -- Dates
    effective_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date             DATE NOT NULL,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','EXPIRED','CLOSED')),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE scf_invoice (
    id                      BIGSERIAL PRIMARY KEY,
    programme_id            BIGINT NOT NULL REFERENCES supply_chain_programme(id),
    invoice_number          VARCHAR(50) NOT NULL,
    seller_customer_id      BIGINT REFERENCES customer(id),
    buyer_customer_id       BIGINT REFERENCES customer(id),
    invoice_amount          NUMERIC(18,2) NOT NULL,
    currency_code           VARCHAR(3) NOT NULL,
    invoice_date            DATE NOT NULL,
    due_date                DATE NOT NULL,
    -- Financing
    financed_amount         NUMERIC(18,2),
    discount_amount         NUMERIC(18,2),
    net_payment             NUMERIC(18,2),
    financing_date          DATE,
    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
                                CHECK (status IN ('SUBMITTED','APPROVED','FINANCED','SETTLED','DISPUTED','OVERDUE')),
    settled_date            DATE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_scf_invoice_programme ON scf_invoice(programme_id);

-- ============================================================
-- CAPABILITY 51: TRADE DOCUMENT DIGITISATION
-- ============================================================

CREATE TABLE trade_document (
    id                      BIGSERIAL PRIMARY KEY,
    document_ref            VARCHAR(30) NOT NULL UNIQUE,
    document_category       VARCHAR(30) NOT NULL CHECK (document_category IN (
                                'INVOICE','BILL_OF_LADING','PACKING_LIST','CERTIFICATE_OF_ORIGIN',
                                'INSURANCE_CERT','INSPECTION_CERT','WEIGHT_CERT','PHYTOSANITARY',
                                'CUSTOMS_DECLARATION','DRAFT','OTHER')),
    -- Linkage
    lc_id                   BIGINT REFERENCES letter_of_credit(id),
    collection_id           BIGINT REFERENCES documentary_collection(id),
    customer_id             BIGINT REFERENCES customer(id),
    -- File
    file_name               VARCHAR(300) NOT NULL,
    file_type               VARCHAR(20) NOT NULL,
    storage_path            VARCHAR(500) NOT NULL,
    file_size_bytes         BIGINT,
    -- OCR/AI extraction
    extracted_data          JSONB DEFAULT '{}',
    extraction_confidence   NUMERIC(5,2),
    extraction_status       VARCHAR(20) DEFAULT 'PENDING'
                                CHECK (extraction_status IN ('PENDING','PROCESSING','COMPLETED','FAILED','MANUAL')),
    -- Verification
    verification_status     VARCHAR(20) DEFAULT 'PENDING'
                                CHECK (verification_status IN ('PENDING','VERIFIED','DISCREPANT','REJECTED')),
    verified_by             VARCHAR(100),
    discrepancy_notes       TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_trade_doc_lc ON trade_document(lc_id);
CREATE INDEX idx_trade_doc_coll ON trade_document(collection_id);

CREATE SEQUENCE lc_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE bg_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE dc_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE scf_programme_seq START WITH 1 INCREMENT BY 1;
