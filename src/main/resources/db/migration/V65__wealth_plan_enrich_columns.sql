-- Add missing columns to wealth_management_plan to support frontend WealthPlan type

ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS customer_name       VARCHAR(200);
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS advisor_name        VARCHAR(200);
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS risk_profile        VARCHAR(30);
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS investment_horizon  INTEGER;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS goals               JSONB;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS allocations         JSONB;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS target_allocation   JSONB;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS current_allocation  JSONB;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS activated_date      DATE;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS last_review_date    DATE;
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS ytd_return          NUMERIC(10,4);
ALTER TABLE wealth_management_plan ADD COLUMN IF NOT EXISTS benchmark_return    NUMERIC(10,4);
