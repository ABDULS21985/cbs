SET search_path TO cbs;

ALTER TABLE transaction_journal
    ADD COLUMN IF NOT EXISTS journal_id BIGINT REFERENCES journal_entry(id),
    ADD COLUMN IF NOT EXISTS posting_group_ref VARCHAR(40),
    ADD COLUMN IF NOT EXISTS reversed_transaction_id BIGINT REFERENCES transaction_journal(id);

CREATE INDEX IF NOT EXISTS idx_txn_journal_id ON transaction_journal(journal_id);
CREATE INDEX IF NOT EXISTS idx_txn_posting_group_ref ON transaction_journal(posting_group_ref);
CREATE INDEX IF NOT EXISTS idx_txn_reversed_transaction_id ON transaction_journal(reversed_transaction_id);
