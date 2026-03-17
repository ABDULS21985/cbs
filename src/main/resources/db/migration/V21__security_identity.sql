-- V21: Security & Identity (Caps 84-86, 88-89)
-- RBAC/ABAC, MFA, Encryption Key Management, SIEM, Data Masking

SET search_path TO cbs;

-- ============================================================
-- Cap 84: RBAC / ABAC
-- ============================================================
CREATE TABLE IF NOT EXISTS security_role (
    id                  BIGSERIAL PRIMARY KEY,
    role_code           VARCHAR(50)  NOT NULL UNIQUE,
    role_name           VARCHAR(150) NOT NULL,
    role_type           VARCHAR(30)  NOT NULL DEFAULT 'SYSTEM'
                        CHECK (role_type IN ('SYSTEM','CUSTOM','TEMPORARY')),
    description         TEXT,
    parent_role_id      BIGINT       REFERENCES security_role(id),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    max_session_minutes INT          NOT NULL DEFAULT 480,
    ip_whitelist        JSONB,
    time_restriction    JSONB,
    tenant_id           BIGINT       REFERENCES tenant(id),
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security_permission (
    id                  BIGSERIAL PRIMARY KEY,
    permission_code     VARCHAR(100) NOT NULL UNIQUE,
    resource            VARCHAR(80)  NOT NULL,
    action              VARCHAR(30)  NOT NULL
                        CHECK (action IN ('CREATE','READ','UPDATE','DELETE','APPROVE','EXECUTE','EXPORT','ADMIN')),
    description         TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permission (
    id                  BIGSERIAL PRIMARY KEY,
    role_id             BIGINT       NOT NULL REFERENCES security_role(id),
    permission_id       BIGINT       NOT NULL REFERENCES security_permission(id),
    granted_at          TIMESTAMP    NOT NULL DEFAULT now(),
    granted_by          VARCHAR(80),
    UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role_assignment (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    role_id             BIGINT       NOT NULL REFERENCES security_role(id),
    assigned_at         TIMESTAMP    NOT NULL DEFAULT now(),
    assigned_by         VARCHAR(80),
    expires_at          TIMESTAMP,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    branch_scope        BIGINT,
    tenant_id           BIGINT       REFERENCES tenant(id),
    UNIQUE (user_id, role_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS abac_policy (
    id                  BIGSERIAL PRIMARY KEY,
    policy_name         VARCHAR(150) NOT NULL UNIQUE,
    resource            VARCHAR(80)  NOT NULL,
    action              VARCHAR(30)  NOT NULL,
    condition_expr      JSONB        NOT NULL,
    effect              VARCHAR(10)  NOT NULL DEFAULT 'PERMIT'
                        CHECK (effect IN ('PERMIT','DENY')),
    priority            INT          NOT NULL DEFAULT 100,
    description         TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- Cap 85: Multi-Factor Authentication
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_enrollment (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    mfa_method          VARCHAR(30)  NOT NULL
                        CHECK (mfa_method IN ('TOTP','SMS_OTP','EMAIL_OTP','PUSH_NOTIFICATION',
                               'HARDWARE_TOKEN','BIOMETRIC_FACE','BIOMETRIC_FINGERPRINT','FIDO2_WEBAUTHN')),
    secret_encrypted    TEXT,
    device_id           VARCHAR(200),
    phone_number        VARCHAR(30),
    email_address       VARCHAR(200),
    fido_credential_id  TEXT,
    fido_public_key     TEXT,
    is_primary          BOOLEAN      NOT NULL DEFAULT FALSE,
    is_verified         BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_at         TIMESTAMP,
    last_used_at        TIMESTAMP,
    failure_count       INT          NOT NULL DEFAULT 0,
    locked_until        TIMESTAMP,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED')),
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfa_challenge (
    id                  BIGSERIAL PRIMARY KEY,
    challenge_id        VARCHAR(80)  NOT NULL UNIQUE,
    user_id             BIGINT       NOT NULL,
    enrollment_id       BIGINT       NOT NULL REFERENCES mfa_enrollment(id),
    mfa_method          VARCHAR(30)  NOT NULL,
    otp_hash            VARCHAR(200),
    challenge_data      TEXT,
    purpose             VARCHAR(50)  NOT NULL DEFAULT 'LOGIN'
                        CHECK (purpose IN ('LOGIN','TRANSACTION','ADMIN_ACTION','PASSWORD_RESET','ENROLLMENT')),
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','VERIFIED','FAILED','EXPIRED')),
    ip_address          VARCHAR(50),
    user_agent          TEXT,
    expires_at          TIMESTAMP    NOT NULL,
    verified_at         TIMESTAMP,
    attempt_count       INT          NOT NULL DEFAULT 0,
    max_attempts        INT          NOT NULL DEFAULT 3,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_enrollment_user ON mfa_enrollment(user_id);
CREATE INDEX idx_mfa_challenge_user ON mfa_challenge(user_id, status);

-- ============================================================
-- Cap 86: Encryption Key Management
-- ============================================================
CREATE TABLE IF NOT EXISTS encryption_key (
    id                  BIGSERIAL PRIMARY KEY,
    key_id              VARCHAR(80)  NOT NULL UNIQUE,
    key_alias           VARCHAR(150) NOT NULL,
    key_type            VARCHAR(30)  NOT NULL
                        CHECK (key_type IN ('AES_256','RSA_2048','RSA_4096','ECDSA_P256',
                               'ECDSA_P384','HMAC_SHA256','PGP','HSM_WRAPPED')),
    purpose             VARCHAR(40)  NOT NULL
                        CHECK (purpose IN ('DATA_ENCRYPTION','TOKEN_SIGNING','API_KEY_ENCRYPTION',
                               'PII_ENCRYPTION','CARD_DATA','PIN_ENCRYPTION','FILE_ENCRYPTION','BACKUP_ENCRYPTION')),
    encrypted_material  TEXT,
    kek_id              VARCHAR(80),
    hsm_key_handle      VARCHAR(200),
    algorithm           VARCHAR(30)  NOT NULL DEFAULT 'AES/GCM/NoPadding',
    key_size_bits       INT          NOT NULL DEFAULT 256,
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','ROTATION_PENDING','ROTATED','EXPIRED','DESTROYED')),
    rotation_interval_days INT       NOT NULL DEFAULT 90,
    last_rotated_at     TIMESTAMP,
    next_rotation_at    TIMESTAMP,
    expires_at          TIMESTAMP,
    created_by          VARCHAR(80),
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS key_usage_log (
    id                  BIGSERIAL PRIMARY KEY,
    key_id              VARCHAR(80)  NOT NULL,
    operation           VARCHAR(20)  NOT NULL
                        CHECK (operation IN ('ENCRYPT','DECRYPT','SIGN','VERIFY','WRAP','UNWRAP','ROTATE','DESTROY')),
    resource_type       VARCHAR(60),
    resource_id         VARCHAR(100),
    performed_by        VARCHAR(80),
    ip_address          VARCHAR(50),
    success             BOOLEAN      NOT NULL DEFAULT TRUE,
    error_message       TEXT,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_key_usage_key ON key_usage_log(key_id, created_at DESC);

-- ============================================================
-- Cap 88: SIEM
-- ============================================================
CREATE TABLE IF NOT EXISTS security_event (
    id                  BIGSERIAL PRIMARY KEY,
    event_id            VARCHAR(80)  NOT NULL UNIQUE,
    event_category      VARCHAR(40)  NOT NULL
                        CHECK (event_category IN ('AUTHENTICATION','AUTHORIZATION','DATA_ACCESS',
                               'CONFIGURATION_CHANGE','PRIVILEGE_ESCALATION','ANOMALY','NETWORK',
                               'MALWARE','DATA_EXFILTRATION','POLICY_VIOLATION','INCIDENT')),
    severity            VARCHAR(10)  NOT NULL
                        CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
    event_source        VARCHAR(80)  NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    description         TEXT,
    user_id             BIGINT,
    username            VARCHAR(80),
    ip_address          VARCHAR(50),
    user_agent          TEXT,
    geo_location        VARCHAR(100),
    resource_type       VARCHAR(60),
    resource_id         VARCHAR(100),
    action_taken        VARCHAR(40)
                        CHECK (action_taken IN ('NONE','LOGGED','ALERTED','BLOCKED','ACCOUNT_LOCKED',
                               'SESSION_TERMINATED','ESCALATED','AUTO_REMEDIATED')),
    threat_score        INT          DEFAULT 0 CHECK (threat_score BETWEEN 0 AND 100),
    correlation_id      VARCHAR(80),
    raw_payload         JSONB,
    is_acknowledged     BOOLEAN      NOT NULL DEFAULT FALSE,
    acknowledged_by     VARCHAR(80),
    acknowledged_at     TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_event_category ON security_event(event_category, severity, created_at DESC);
CREATE INDEX idx_security_event_user ON security_event(user_id, created_at DESC);
CREATE INDEX idx_security_event_correlation ON security_event(correlation_id);

CREATE TABLE IF NOT EXISTS siem_correlation_rule (
    id                  BIGSERIAL PRIMARY KEY,
    rule_name           VARCHAR(150) NOT NULL UNIQUE,
    rule_type           VARCHAR(30)  NOT NULL
                        CHECK (rule_type IN ('THRESHOLD','SEQUENCE','AGGREGATION','PATTERN','ANOMALY','COMPOSITE')),
    event_filter        JSONB        NOT NULL,
    condition_expr      JSONB        NOT NULL,
    time_window_minutes INT          NOT NULL DEFAULT 15,
    severity_output     VARCHAR(10)  NOT NULL DEFAULT 'HIGH',
    action_on_trigger   VARCHAR(40)  NOT NULL DEFAULT 'ALERTED',
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    description         TEXT,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

-- ============================================================
-- Cap 89: Data Masking / PII Protection
-- ============================================================
CREATE TABLE IF NOT EXISTS masking_policy (
    id                  BIGSERIAL PRIMARY KEY,
    policy_name         VARCHAR(150) NOT NULL UNIQUE,
    entity_type         VARCHAR(60)  NOT NULL,
    field_name          VARCHAR(80)  NOT NULL,
    masking_strategy    VARCHAR(30)  NOT NULL
                        CHECK (masking_strategy IN ('FULL_MASK','PARTIAL_MASK','HASH','TOKENIZE',
                               'REDACT','TRUNCATE','DATE_SHIFT','NOISE','SYNTHETIC','FORMAT_PRESERVING')),
    mask_pattern        VARCHAR(100),
    applies_to_roles    JSONB,
    applies_to_channels JSONB,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    description         TEXT,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pii_field_registry (
    id                  BIGSERIAL PRIMARY KEY,
    entity_type         VARCHAR(60)  NOT NULL,
    field_name          VARCHAR(80)  NOT NULL,
    pii_category        VARCHAR(40)  NOT NULL
                        CHECK (pii_category IN ('NATIONAL_ID','PASSPORT','TAX_ID','PHONE','EMAIL',
                               'ADDRESS','DATE_OF_BIRTH','BANK_ACCOUNT','CARD_NUMBER','PIN',
                               'BIOMETRIC','HEALTH','FINANCIAL','NAME','PHOTOGRAPH')),
    sensitivity_level   VARCHAR(10)  NOT NULL DEFAULT 'HIGH'
                        CHECK (sensitivity_level IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    encryption_required BOOLEAN      NOT NULL DEFAULT TRUE,
    default_masking_strategy VARCHAR(30) NOT NULL DEFAULT 'PARTIAL_MASK',
    retention_days      INT,
    gdpr_lawful_basis   VARCHAR(40),
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (entity_type, field_name)
);

-- Seed: PII field registry
INSERT INTO pii_field_registry (entity_type, field_name, pii_category, sensitivity_level, encryption_required, default_masking_strategy, gdpr_lawful_basis)
VALUES
    ('CUSTOMER', 'national_id',     'NATIONAL_ID',   'CRITICAL', TRUE,  'PARTIAL_MASK', 'LEGAL_OBLIGATION'),
    ('CUSTOMER', 'passport_number', 'PASSPORT',       'CRITICAL', TRUE,  'PARTIAL_MASK', 'LEGAL_OBLIGATION'),
    ('CUSTOMER', 'tax_id',          'TAX_ID',         'CRITICAL', TRUE,  'PARTIAL_MASK', 'LEGAL_OBLIGATION'),
    ('CUSTOMER', 'phone_number',    'PHONE',          'HIGH',     TRUE,  'PARTIAL_MASK', 'CONTRACT'),
    ('CUSTOMER', 'email',           'EMAIL',          'HIGH',     TRUE,  'PARTIAL_MASK', 'CONTRACT'),
    ('CUSTOMER', 'address',         'ADDRESS',        'MEDIUM',   FALSE, 'PARTIAL_MASK', 'CONTRACT'),
    ('CUSTOMER', 'date_of_birth',   'DATE_OF_BIRTH',  'HIGH',     TRUE,  'DATE_SHIFT',   'LEGAL_OBLIGATION'),
    ('ACCOUNT',  'account_number',  'BANK_ACCOUNT',   'HIGH',     FALSE, 'PARTIAL_MASK', 'CONTRACT'),
    ('CARD',     'card_number',     'CARD_NUMBER',    'CRITICAL', TRUE,  'PARTIAL_MASK', 'CONTRACT'),
    ('CARD',     'pin',             'PIN',            'CRITICAL', TRUE,  'FULL_MASK',    'CONTRACT'),
    ('CUSTOMER', 'photograph',      'PHOTOGRAPH',     'HIGH',     FALSE, 'REDACT',       'CONSENT'),
    ('CUSTOMER', 'biometric_data',  'BIOMETRIC',      'CRITICAL', TRUE,  'FULL_MASK',    'CONSENT')
ON CONFLICT (entity_type, field_name) DO NOTHING;

-- Seed: default masking policies
INSERT INTO masking_policy (policy_name, entity_type, field_name, masking_strategy, mask_pattern, applies_to_roles, applies_to_channels, is_active, description)
VALUES
    ('mask-card-number',   'CARD',     'card_number',     'PARTIAL_MASK', '****-****-****-{last4}', '["CBS_OFFICER","PORTAL_USER"]'::jsonb, '["API","REPORT"]'::jsonb, TRUE, 'Show last 4 digits'),
    ('mask-national-id',   'CUSTOMER', 'national_id',     'PARTIAL_MASK', '***-***-{last3}',        '["CBS_OFFICER"]'::jsonb,               '["API","REPORT","EXPORT"]'::jsonb, TRUE, 'Show last 3 digits'),
    ('mask-phone',         'CUSTOMER', 'phone_number',    'PARTIAL_MASK', '+XX-***-***-{last4}',    '["CBS_OFFICER"]'::jsonb,               '["API"]'::jsonb, TRUE, 'Country code + last 4'),
    ('mask-email',         'CUSTOMER', 'email',           'PARTIAL_MASK', '{first2}***@{domain}',   '["CBS_OFFICER"]'::jsonb,               '["API","REPORT"]'::jsonb, TRUE, 'First 2 chars + domain'),
    ('mask-account-export','ACCOUNT',  'account_number',  'PARTIAL_MASK', '***-***-{last4}',        '["CBS_OFFICER"]'::jsonb,               '["EXPORT"]'::jsonb, TRUE, 'Mask in exports'),
    ('hash-biometric',     'CUSTOMER', 'biometric_data',  'FULL_MASK',    '***REDACTED***',         '["CBS_ADMIN","CBS_OFFICER","PORTAL_USER"]'::jsonb, '["API","REPORT","EXPORT"]'::jsonb, TRUE, 'Never expose biometric'),
    ('tokenize-pin',       'CARD',     'pin',             'TOKENIZE',     NULL,                     '["CBS_ADMIN","CBS_OFFICER"]'::jsonb,   '["API"]'::jsonb, TRUE, 'Tokenize PIN')
ON CONFLICT (policy_name) DO NOTHING;
