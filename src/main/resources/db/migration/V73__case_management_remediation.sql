SET search_path TO cbs;

-- =====================================================
-- V73: Case Management Remediation
-- Adds missing columns, fixes CHECK constraints for
-- frontend/backend alignment
-- =====================================================

-- Add customer_name and sub_category to customer_case
ALTER TABLE customer_case ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200);
ALTER TABLE customer_case ADD COLUMN IF NOT EXISTS sub_category VARCHAR(60);

-- Widen resolution_type CHECK to include frontend resolution values
ALTER TABLE customer_case DROP CONSTRAINT IF EXISTS customer_case_resolution_type_check;
ALTER TABLE customer_case ADD CONSTRAINT customer_case_resolution_type_check
    CHECK (resolution_type IN (
        'RESOLVED','ESCALATED','REJECTED','DUPLICATE','AUTO_RESOLVED','COMPENSATED',
        'FULLY_RESOLVED','PARTIALLY_RESOLVED','WORKAROUND_PROVIDED','ESCALATED_TO_VENDOR','NO_FAULT_FOUND'
    ));

-- Widen analysis_method CHECK to include frontend values (FIVE_WHY, OTHER)
ALTER TABLE case_root_cause_analysis DROP CONSTRAINT IF EXISTS case_root_cause_analysis_analysis_method_check;
ALTER TABLE case_root_cause_analysis ADD CONSTRAINT case_root_cause_analysis_analysis_method_check
    CHECK (analysis_method IN ('FIVE_WHYS','FIVE_WHY','FISHBONE','PARETO','FAULT_TREE','TIMELINE','FAILURE_MODE','OTHER'));

-- Widen root_cause_category CHECK to include ENVIRONMENT
ALTER TABLE case_root_cause_analysis DROP CONSTRAINT IF EXISTS case_root_cause_analysis_root_cause_category_check;
ALTER TABLE case_root_cause_analysis ADD CONSTRAINT case_root_cause_analysis_root_cause_category_check
    CHECK (root_cause_category IN ('PROCESS','SYSTEM','PEOPLE','POLICY','THIRD_PARTY','DATA','INFRASTRUCTURE','ENVIRONMENT'));

-- =====================================================
-- Case Attachments — real file metadata storage
-- =====================================================
CREATE TABLE IF NOT EXISTS case_attachment (
    id                  BIGSERIAL PRIMARY KEY,
    case_id             BIGINT       NOT NULL REFERENCES customer_case(id),
    filename            VARCHAR(255) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    file_size           BIGINT       NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    storage_path        VARCHAR(500) NOT NULL,
    checksum            VARCHAR(128),
    uploaded_by         VARCHAR(80)  NOT NULL,
    uploaded_at         TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_attachment_case ON case_attachment(case_id);

-- =====================================================
-- Compensation approval tracking
-- =====================================================
ALTER TABLE customer_case ADD COLUMN IF NOT EXISTS compensation_approved BOOLEAN;
ALTER TABLE customer_case ADD COLUMN IF NOT EXISTS compensation_approved_by VARCHAR(80);
ALTER TABLE customer_case ADD COLUMN IF NOT EXISTS compensation_approved_at TIMESTAMP;
ALTER TABLE customer_case ADD COLUMN IF NOT EXISTS compensation_rejection_reason TEXT;
