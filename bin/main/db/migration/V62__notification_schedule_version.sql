-- ============================================================================
-- V62: Scheduled notification campaigns and template version history
-- ============================================================================

-- Scheduled notification campaigns (recurring or one-time future sends)
CREATE TABLE cbs.scheduled_notification (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(200) NOT NULL,
    template_code           VARCHAR(30) REFERENCES cbs.notification_template(template_code),
    channel                 VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','SMS','PUSH','IN_APP','WEBHOOK')),
    event_type              VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    subject                 VARCHAR(300),
    body                    TEXT,
    cron_expression         VARCHAR(100),
    frequency               VARCHAR(20) NOT NULL DEFAULT 'ONCE' CHECK (frequency IN ('ONCE','DAILY','WEEKLY','MONTHLY')),
    next_run                TIMESTAMP WITH TIME ZONE,
    last_run                TIMESTAMP WITH TIME ZONE,
    recipient_criteria      JSONB NOT NULL DEFAULT '{}',
    recipient_count         INT NOT NULL DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','CANCELLED')),
    created_by              VARCHAR(100),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_sched_notif_status ON cbs.scheduled_notification(status);
CREATE INDEX idx_sched_notif_next_run ON cbs.scheduled_notification(next_run);

-- Template version history (immutable audit of template body changes)
CREATE TABLE cbs.notification_template_version (
    id                      BIGSERIAL PRIMARY KEY,
    template_id             BIGINT NOT NULL REFERENCES cbs.notification_template(id) ON DELETE CASCADE,
    version_number          INT NOT NULL,
    body_template           TEXT NOT NULL,
    subject                 VARCHAR(300),
    changed_by              VARCHAR(100),
    change_summary          VARCHAR(500),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, version_number)
);

CREATE INDEX idx_tpl_version_template ON cbs.notification_template_version(template_id);
