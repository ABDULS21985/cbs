-- V48: Add tables for account holds, maintenance history, interest posting history,
--       facility covenants, beneficiaries, bank directory, and ECL batch runs

SET search_path TO cbs;

-- =========================================================================
-- ACCOUNT HOLDS / LIENS
-- =========================================================================
CREATE TABLE account_hold (
    id                  BIGSERIAL PRIMARY KEY,
    account_id          BIGINT NOT NULL REFERENCES account(id),
    reference           VARCHAR(40) NOT NULL,
    amount              NUMERIC(18,2) NOT NULL,
    reason              VARCHAR(500) NOT NULL,
    placed_by           VARCHAR(100) NOT NULL,
    hold_type           VARCHAR(20) NOT NULL DEFAULT 'LIEN',
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    release_date        DATE,
    released_by         VARCHAR(100),
    release_reason      VARCHAR(500),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_account_hold_account ON account_hold(account_id);
CREATE INDEX idx_account_hold_status ON account_hold(status);
CREATE UNIQUE INDEX idx_account_hold_reference ON account_hold(reference);

CREATE SEQUENCE account_hold_seq START WITH 1000;

-- =========================================================================
-- ACCOUNT MAINTENANCE LOG (audit trail)
-- =========================================================================
CREATE TABLE account_maintenance_log (
    id                  BIGSERIAL PRIMARY KEY,
    account_id          BIGINT NOT NULL REFERENCES account(id),
    action              VARCHAR(100) NOT NULL,
    field_changed       VARCHAR(100),
    old_value           VARCHAR(500),
    new_value           VARCHAR(500),
    details             VARCHAR(1000),
    performed_by        VARCHAR(100) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acct_maint_log_account ON account_maintenance_log(account_id);
CREATE INDEX idx_acct_maint_log_created ON account_maintenance_log(created_at);

-- =========================================================================
-- INTEREST POSTING HISTORY
-- =========================================================================
CREATE TABLE interest_posting_history (
    id                  BIGSERIAL PRIMARY KEY,
    account_id          BIGINT NOT NULL REFERENCES account(id),
    posting_date        DATE NOT NULL,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    rate                NUMERIC(8,4) NOT NULL,
    amount              NUMERIC(18,2) NOT NULL,
    days                INTEGER NOT NULL,
    transaction_ref     VARCHAR(40),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_int_posting_account ON interest_posting_history(account_id);
CREATE INDEX idx_int_posting_date ON interest_posting_history(posting_date);

-- =========================================================================
-- FACILITY COVENANTS
-- =========================================================================
CREATE TABLE facility_covenant (
    id                  BIGSERIAL PRIMARY KEY,
    facility_id         BIGINT NOT NULL REFERENCES credit_facility(id),
    covenant_name       VARCHAR(200) NOT NULL,
    threshold           VARCHAR(100) NOT NULL,
    current_value       VARCHAR(100),
    compliance          VARCHAR(20) NOT NULL DEFAULT 'COMPLIANT',
    next_test_date      DATE,
    last_tested_date    DATE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_facility_covenant_facility ON facility_covenant(facility_id);

-- =========================================================================
-- PAYMENT BENEFICIARIES
-- =========================================================================
CREATE TABLE beneficiary (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES customer(id),
    beneficiary_name    VARCHAR(200) NOT NULL,
    account_number      VARCHAR(30) NOT NULL,
    bank_code           VARCHAR(20) NOT NULL,
    bank_name           VARCHAR(200),
    currency_code       VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_beneficiary_customer ON beneficiary(customer_id);

-- =========================================================================
-- BANK DIRECTORY
-- =========================================================================
CREATE TABLE bank_directory (
    id                  BIGSERIAL PRIMARY KEY,
    bank_code           VARCHAR(20) NOT NULL UNIQUE,
    bank_name           VARCHAR(200) NOT NULL,
    short_name          VARCHAR(50),
    swift_code          VARCHAR(11),
    nip_code            VARCHAR(10),
    country_code        VARCHAR(3) NOT NULL DEFAULT 'NGA',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bank_directory_code ON bank_directory(bank_code);

-- =========================================================================
-- ECL BATCH RUN TRACKING
-- =========================================================================
CREATE TABLE ecl_batch_run (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              VARCHAR(60) NOT NULL UNIQUE,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    run_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    total_loans         INTEGER NOT NULL DEFAULT 0,
    processed_loans     INTEGER NOT NULL DEFAULT 0,
    failed_loans        INTEGER NOT NULL DEFAULT 0,
    total_ecl           NUMERIC(18,2),
    triggered_by        VARCHAR(100),
    error_message       VARCHAR(1000),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_ecl_batch_run_date ON ecl_batch_run(run_date);

-- =========================================================================
-- ECL PROVISION MOVEMENT
-- =========================================================================
CREATE TABLE ecl_provision_movement (
    id                  BIGSERIAL PRIMARY KEY,
    run_date            DATE NOT NULL,
    label               VARCHAR(50) NOT NULL,
    stage1              NUMERIC(18,2) NOT NULL DEFAULT 0,
    stage2              NUMERIC(18,2) NOT NULL DEFAULT 0,
    stage3              NUMERIC(18,2) NOT NULL DEFAULT 0,
    total               NUMERIC(18,2) NOT NULL DEFAULT 0,
    is_total_row        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ecl_prov_mov_date ON ecl_provision_movement(run_date);

-- =========================================================================
-- ECL PD TERM STRUCTURE
-- =========================================================================
CREATE TABLE ecl_pd_term_structure (
    id                  BIGSERIAL PRIMARY KEY,
    rating_grade        VARCHAR(20) NOT NULL,
    tenor_1y            NUMERIC(10,6) NOT NULL DEFAULT 0,
    tenor_3y            NUMERIC(10,6) NOT NULL DEFAULT 0,
    tenor_5y            NUMERIC(10,6) NOT NULL DEFAULT 0,
    tenor_10y           NUMERIC(10,6) NOT NULL DEFAULT 0,
    effective_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_ecl_pd_ts_grade ON ecl_pd_term_structure(rating_grade, effective_date);

-- =========================================================================
-- SERVICE REQUESTS (portal self-service)
-- =========================================================================
CREATE TABLE service_request (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES customer(id),
    request_type        VARCHAR(50) NOT NULL,
    description         VARCHAR(1000) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolution          VARCHAR(1000),
    assigned_to         VARCHAR(100),
    resolved_by         VARCHAR(100),
    resolved_at         TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_service_request_customer ON service_request(customer_id);
CREATE INDEX idx_service_request_status ON service_request(status);

-- =========================================================================
-- Seed bank directory with Nigerian banks
-- =========================================================================
INSERT INTO bank_directory (bank_code, bank_name, short_name, nip_code) VALUES
('044', 'Access Bank Plc', 'Access Bank', '044'),
('023', 'Citibank Nigeria Limited', 'Citibank', '023'),
('063', 'Diamond Bank Plc', 'Diamond Bank', '063'),
('050', 'Ecobank Nigeria', 'Ecobank', '050'),
('070', 'Fidelity Bank Plc', 'Fidelity Bank', '070'),
('011', 'First Bank of Nigeria', 'First Bank', '011'),
('214', 'First City Monument Bank', 'FCMB', '214'),
('058', 'Guaranty Trust Bank', 'GTBank', '058'),
('030', 'Heritage Bank Plc', 'Heritage Bank', '030'),
('301', 'Jaiz Bank Plc', 'Jaiz Bank', '301'),
('082', 'Keystone Bank Limited', 'Keystone Bank', '082'),
('076', 'Polaris Bank Limited', 'Polaris Bank', '076'),
('101', 'Providus Bank Limited', 'Providus Bank', '101'),
('221', 'Stanbic IBTC Bank', 'Stanbic IBTC', '221'),
('068', 'Standard Chartered Bank', 'StanChart', '068'),
('232', 'Sterling Bank Plc', 'Sterling Bank', '232'),
('100', 'SunTrust Bank Nigeria', 'SunTrust', '100'),
('032', 'Union Bank of Nigeria', 'Union Bank', '032'),
('033', 'United Bank for Africa', 'UBA', '033'),
('215', 'Unity Bank Plc', 'Unity Bank', '215'),
('035', 'Wema Bank Plc', 'Wema Bank', '035'),
('057', 'Zenith Bank Plc', 'Zenith Bank', '057');
