-- Performance index for GL drill-down queries that JOIN journal_line on gl_code
-- Used by: GET /v1/gl/accounts/{glCode}/entries (findByGlCodeAndDateRange)
CREATE INDEX IF NOT EXISTS idx_journal_line_gl_code
    ON cbs.journal_line (gl_code);

-- Composite index for the full drill-down query pattern (gl_code + journal posting date range)
CREATE INDEX IF NOT EXISTS idx_journal_line_gl_code_journal_id
    ON cbs.journal_line (gl_code, journal_id);
