SET search_path TO cbs;
-- V32: Safety net for Batch 26 tables (already created in V31)
-- All tables created with IF NOT EXISTS to avoid errors if already present
SELECT 1; -- no-op since V31 already created all required tables
