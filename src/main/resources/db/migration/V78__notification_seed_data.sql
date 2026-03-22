SET search_path TO cbs;

-- V78: Seed notification templates + sample delivery logs for all channels
-- Provides realistic data for the Notification Delivery History dashboard

-- ============================================================
-- Seed notification templates (if not already present)
-- ============================================================

INSERT INTO notification_template (template_code, template_name, channel, event_type, subject, body_template, is_html, locale, is_active, created_at, updated_at)
VALUES
  ('TPL-WELCOME-EMAIL', 'Welcome Email', 'EMAIL', 'CUSTOMER_ONBOARDED', 'Welcome to DigiCore CBS, {{customerName}}', '<p>Dear {{customerName}},</p><p>Welcome to DigiCore CBS. Your account has been successfully created.</p>', true, 'en', true, now(), now()),
  ('TPL-TXN-SMS', 'Transaction Alert SMS', 'SMS', 'TRANSACTION_COMPLETED', NULL, 'DigiCore: Your account {{accountNumber}} has been debited {{amount}} on {{date}}. Ref: {{reference}}', false, 'en', true, now(), now()),
  ('TPL-OTP-SMS', 'OTP SMS', 'SMS', 'OTP_REQUESTED', NULL, 'Your DigiCore OTP is {{otp}}. Valid for 5 minutes. Do not share this code.', false, 'en', true, now(), now()),
  ('TPL-APPROVAL-PUSH', 'Approval Push', 'PUSH', 'APPROVAL_REQUIRED', 'Action Required: Approval Pending', 'You have a pending approval: {{approvalType}} for {{reference}}', false, 'en', true, now(), now()),
  ('TPL-ALERT-INAPP', 'System Alert In-App', 'IN_APP', 'SYSTEM_ALERT', 'System Alert', '{{alertMessage}}', false, 'en', true, now(), now()),
  ('TPL-WEBHOOK-EVT', 'Webhook Event', 'WEBHOOK', 'WEBHOOK_EVENT', NULL, '{"event":"{{eventType}}","customerId":{{customerId}},"timestamp":"{{timestamp}}"}', false, 'en', true, now(), now()),
  ('TPL-STMT-EMAIL', 'Statement Ready Email', 'EMAIL', 'STATEMENT_READY', 'Your {{period}} statement is ready', '<p>Dear {{customerName}},</p><p>Your {{period}} account statement for {{accountNumber}} is now available for download.</p>', true, 'en', true, now(), now()),
  ('TPL-LOAN-SMS', 'Loan Repayment Reminder', 'SMS', 'LOAN_REPAYMENT_DUE', NULL, 'DigiCore: Your loan repayment of {{amount}} is due on {{dueDate}}. Please ensure sufficient balance.', false, 'en', true, now(), now())
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- Seed notification log entries across channels and statuses
-- Generates records over the past 30 days for realistic trend data
-- ============================================================

-- Helper: generate diverse notification logs
-- EMAIL channel - mix of DELIVERED, SENT, FAILED
INSERT INTO notification_log (template_code, channel, event_type, customer_id, recipient_address, recipient_name, subject, body, status, provider, failure_reason, retry_count, max_retries, sent_at, delivered_at, created_at)
SELECT
    CASE (s % 3)
        WHEN 0 THEN 'TPL-WELCOME-EMAIL'
        WHEN 1 THEN 'TPL-STMT-EMAIL'
        ELSE 'TPL-WELCOME-EMAIL'
    END,
    'EMAIL',
    CASE (s % 3) WHEN 0 THEN 'CUSTOMER_ONBOARDED' WHEN 1 THEN 'STATEMENT_READY' ELSE 'CUSTOMER_ONBOARDED' END,
    NULL,
    'customer' || (100 + s) || '@example.com',
    'Customer ' || (100 + s),
    CASE (s % 3) WHEN 0 THEN 'Welcome to DigiCore CBS' WHEN 1 THEN 'Your monthly statement is ready' ELSE 'Welcome to DigiCore CBS' END,
    'Email body content for notification ' || s,
    CASE
        WHEN s % 7 = 0 THEN 'FAILED'
        WHEN s % 5 = 0 THEN 'SENT'
        ELSE 'DELIVERED'
    END,
    'SMTP_DEFAULT',
    CASE WHEN s % 7 = 0 THEN 'Connection refused: SMTP server unavailable' ELSE NULL END,
    CASE WHEN s % 7 = 0 THEN 1 ELSE 0 END,
    3,
    now() - ((30 - (s % 30)) || ' days')::interval + (s || ' hours')::interval,
    CASE WHEN s % 7 != 0 AND s % 5 != 0 THEN now() - ((30 - (s % 30)) || ' days')::interval + (s || ' hours')::interval + interval '2 seconds' ELSE NULL END,
    now() - ((30 - (s % 30)) || ' days')::interval + (s || ' hours')::interval
