SET search_path TO cbs;

-- Align legacy tables with AuditableEntity after those entities adopted shared audit metadata.
ALTER TABLE IF EXISTS quote_request
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE IF EXISTS investment_portfolio
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
