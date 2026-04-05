ALTER TABLE cbs.shariah_compliance_alert
    ADD COLUMN IF NOT EXISTS escalation_reason VARCHAR(1000);