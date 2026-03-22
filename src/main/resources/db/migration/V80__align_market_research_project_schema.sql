ALTER TABLE market_research_project
    ADD COLUMN IF NOT EXISTS title VARCHAR(300),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS findings TEXT,
    ADD COLUMN IF NOT EXISTS key_insights JSONB,
    ADD COLUMN IF NOT EXISTS action_items JSONB,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

UPDATE market_research_project
SET title = COALESCE(title, project_name, project_code),
    description = COALESCE(description, objectives, 'Market research project'),
    findings = COALESCE(findings, NULLIF(objectives, '')),
    key_insights = COALESCE(key_insights, key_findings),
    action_items = COALESCE(action_items, actions_taken, recommendations),
    completed_at = COALESCE(
        completed_at,
        CASE
            WHEN actual_end_date IS NOT NULL THEN actual_end_date::timestamp AT TIME ZONE 'UTC'
            ELSE NULL
        END
    );

ALTER TABLE market_research_project
    ALTER COLUMN title SET NOT NULL,
    ALTER COLUMN description SET NOT NULL;

ALTER TABLE market_research_project
    DROP CONSTRAINT IF EXISTS market_research_project_project_type_check;

ALTER TABLE market_research_project
    ADD CONSTRAINT market_research_project_project_type_check
    CHECK (
        project_type IN (
            'CUSTOMER_RESEARCH',
            'MARKET_SIZING',
            'COMPETITIVE_STUDY',
            'PRODUCT_FEASIBILITY',
            'BRAND_PERCEPTION',
            'CHANNEL_PREFERENCE',
            'PRICING_SENSITIVITY',
            'GEOGRAPHIC_OPPORTUNITY',
            'SEGMENTATION_STUDY',
            'REGULATORY_IMPACT',
            'CUSTOMER_SURVEY',
            'COMPETITIVE_ANALYSIS',
            'PRODUCT_STUDY'
        )
    );

ALTER TABLE market_research_project
    DROP CONSTRAINT IF EXISTS market_research_project_status_check;

ALTER TABLE market_research_project
    ADD CONSTRAINT market_research_project_status_check
    CHECK (
        status IN (
            'PROPOSED',
            'APPROVED',
            'IN_PROGRESS',
            'ANALYSIS',
            'COMPLETED',
            'ARCHIVED',
            'ACTIVE'
        )
    );
