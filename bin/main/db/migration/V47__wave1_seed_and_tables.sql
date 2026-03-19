SET search_path TO cbs;

-- =====================================================
-- V47: Wave 1 — Seed Data + New Tables for Critical Path
-- =====================================================

-- =============================================================
-- 1. Bill Favorites Table
-- =============================================================

CREATE TABLE IF NOT EXISTS bill_favorite (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT         NOT NULL,
    biller_id           BIGINT         NOT NULL,
    biller_customer_id  VARCHAR(50)    NOT NULL,
    nickname            VARCHAR(100),
    created_by          VARCHAR(100),
    created_at          TIMESTAMP      NOT NULL DEFAULT now(),
    version             BIGINT         DEFAULT 0,
    UNIQUE(customer_id, biller_id, biller_customer_id)
);
CREATE INDEX IF NOT EXISTS idx_billfav_customer ON bill_favorite(customer_id);

-- =============================================================
-- 2. Bulk Payment Tables
-- =============================================================

CREATE TABLE IF NOT EXISTS bulk_payment_batch (
    id                      BIGSERIAL PRIMARY KEY,
    batch_ref               VARCHAR(30)    NOT NULL UNIQUE,
    batch_name              VARCHAR(200),
    uploaded_by             VARCHAR(100)   NOT NULL,
    upload_file_name        VARCHAR(300),
    total_records           INT            NOT NULL DEFAULT 0,
    valid_records           INT            DEFAULT 0,
    invalid_records         INT            DEFAULT 0,
    processed_records       INT            DEFAULT 0,
    failed_records          INT            DEFAULT 0,
    total_amount            NUMERIC(20,4)  DEFAULT 0,
    currency_code           VARCHAR(3)     DEFAULT 'NGN',
    debit_account_number    VARCHAR(34),
    batch_type              VARCHAR(20)    NOT NULL DEFAULT 'PAYMENT'
        CHECK (batch_type IN ('PAYMENT','PAYROLL','VENDOR','TAX','DIVIDEND')),
    approved_by             VARCHAR(100),
    approved_at             TIMESTAMP,
    rejected_by             VARCHAR(100),
    rejected_at             TIMESTAMP,
    rejection_reason        TEXT,
    processing_started_at   TIMESTAMP,
    processing_completed_at TIMESTAMP,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'UPLOADED'
        CHECK (status IN ('UPLOADED','VALIDATING','VALIDATED','VALIDATION_FAILED','SUBMITTED','APPROVED','REJECTED','PROCESSING','COMPLETED','PARTIALLY_COMPLETED','FAILED')),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT now(),
    version                 BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bulkbatch_status ON bulk_payment_batch(status, created_at DESC);

CREATE TABLE IF NOT EXISTS bulk_payment_item (
    id                      BIGSERIAL PRIMARY KEY,
    batch_id                BIGINT         NOT NULL REFERENCES bulk_payment_batch(id),
    row_number              INT            NOT NULL,
    credit_account_number   VARCHAR(34)    NOT NULL,
    credit_account_name     VARCHAR(200),
    credit_bank_code        VARCHAR(20),
    amount                  NUMERIC(18,2)  NOT NULL,
    currency_code           VARCHAR(3)     DEFAULT 'NGN',
    narration               VARCHAR(300),
    payment_ref             VARCHAR(40),
    validation_errors       JSONB,
    transaction_ref         VARCHAR(40),
    failure_reason          VARCHAR(300),
    processed_at            TIMESTAMP,
    status                  VARCHAR(15)    NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','VALID','INVALID','PROCESSING','COMPLETED','FAILED')),
    created_at              TIMESTAMP      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bulkitem_batch ON bulk_payment_item(batch_id, status);

-- =============================================================
-- 3. Approval Delegation Table (extends existing workflow)
-- =============================================================

CREATE TABLE IF NOT EXISTS approval_delegation (
    id                  BIGSERIAL PRIMARY KEY,
    delegator           VARCHAR(100)   NOT NULL,
    delegate            VARCHAR(100)   NOT NULL,
    reason              VARCHAR(500),
    effective_from      TIMESTAMP      NOT NULL,
    effective_to        TIMESTAMP      NOT NULL,
    entity_types        JSONB,
    cancelled_at        TIMESTAMP,
    cancelled_by        VARCHAR(100),
    status              VARCHAR(15)    NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED')),
    created_by          VARCHAR(100),
    created_at          TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT now(),
    version             BIGINT         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_appdel_delegate ON approval_delegation(delegate, status);

-- =============================================================
-- 4. Seed Data — Account Products
-- =============================================================

INSERT INTO account_product (product_code, product_name, product_category, currency_code, minimum_balance, interest_rate, is_active, created_at, updated_at, version)
VALUES
    ('SAVINGS_BASIC', 'Basic Savings Account', 'SAVINGS', 'NGN', 1000.00, 3.50, true, now(), now(), 0),
    ('SAVINGS_PREMIUM', 'Premium Savings Account', 'SAVINGS', 'NGN', 50000.00, 5.00, true, now(), now(), 0),
    ('CURRENT_STD', 'Standard Current Account', 'CURRENT', 'NGN', 5000.00, 0.00, true, now(), now(), 0),
    ('CURRENT_PREMIUM', 'Premium Current Account', 'CURRENT', 'NGN', 100000.00, 0.50, true, now(), now(), 0),
    ('CURRENT_CORPORATE', 'Corporate Current Account', 'CURRENT', 'NGN', 500000.00, 0.00, true, now(), now(), 0),
    ('DOMICILIARY_USD', 'US Dollar Domiciliary Account', 'DOMICILIARY', 'USD', 100.00, 0.00, true, now(), now(), 0),
    ('DOMICILIARY_EUR', 'Euro Domiciliary Account', 'DOMICILIARY', 'EUR', 100.00, 0.00, true, now(), now(), 0),
    ('DOMICILIARY_GBP', 'British Pound Domiciliary Account', 'DOMICILIARY', 'GBP', 100.00, 0.00, true, now(), now(), 0)
ON CONFLICT (product_code) DO NOTHING;

-- =============================================================
-- 5. Seed Data — Loan Products
-- =============================================================

INSERT INTO loan_product (product_code, product_name, product_type, currency_code, min_amount, max_amount, min_tenure_months, max_tenure_months, base_interest_rate, interest_calculation_method, repayment_frequency, is_active, created_at, updated_at, version)
VALUES
    ('PERSONAL_LOAN', 'Personal Loan', 'TERM', 'NGN', 50000, 10000000, 3, 60, 18.00, 'REDUCING_BALANCE', 'MONTHLY', true, now(), now(), 0),
    ('BUSINESS_LOAN', 'Business Loan', 'TERM', 'NGN', 500000, 100000000, 6, 120, 15.00, 'REDUCING_BALANCE', 'MONTHLY', true, now(), now(), 0),
    ('SME_WORKING_CAPITAL', 'SME Working Capital', 'REVOLVING', 'NGN', 100000, 50000000, 3, 24, 20.00, 'REDUCING_BALANCE', 'MONTHLY', true, now(), now(), 0),
    ('MORTGAGE_STD', 'Standard Mortgage', 'TERM', 'NGN', 5000000, 500000000, 60, 360, 12.00, 'REDUCING_BALANCE', 'MONTHLY', true, now(), now(), 0),
    ('OVERDRAFT_FACILITY', 'Overdraft Facility', 'REVOLVING', 'NGN', 50000, 20000000, 1, 12, 22.00, 'FLAT', 'MONTHLY', true, now(), now(), 0),
    ('ISLAMIC_MURABAHA', 'Islamic Murabaha Financing', 'ISLAMIC', 'NGN', 100000, 50000000, 6, 120, 16.00, 'REDUCING_BALANCE', 'MONTHLY', true, now(), now(), 0),
    ('SALARY_ADVANCE', 'Salary Advance', 'TERM', 'NGN', 10000, 5000000, 1, 12, 15.00, 'FLAT', 'MONTHLY', true, now(), now(), 0),
    ('ASSET_FINANCE', 'Asset Finance Loan', 'TERM', 'NGN', 1000000, 200000000, 12, 84, 14.00, 'REDUCING_BALANCE', 'MONTHLY', true, now(), now(), 0)
ON CONFLICT (product_code) DO NOTHING;

-- =============================================================
-- 6. Seed Data — Fee Definitions
-- =============================================================

INSERT INTO fee_definition (fee_code, fee_name, fee_type, calculation_method, flat_amount, percentage_rate, currency_code, is_active, created_at, updated_at, version)
VALUES
    ('TRANSFER_FEE', 'Internal Transfer Fee', 'TRANSACTION', 'FLAT', 50.00, NULL, 'NGN', true, now(), now(), 0),
    ('DOMESTIC_TRANSFER', 'Domestic Transfer Fee', 'TRANSACTION', 'TIERED', NULL, NULL, 'NGN', true, now(), now(), 0),
    ('SWIFT_TRANSFER', 'SWIFT Transfer Fee', 'TRANSACTION', 'FLAT', 5000.00, NULL, 'NGN', true, now(), now(), 0),
    ('ACCOUNT_MAINTENANCE', 'Account Maintenance Fee', 'PERIODIC', 'FLAT', 100.00, NULL, 'NGN', true, now(), now(), 0),
    ('CARD_ISSUANCE', 'Card Issuance Fee', 'ONE_TIME', 'FLAT', 1500.00, NULL, 'NGN', true, now(), now(), 0),
    ('CHEQUE_BOOK', 'Cheque Book Fee', 'ONE_TIME', 'FLAT', 2500.00, NULL, 'NGN', true, now(), now(), 0),
    ('SMS_ALERT', 'SMS Alert Fee', 'PERIODIC', 'FLAT', 50.00, NULL, 'NGN', true, now(), now(), 0),
    ('COT', 'Commission on Turnover', 'TRANSACTION', 'PERCENTAGE', NULL, 0.50, 'NGN', true, now(), now(), 0)
ON CONFLICT (fee_code) DO NOTHING;

-- =============================================================
-- 7. Seed Data — Branches
-- =============================================================

INSERT INTO branch (branch_code, branch_name, region, address, city, state, country, phone, email, is_active, created_at, updated_at, version)
VALUES
    ('BR001', 'Lagos Main Branch', 'SOUTH_WEST', '123 Marina Road', 'Lagos', 'Lagos', 'NG', '+2341234567', 'lagos.main@cbs.com', true, now(), now(), 0),
    ('BR002', 'Victoria Island Branch', 'SOUTH_WEST', '45 Adeola Odeku', 'Lagos', 'Lagos', 'NG', '+2341234568', 'vi@cbs.com', true, now(), now(), 0),
    ('BR003', 'Abuja Central Branch', 'NORTH_CENTRAL', '10 Constitution Avenue', 'Abuja', 'FCT', 'NG', '+2349876543', 'abuja@cbs.com', true, now(), now(), 0),
    ('BR004', 'Port Harcourt Branch', 'SOUTH_SOUTH', '77 Aba Road', 'Port Harcourt', 'Rivers', 'NG', '+2348765432', 'phc@cbs.com', true, now(), now(), 0),
    ('BR005', 'Kano Branch', 'NORTH_WEST', '33 Murtala Mohammed Way', 'Kano', 'Kano', 'NG', '+2347654321', 'kano@cbs.com', true, now(), now(), 0),
    ('BR006', 'Ibadan Branch', 'SOUTH_WEST', '15 Ring Road', 'Ibadan', 'Oyo', 'NG', '+2346543210', 'ibadan@cbs.com', true, now(), now(), 0),
    ('BR007', 'Enugu Branch', 'SOUTH_EAST', '22 Ogui Road', 'Enugu', 'Enugu', 'NG', '+2345432109', 'enugu@cbs.com', true, now(), now(), 0),
    ('BR008', 'Kaduna Branch', 'NORTH_WEST', '8 Ahmadu Bello Way', 'Kaduna', 'Kaduna', 'NG', '+2344321098', 'kaduna@cbs.com', true, now(), now(), 0),
    ('BR009', 'Benin City Branch', 'SOUTH_SOUTH', '5 Airport Road', 'Benin City', 'Edo', 'NG', '+2343210987', 'benin@cbs.com', true, now(), now(), 0),
    ('BR010', 'Ikoyi Branch', 'SOUTH_WEST', '99 Alfred Rewane Road', 'Lagos', 'Lagos', 'NG', '+2342109876', 'ikoyi@cbs.com', true, now(), now(), 0)
ON CONFLICT (branch_code) DO NOTHING;

-- =============================================================
-- 8. Seed Data — Billers & Categories
-- =============================================================

INSERT INTO biller (biller_code, biller_name, biller_category, currency_code, flat_fee, percentage_fee, is_active, customer_id_label, created_at, updated_at, version)
VALUES
    ('DSTV', 'DStv Subscription', 'CABLE_TV', 'NGN', 100.00, 0, true, 'Smartcard Number', now(), now(), 0),
    ('GOTV', 'GOtv Subscription', 'CABLE_TV', 'NGN', 100.00, 0, true, 'IUC Number', now(), now(), 0),
    ('STARTIMES', 'StarTimes Subscription', 'CABLE_TV', 'NGN', 100.00, 0, true, 'Smartcard Number', now(), now(), 0),
    ('IKEDC', 'Ikeja Electricity', 'ELECTRICITY', 'NGN', 100.00, 0, true, 'Meter Number', now(), now(), 0),
    ('EKEDC', 'Eko Electricity', 'ELECTRICITY', 'NGN', 100.00, 0, true, 'Meter Number', now(), now(), 0),
    ('AEDC', 'Abuja Electricity', 'ELECTRICITY', 'NGN', 100.00, 0, true, 'Meter Number', now(), now(), 0),
    ('MTN_AIRTIME', 'MTN Airtime', 'AIRTIME', 'NGN', 0, 0, true, 'Phone Number', now(), now(), 0),
    ('AIRTEL_AIRTIME', 'Airtel Airtime', 'AIRTIME', 'NGN', 0, 0, true, 'Phone Number', now(), now(), 0),
    ('GLO_AIRTIME', 'Glo Airtime', 'AIRTIME', 'NGN', 0, 0, true, 'Phone Number', now(), now(), 0),
    ('9MOBILE_AIRTIME', '9mobile Airtime', 'AIRTIME', 'NGN', 0, 0, true, 'Phone Number', now(), now(), 0),
    ('MTN_DATA', 'MTN Data Bundle', 'DATA', 'NGN', 0, 0, true, 'Phone Number', now(), now(), 0),
    ('AIRTEL_DATA', 'Airtel Data Bundle', 'DATA', 'NGN', 0, 0, true, 'Phone Number', now(), now(), 0),
    ('WAEC', 'WAEC Result Checker', 'EDUCATION', 'NGN', 0, 0, true, 'Registration Number', now(), now(), 0),
    ('JAMB', 'JAMB Registration', 'EDUCATION', 'NGN', 0, 0, true, 'Registration Number', now(), now(), 0),
    ('LCC', 'Lekki Toll (LCC)', 'TOLL', 'NGN', 0, 0, true, 'Tag Number', now(), now(), 0)
ON CONFLICT (biller_code) DO NOTHING;

-- =============================================================
-- 9. Seed Data — Customer Segments
-- =============================================================

INSERT INTO segment (segment_code, segment_name, description, criteria, is_active, created_at, updated_at, version)
VALUES
    ('MASS_MARKET', 'Mass Market', 'Retail customers with standard banking needs', '{"minBalance": 0, "maxBalance": 500000}', true, now(), now(), 0),
    ('AFFLUENT', 'Affluent', 'High-value retail customers', '{"minBalance": 500000, "maxBalance": 10000000}', true, now(), now(), 0),
    ('HNI', 'High Net Worth Individual', 'Ultra high-value retail customers', '{"minBalance": 10000000}', true, now(), now(), 0),
    ('CORPORATE', 'Corporate', 'Corporate banking customers', '{"customerType": "CORPORATE"}', true, now(), now(), 0),
    ('SME', 'Small & Medium Enterprise', 'SME business customers', '{"customerType": "SME"}', true, now(), now(), 0),
    ('YOUTH', 'Youth Banking', 'Customers under 25', '{"maxAge": 25}', true, now(), now(), 0)
ON CONFLICT (segment_code) DO NOTHING;
