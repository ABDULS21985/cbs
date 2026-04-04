SET search_path TO cbs;

-- Align profit distribution tables with AuditableEntity-backed JPA mappings.

ALTER TABLE IF EXISTS pool_asset_assignment
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE IF EXISTS pool_profit_calculation
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE IF EXISTS profit_distribution_run
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
