SET search_path TO cbs;

-- V89: allow notification logs to remain pending dispatch

ALTER TABLE cbs.notification_log
    DROP CONSTRAINT IF EXISTS notification_log_status_check;

ALTER TABLE cbs.notification_log
    ADD CONSTRAINT notification_log_status_check
        CHECK (status IN ('PENDING', 'PENDING_DISPATCH', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPTED_OUT'));
