-- V84: Seed SHARIAH_OFFICER security role

SET search_path TO cbs;

INSERT INTO security_role (
    role_code,
    role_name,
    role_type,
    description,
    is_active,
    max_session_minutes
)
SELECT
    'SHARIAH_OFFICER',
    'Shariah Officer',
    'SYSTEM',
    'Shariah governance role for SSB review workflows, fatwa registry access, and Shariah governance dashboard operations.',
    TRUE,
    480
WHERE NOT EXISTS (
    SELECT 1
    FROM security_role
    WHERE role_code = 'SHARIAH_OFFICER'
);
