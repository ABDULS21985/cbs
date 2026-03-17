-- V24: Lending Extensions — BIAN Gap Remediation Batch 19
-- Mortgage Loan, Leasing, Virtual Accounts, Merchandising/POS Lending, Term Deposit Framework

SET search_path TO cbs;

-- ============================================================
-- BIAN SD: Mortgage Loan
-- ============================================================
CREATE TABLE IF NOT EXISTS mortgage_loan (
    id                      BIGSERIAL PRIMARY KEY,
    mortgage_number         VARCHAR(30)  NOT NULL UNIQUE,
    loan_application_id     BIGINT,
    customer_id             BIGINT       NOT NULL,
    account_id              BIGINT       NOT NULL,
    mortgage_type           VARCHAR(30)  NOT NULL
                            CHECK (mortgage_type IN ('RESIDENTIAL','BUY_TO_LET','COMMERCIAL','CONSTRUCTION',
                                   'EQUITY_RELEASE','BRIDGING','SHARED_OWNERSHIP','RIGHT_TO_BUY','ISLAMIC_DIMINISHING_MUSHARAKAH')),
    repayment_type          VARCHAR(20)  NOT NULL
                            CHECK (repayment_type IN ('CAPITAL_AND_INTEREST','INTEREST_ONLY','PART_AND_PART','OFFSET')),
    rate_type               VARCHAR(20)  NOT NULL
                            CHECK (rate_type IN ('FIXED','VARIABLE','TRACKER','DISCOUNTED','CAPPED','STEPPED')),
    -- Property
    property_address        TEXT         NOT NULL,
    property_type           VARCHAR(30)  NOT NULL
                            CHECK (property_type IN ('DETACHED','SEMI_DETACHED','TERRACED','FLAT','BUNGALOW',
                                   'MAISONETTE','STUDIO','LAND','COMMERCIAL','MIXED_USE','NEW_BUILD','OFF_PLAN')),
    property_valuation      NUMERIC(20,4) NOT NULL,
    valuation_date          DATE         NOT NULL,
    valuation_type          VARCHAR(20)  NOT NULL DEFAULT 'FULL'
                            CHECK (valuation_type IN ('FULL','DESKTOP','AVM','DRIVE_BY')),
    purchase_price          NUMERIC(20,4),
    -- Loan terms
    principal_amount        NUMERIC(20,4) NOT NULL,
    current_balance         NUMERIC(20,4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    ltv_at_origination      NUMERIC(6,2) NOT NULL,  -- Loan-to-Value %
    current_ltv             NUMERIC(6,2),
    interest_rate           NUMERIC(8,4) NOT NULL,
    base_rate_reference     VARCHAR(30),   -- e.g. 'SONIA','SOFR','CBN_MPR','EURIBOR'
    margin_over_base        NUMERIC(6,4),
    fixed_rate_end_date     DATE,          -- when fixed period ends
    reversion_rate          NUMERIC(8,4),  -- SVR after fixed period
    term_months             INT          NOT NULL,
    remaining_months        INT,
    monthly_payment         NUMERIC(15,4),
    -- Insurance & fees
    title_insurance_ref     VARCHAR(80),
    building_insurance_ref  VARCHAR(80),
    stamp_duty_amount       NUMERIC(15,4),
    arrangement_fee         NUMERIC(12,4),
    early_repayment_charge  NUMERIC(6,2),  -- percentage
    erc_end_date            DATE,
    -- Stages
    status                  VARCHAR(20)  NOT NULL DEFAULT 'APPLICATION'
                            CHECK (status IN ('APPLICATION','VALUATION','OFFER','LEGAL','COMPLETION',
                                   'ACTIVE','ARREARS','DEFAULT','FORECLOSURE','REDEEMED','PORTED')),
    completion_date         DATE,
    first_payment_date      DATE,
    maturity_date           DATE,
    -- Portability
    is_portable             BOOLEAN      NOT NULL DEFAULT FALSE,
    ported_from_property    TEXT,
    -- Overpayment
    annual_overpayment_pct  NUMERIC(5,2) DEFAULT 10.00,  -- typical 10% allowed
    overpayments_ytd        NUMERIC(15,4) DEFAULT 0,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_mortgage_customer ON mortgage_loan(customer_id, status);
CREATE INDEX idx_mortgage_property ON mortgage_loan(property_type, status);

-- ============================================================
-- BIAN SD: Leasing / Corporate Lease / Leasing Item Admin
-- ============================================================
CREATE TABLE IF NOT EXISTS lease_contract (
    id                      BIGSERIAL PRIMARY KEY,
    lease_number            VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    account_id              BIGINT       NOT NULL,
    lease_type              VARCHAR(30)  NOT NULL
                            CHECK (lease_type IN ('FINANCE_LEASE','OPERATING_LEASE','SALE_AND_LEASEBACK',
                                   'HIRE_PURCHASE','IJARA','IJARA_WA_IQTINA','SYNTHETIC_LEASE','LEVERAGE_LEASE')),
    ifrs16_classification   VARCHAR(20)  NOT NULL DEFAULT 'RIGHT_OF_USE'
                            CHECK (ifrs16_classification IN ('RIGHT_OF_USE','SHORT_TERM','LOW_VALUE','EXEMPT')),
    -- Asset
    asset_category          VARCHAR(30)  NOT NULL
                            CHECK (asset_category IN ('VEHICLE','HEAVY_EQUIPMENT','IT_EQUIPMENT','OFFICE_FURNITURE',
                                   'REAL_ESTATE','AIRCRAFT','VESSEL','MEDICAL_EQUIPMENT','INDUSTRIAL_MACHINERY',
                                   'AGRICULTURAL','SOLAR_ENERGY','TELECOM_INFRASTRUCTURE')),
    asset_description       TEXT         NOT NULL,
    asset_serial_number     VARCHAR(100),
    asset_make_model        VARCHAR(200),
    asset_year              INT,
    asset_location          TEXT,
    asset_fair_value        NUMERIC(20,4) NOT NULL,
    residual_value          NUMERIC(20,4) NOT NULL DEFAULT 0,
    useful_life_months      INT,
    depreciation_method     VARCHAR(20)  DEFAULT 'STRAIGHT_LINE'
                            CHECK (depreciation_method IN ('STRAIGHT_LINE','DECLINING_BALANCE','UNITS_OF_PRODUCTION','SUM_OF_YEARS')),
    -- Financial terms
    principal_amount        NUMERIC(20,4) NOT NULL,  -- financed amount
    current_balance         NUMERIC(20,4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    implicit_rate           NUMERIC(8,4) NOT NULL,    -- lease implicit interest rate
    incremental_borrowing_rate NUMERIC(8,4),          -- IFRS 16 fallback
    term_months             INT          NOT NULL,
    payment_frequency       VARCHAR(15)  NOT NULL DEFAULT 'MONTHLY'
                            CHECK (payment_frequency IN ('MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL')),
    periodic_payment        NUMERIC(15,4) NOT NULL,
    advance_payments        INT          DEFAULT 0,    -- number of payments in advance
    security_deposit        NUMERIC(15,4) DEFAULT 0,
    purchase_option_price   NUMERIC(15,4),             -- buyout at end
    -- IFRS 16 accounting
    rou_asset_amount        NUMERIC(20,4),  -- right-of-use asset
    lease_liability         NUMERIC(20,4),  -- present value of payments
    accumulated_depreciation NUMERIC(20,4) DEFAULT 0,
    interest_expense_ytd    NUMERIC(15,4) DEFAULT 0,
    -- Insurance & maintenance
    insurance_required      BOOLEAN      NOT NULL DEFAULT TRUE,
    maintenance_included    BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Status
    status                  VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','APPROVED','ACTIVE','ARREARS','DEFAULT',
                                   'EARLY_TERMINATED','MATURED','BUYOUT_EXERCISED')),
    commencement_date       DATE,
    maturity_date           DATE,
    early_termination_fee   NUMERIC(6,2),  -- percentage of remaining
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_lease_customer ON lease_contract(customer_id, status);
CREATE INDEX idx_lease_asset ON lease_contract(asset_category, status);

-- ============================================================
-- BIAN SD: Virtual Account
-- ============================================================
CREATE TABLE IF NOT EXISTS virtual_account (
    id                      BIGSERIAL PRIMARY KEY,
    virtual_account_number  VARCHAR(30)  NOT NULL UNIQUE,
    master_account_id       BIGINT       NOT NULL,  -- references account
    customer_id             BIGINT       NOT NULL,
    account_name            VARCHAR(200) NOT NULL,
    account_purpose         VARCHAR(40)  NOT NULL
                            CHECK (account_purpose IN ('COLLECTIONS','PAYMENTS','RECONCILIATION','SEGREGATION',
                                   'PROJECT','DEPARTMENT','SUBSIDIARY','CLIENT_MONEY','ESCROW_VIRTUAL',
                                   'SUPPLIER_PAYMENT','PAYROLL','TAX_RESERVE')),
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    virtual_balance         NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Auto-sweep to/from master
    auto_sweep_enabled      BOOLEAN      NOT NULL DEFAULT FALSE,
    sweep_threshold         NUMERIC(20,4),             -- sweep when exceeds this
    sweep_target_balance    NUMERIC(20,4),             -- sweep down to this level
    sweep_direction         VARCHAR(10)  DEFAULT 'TO_MASTER'
                            CHECK (sweep_direction IN ('TO_MASTER','FROM_MASTER','BIDIRECTIONAL')),
    -- Reference mapping
    external_reference      VARCHAR(100),  -- e.g. invoice number, project code, vendor ID
    reference_pattern       VARCHAR(100),  -- regex for auto-matching incoming payments
    -- Status
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_virtual_master ON virtual_account(master_account_id, is_active);
CREATE INDEX idx_virtual_customer ON virtual_account(customer_id, is_active);
CREATE INDEX idx_virtual_reference ON virtual_account(external_reference);

-- ============================================================
-- BIAN SD: Merchandising Loan (POS / Point-of-Sale Lending)
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_loan (
    id                      BIGSERIAL PRIMARY KEY,
    pos_loan_number         VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    account_id              BIGINT       NOT NULL,
    merchant_id             VARCHAR(80)  NOT NULL,
    merchant_name           VARCHAR(200) NOT NULL,
    merchant_category       VARCHAR(40)  NOT NULL
                            CHECK (merchant_category IN ('ELECTRONICS','FURNITURE','APPLIANCES','AUTOMOTIVE',
                                   'HEALTHCARE','EDUCATION','TRAVEL','HOME_IMPROVEMENT','FASHION','GENERAL_RETAIL')),
    -- Purchase
    item_description        TEXT         NOT NULL,
    purchase_amount         NUMERIC(15,4) NOT NULL,
    down_payment            NUMERIC(15,4) NOT NULL DEFAULT 0,
    financed_amount         NUMERIC(15,4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    -- Terms
    interest_rate           NUMERIC(8,4) NOT NULL,
    is_zero_interest        BOOLEAN      NOT NULL DEFAULT FALSE,  -- merchant-subsidized
    merchant_subsidy_pct    NUMERIC(6,2) DEFAULT 0,               -- merchant pays this portion
    term_months             INT          NOT NULL,
    monthly_payment         NUMERIC(12,4) NOT NULL,
    -- BNPL features
    deferred_payment_months INT          DEFAULT 0,  -- "buy now, pay later" deferral
    promotional_rate        NUMERIC(8,4),
    promotional_end_date    DATE,
    revert_rate             NUMERIC(8,4),
    -- Status
    status                  VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','APPROVED','ACTIVE','DEFERRED','ARREARS',
                                   'DEFAULT','SETTLED','CANCELLED','RETURNED')),
    disbursed_to_merchant   BOOLEAN      NOT NULL DEFAULT FALSE,
    disbursement_date       DATE,
    maturity_date           DATE,
    settlement_date         DATE,
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_loan_customer ON pos_loan(customer_id, status);
CREATE INDEX idx_pos_loan_merchant ON pos_loan(merchant_id, status);

-- ============================================================
-- BIAN SD: Term Deposit Framework Agreement
-- ============================================================
CREATE TABLE IF NOT EXISTS td_framework_agreement (
    id                      BIGSERIAL PRIMARY KEY,
    agreement_number        VARCHAR(30)  NOT NULL UNIQUE,
    customer_id             BIGINT       NOT NULL,
    agreement_type          VARCHAR(30)  NOT NULL
                            CHECK (agreement_type IN ('STANDARD','PREMIUM','CORPORATE','INSTITUTIONAL',
                                   'GOVERNMENT','AUTO_ROLLOVER','CALLABLE','STRUCTURED')),
    -- Terms
    currency                VARCHAR(3)   NOT NULL DEFAULT 'USD',
    min_deposit_amount      NUMERIC(20,4) NOT NULL,
    max_deposit_amount      NUMERIC(20,4),
    min_tenor_days          INT          NOT NULL DEFAULT 30,
    max_tenor_days          INT          DEFAULT 3650,
    -- Rate tiers
    rate_structure          VARCHAR(20)  NOT NULL DEFAULT 'FIXED'
                            CHECK (rate_structure IN ('FIXED','TIERED','NEGOTIATED','BENCHMARK_LINKED')),
    base_rate               NUMERIC(8,4),
    rate_tiers              JSONB,       -- [{"min_amount":100000,"max_amount":500000,"rate":5.5},...]
    benchmark_reference     VARCHAR(30), -- e.g. 'SOFR_3M', 'LIBOR_6M'
    spread_over_benchmark   NUMERIC(6,4),
    -- Auto-rollover
    auto_rollover_enabled   BOOLEAN      NOT NULL DEFAULT FALSE,
    rollover_tenor_days     INT,
    rollover_rate_type      VARCHAR(20)  DEFAULT 'PREVAILING'
                            CHECK (rollover_rate_type IN ('PREVAILING','AGREED','BENCHMARK_LINKED')),
    maturity_instruction    VARCHAR(20)  DEFAULT 'CREDIT_ACCOUNT'
                            CHECK (maturity_instruction IN ('CREDIT_ACCOUNT','ROLLOVER_PRINCIPAL','ROLLOVER_ALL','NOTIFY_ONLY')),
    -- Withdrawal
    early_withdrawal_allowed BOOLEAN     NOT NULL DEFAULT FALSE,
    early_withdrawal_penalty_pct NUMERIC(6,2),
    partial_withdrawal_allowed BOOLEAN   NOT NULL DEFAULT FALSE,
    partial_withdrawal_min  NUMERIC(15,4),
    -- Status
    status                  VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','SUSPENDED','EXPIRED','TERMINATED')),
    effective_from          DATE         NOT NULL,
    effective_to            DATE,
    approved_by             VARCHAR(80),
    created_at              TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_td_framework_customer ON td_framework_agreement(customer_id, status);
