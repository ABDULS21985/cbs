SET search_path TO cbs;

-- ---------------------------------------------------------------------------
-- Qard Hasan accounts and repayment schedules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS qard_hasan_account (
    id                              BIGSERIAL PRIMARY KEY,
    account_id                      BIGINT NOT NULL UNIQUE REFERENCES account(id),
    qard_type                       VARCHAR(20) NOT NULL
                                        CHECK (qard_type IN ('DEPOSIT_QARD', 'LENDING_QARD')),
    contract_reference              VARCHAR(50) NOT NULL UNIQUE,
    contract_signed_date            DATE,
    islamic_product_template_id     BIGINT,
    contract_type_code              VARCHAR(30) NOT NULL DEFAULT 'QARD',
    principal_guaranteed            BOOLEAN NOT NULL DEFAULT TRUE,
    no_return_disclosed             BOOLEAN NOT NULL DEFAULT TRUE,
    principal_amount                NUMERIC(18,2),
    outstanding_principal           NUMERIC(18,2),
    disbursement_date               DATE,
    maturity_date                   DATE,
    repayment_frequency             VARCHAR(20)
                                        CHECK (repayment_frequency IN ('MONTHLY', 'QUARTERLY', 'LUMP_SUM', 'ON_DEMAND')),
    installment_amount              NUMERIC(18,2),
    total_installments              INT,
    completed_installments          INT NOT NULL DEFAULT 0,
    missed_installments             INT NOT NULL DEFAULT 0,
    admin_fee_charged               BOOLEAN NOT NULL DEFAULT FALSE,
    admin_fee_amount                NUMERIC(18,2),
    admin_fee_justification         TEXT,
    purpose                         VARCHAR(30)
                                        CHECK (purpose IN (
                                            'SOCIAL_WELFARE', 'EMPLOYEE_LOAN', 'EDUCATION', 'MEDICAL',
                                            'EMERGENCY', 'WORKING_CAPITAL_MICRO', 'OTHER'
                                        )),
    purpose_description             TEXT,
    qard_status                     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                        CHECK (qard_status IN (
                                            'ACTIVE', 'REPAYING', 'FULLY_REPAID', 'DEFAULTED', 'WRITTEN_OFF', 'CANCELLED'
                                        )),
    last_repayment_date             DATE,
    last_repayment_amount           NUMERIC(18,2),
    settlement_account_id           BIGINT,
    tenant_id                       BIGINT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      VARCHAR(100),
    updated_by                      VARCHAR(100),
    version                         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS qard_repayment_schedule (
    id                  BIGSERIAL PRIMARY KEY,
    qard_account_id     BIGINT NOT NULL REFERENCES qard_hasan_account(id) ON DELETE CASCADE,
    installment_number  INT NOT NULL,
    due_date            DATE NOT NULL,
    principal_amount    NUMERIC(18,2) NOT NULL,
    paid_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    paid_date           DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'WAIVED')),
    transaction_ref     VARCHAR(40),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    version             BIGINT NOT NULL DEFAULT 0,
    UNIQUE (qard_account_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_qard_hasan_account_status
    ON qard_hasan_account (qard_status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_qard_hasan_account_maturity
    ON qard_hasan_account (maturity_date);

CREATE INDEX IF NOT EXISTS idx_qard_repayment_schedule_due_date
    ON qard_repayment_schedule (due_date, status);
CREATE INDEX IF NOT EXISTS idx_qard_repayment_schedule_qard_account
    ON qard_repayment_schedule (qard_account_id);
