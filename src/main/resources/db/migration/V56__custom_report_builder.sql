SET search_path TO cbs;

CREATE TABLE IF NOT EXISTS custom_report (
    id BIGSERIAL PRIMARY KEY,
    report_code VARCHAR(30) UNIQUE NOT NULL,
    report_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(30),
    owner VARCHAR(80),
    config JSONB DEFAULT '{}',
    schedule JSONB,
    recipients JSONB DEFAULT '[]',
    access_level VARCHAR(15) DEFAULT 'PRIVATE',
    status VARCHAR(15) DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS report_execution (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES custom_report(id),
    status VARCHAR(15) DEFAULT 'RUNNING',
    row_count INT,
    duration_ms INT,
    output_url VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_custom_report_owner ON custom_report(owner, status);
CREATE INDEX idx_report_execution_report ON report_execution(report_id, created_at DESC);
