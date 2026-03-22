-- =============================================================================
-- V76: ALM Stress Test Run - Persist stress testing results for audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS cbs.alm_stress_test_run (
    id                      BIGSERIAL       PRIMARY KEY,
    scenario_id             BIGINT          NOT NULL REFERENCES cbs.alm_scenario(id),
    scenario_name           VARCHAR(100)    NOT NULL,
    scenario_type           VARCHAR(20)     NOT NULL,
    avg_shock_bps           INT             NOT NULL DEFAULT 0,
    nii_impact              NUMERIC(18,2)   NOT NULL DEFAULT 0,
    eve_impact              NUMERIC(18,2)   NOT NULL DEFAULT 0,
    cet1_before             NUMERIC(8,4),
    cet1_after              NUMERIC(8,4),
    breach_count            INT             NOT NULL DEFAULT 0,
    result_payload          JSONB           NOT NULL DEFAULT '{}',
    run_by                  VARCHAR(100),
    run_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version                 BIGINT          NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alm_stress_run_scenario ON cbs.alm_stress_test_run(scenario_id);
CREATE INDEX IF NOT EXISTS idx_alm_stress_run_date ON cbs.alm_stress_test_run(run_at DESC);
