-- Add missing column to lease_contract for depreciation tracking
ALTER TABLE lease_contract ADD COLUMN IF NOT EXISTS last_depreciation_month VARCHAR(7);
