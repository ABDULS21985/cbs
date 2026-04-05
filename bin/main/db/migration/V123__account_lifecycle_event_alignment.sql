SET search_path TO cbs;

ALTER TABLE account_lifecycle_event
    DROP CONSTRAINT IF EXISTS account_lifecycle_event_event_type_check;

ALTER TABLE account_lifecycle_event
    ADD CONSTRAINT account_lifecycle_event_event_type_check CHECK (event_type IN (
        'OPENED',
        'ACTIVATED',
        'STATUS_CHANGED',
        'DORMANCY_DETECTED',
        'REACTIVATED',
        'FROZEN',
        'UNFROZEN',
        'PND_PLACED',
        'PND_REMOVED',
        'CLOSED',
        'ESCHEAT',
        'FEE_CHARGED',
        'INTEREST_POSTED',
        'MANDATE_CHANGED',
        'SIGNATORY_ADDED',
        'SIGNATORY_REMOVED',
        'SIGNING_RULE_CHANGED',
        'INTEREST_RATE_OVERRIDDEN',
        'LIMIT_CHANGED',
        'OFFICER_CHANGED'
    ));