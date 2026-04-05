ALTER TABLE card_transaction
    ADD COLUMN IF NOT EXISTS original_transaction_id BIGINT REFERENCES card_transaction(id),
    ADD COLUMN IF NOT EXISTS original_transaction_ref VARCHAR(40),
    ADD COLUMN IF NOT EXISTS adjustment_reason VARCHAR(300);

CREATE INDEX IF NOT EXISTS idx_card_transaction_original_txn
    ON card_transaction(original_transaction_id);

CREATE INDEX IF NOT EXISTS idx_card_transaction_original_txn_ref
    ON card_transaction(original_transaction_ref);