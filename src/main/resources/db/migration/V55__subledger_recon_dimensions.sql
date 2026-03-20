ALTER TABLE cbs.subledger_recon_run
    ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20) NOT NULL DEFAULT 'HEAD',
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) NOT NULL DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_subledger_recon_run_dimensions
    ON cbs.subledger_recon_run (recon_date, subledger_type, gl_code, branch_code, currency_code);
