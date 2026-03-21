ALTER TABLE cbs.beneficiary
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
