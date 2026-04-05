-- Add missing profit metric columns to treasury_analytics_snapshot
ALTER TABLE treasury_analytics_snapshot ADD COLUMN IF NOT EXISTS net_profit_margin_pct NUMERIC(6,4);
ALTER TABLE treasury_analytics_snapshot ADD COLUMN IF NOT EXISTS profit_spread_pct NUMERIC(6,4);
