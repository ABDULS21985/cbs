ALTER TABLE cbs.wakala_deposit_account
    ADD COLUMN IF NOT EXISTS bank_negligent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS payout_account_id BIGINT,
    ADD COLUMN IF NOT EXISTS matured_at DATE,
    ADD COLUMN IF NOT EXISTS early_withdrawn_at DATE,
    ADD COLUMN IF NOT EXISTS early_withdrawal_reason TEXT;