FROM generate_series(1, 45) AS s;

-- SMS channel - mix of DELIVERED, FAILED
INSERT INTO notification_log (template_code, channel, event_type, customer_id, recipient_address, recipient_name, subject, body, status, provider, failure_reason, retry_count, max_retries, sent_at, delivered_at, created_at)
SELECT
    CASE (s % 2) WHEN 0 THEN 'TPL-TXN-SMS' ELSE 'TPL-OTP-SMS' END,
    'SMS',
    CASE (s % 2) WHEN 0 THEN 'TRANSACTION_COMPLETED' ELSE 'OTP_REQUESTED' END,
    NULL,
    '+234800' || LPAD(CAST(s * 111 AS TEXT), 7, '0'),
    'Customer ' || (200 + s),
    NULL,
    'SMS body for notification ' || s,
    CASE
        WHEN s % 8 = 0 THEN 'FAILED'
        WHEN s % 6 = 0 THEN 'BOUNCED'
        ELSE 'DELIVERED'
    END,
    'TWILIO',
    CASE WHEN s % 8 = 0 THEN 'Invalid phone number format' WHEN s % 6 = 0 THEN 'Number unreachable' ELSE NULL END,
    CASE WHEN s % 8 = 0 OR s % 6 = 0 THEN 2 ELSE 0 END,
    3,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 2) || ' hours')::interval,
    CASE WHEN s % 8 != 0 AND s % 6 != 0 THEN now() - ((30 - (s % 30)) || ' days')::interval + ((s * 2) || ' hours')::interval + interval '1 second' ELSE NULL END,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 2) || ' hours')::interval
FROM generate_series(1, 35) AS s;

-- PUSH channel
INSERT INTO notification_log (template_code, channel, event_type, customer_id, recipient_address, recipient_name, subject, body, status, provider, failure_reason, retry_count, max_retries, sent_at, delivered_at, created_at)
SELECT
    'TPL-APPROVAL-PUSH',
    'PUSH',
    'APPROVAL_REQUIRED',
    NULL,
    'device-token-' || s,
    'Customer ' || (300 + s),
    'Approval Required',
    'Push notification body ' || s,
    CASE
        WHEN s % 10 = 0 THEN 'FAILED'
        ELSE 'DELIVERED'
    END,
    'FIREBASE',
    CASE WHEN s % 10 = 0 THEN 'Device token expired' ELSE NULL END,
    CASE WHEN s % 10 = 0 THEN 1 ELSE 0 END,
    3,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 3) || ' hours')::interval,
    CASE WHEN s % 10 != 0 THEN now() - ((30 - (s % 30)) || ' days')::interval + ((s * 3) || ' hours')::interval + interval '500 milliseconds' ELSE NULL END,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 3) || ' hours')::interval
FROM generate_series(1, 25) AS s;

-- IN_APP channel - all delivered
INSERT INTO notification_log (template_code, channel, event_type, customer_id, recipient_address, recipient_name, subject, body, status, provider, retry_count, max_retries, sent_at, delivered_at, created_at)
SELECT
    'TPL-ALERT-INAPP',
    'IN_APP',
    'SYSTEM_ALERT',
    NULL,
    'customer-' || (400 + s),
    'Customer ' || (400 + s),
    'System Alert',
    'In-app notification ' || s,
    'DELIVERED',
    'INTERNAL',
    0, 3,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 4) || ' hours')::interval,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 4) || ' hours')::interval,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 4) || ' hours')::interval
FROM generate_series(1, 20) AS s;

-- WEBHOOK channel
INSERT INTO notification_log (template_code, channel, event_type, customer_id, recipient_address, recipient_name, subject, body, status, provider, failure_reason, retry_count, max_retries, sent_at, delivered_at, created_at)
SELECT
    'TPL-WEBHOOK-EVT',
    'WEBHOOK',
    'WEBHOOK_EVENT',
    NULL,
    'https://partner-' || s || '.example.com/webhook',
    'Partner ' || s,
    NULL,
    '{"event":"WEBHOOK_EVENT","customerId":' || (500 + s) || '}',
    CASE
        WHEN s % 5 = 0 THEN 'FAILED'
        ELSE 'DELIVERED'
    END,
    'HTTP_CLIENT',
    CASE WHEN s % 5 = 0 THEN 'HTTP 503 Service Unavailable' ELSE NULL END,
    CASE WHEN s % 5 = 0 THEN 3 ELSE 0 END,
    3,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 5) || ' hours')::interval,
    CASE WHEN s % 5 != 0 THEN now() - ((30 - (s % 30)) || ' days')::interval + ((s * 5) || ' hours')::interval + interval '1 second' ELSE NULL END,
    now() - ((30 - (s % 30)) || ' days')::interval + ((s * 5) || ' hours')::interval
FROM generate_series(1, 15) AS s;
