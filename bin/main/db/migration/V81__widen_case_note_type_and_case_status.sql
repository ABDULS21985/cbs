-- Widen note_type to accommodate CUSTOMER_VISIBLE and future types
ALTER TABLE cbs.case_note ALTER COLUMN note_type TYPE VARCHAR(25);

-- Widen status to accommodate PENDING_CUSTOMER, PENDING_INTERNAL, REOPENED
ALTER TABLE cbs.customer_case ALTER COLUMN status TYPE VARCHAR(20);
