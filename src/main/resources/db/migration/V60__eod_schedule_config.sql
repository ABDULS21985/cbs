-- EOD schedule configuration table
CREATE TABLE IF NOT EXISTS cbs.eod_schedule_config (
    id                          BIGSERIAL PRIMARY KEY,
    auto_trigger                BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_time              VARCHAR(8) DEFAULT '22:00',
    block_if_unclosed_branches  BOOLEAN NOT NULL DEFAULT TRUE,
    notification_emails         TEXT,
    auto_retry                  BOOLEAN NOT NULL DEFAULT FALSE,
    max_retries                 INTEGER NOT NULL DEFAULT 3,
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_by                  VARCHAR(100),
    version                     BIGINT DEFAULT 0
);

-- Seed default config row
INSERT INTO cbs.eod_schedule_config (auto_trigger, scheduled_time, block_if_unclosed_branches, auto_retry, max_retries)
VALUES (FALSE, '22:00', TRUE, FALSE, 3)
ON CONFLICT DO NOTHING;
