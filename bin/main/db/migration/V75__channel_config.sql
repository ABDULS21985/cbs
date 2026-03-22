-- ============================================================================
-- V75: Notification channel configuration — extend existing channel_config
-- ============================================================================

-- cbs.channel_config already exists from V19__digital_channels.sql with
-- channel-management fields. This migration adds the notification-provider
-- fields used by the notifications module without breaking the existing schema.

ALTER TABLE cbs.channel_config
    ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sender_address VARCHAR(200),
    ADD COLUMN IF NOT EXISTS api_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS api_secret VARCHAR(500),
    ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS rate_limit INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS retry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_channel_config_channel ON cbs.channel_config (channel);

-- Seed notification-capable channels while satisfying the legacy not-null
-- columns from the digital-channels module.
INSERT INTO cbs.channel_config (
    channel,
    display_name,
    is_enabled,
    features_enabled,
    transaction_types,
    session_timeout_secs,
    operating_hours,
    is_active,
    provider,
    enabled,
    config,
    sender_address,
    rate_limit
) VALUES
    ('EMAIL', 'Email Notifications', TRUE, '[]'::jsonb, '[]'::jsonb, 300, '24/7', TRUE, 'SMTP', TRUE, '{"host":"localhost","port":1025,"auth":false,"starttls":false}'::jsonb, 'noreply@digicore.bank', 200),
    ('SMS', 'SMS Notifications', TRUE, '[]'::jsonb, '[]'::jsonb, 300, '24/7', TRUE, 'TWILIO', TRUE, '{"region":"ng","encoding":"GSM7"}'::jsonb, '+234800000000', 100),
    ('PUSH', 'Push Notifications', TRUE, '[]'::jsonb, '[]'::jsonb, 300, '24/7', TRUE, 'FIREBASE', TRUE, '{"projectId":"digicore-cbs"}'::jsonb, NULL, 500),
    ('IN_APP', 'In-App Notifications', TRUE, '[]'::jsonb, '[]'::jsonb, 300, '24/7', TRUE, 'INTERNAL', TRUE, '{}'::jsonb, NULL, 1000),
    ('WEBHOOK', 'Webhook Notifications', TRUE, '[]'::jsonb, '[]'::jsonb, 300, '24/7', TRUE, 'HTTP_CLIENT', TRUE, '{"timeoutMs":5000,"retryOnTimeout":true}'::jsonb, NULL, 50)
ON CONFLICT (channel) DO NOTHING;
