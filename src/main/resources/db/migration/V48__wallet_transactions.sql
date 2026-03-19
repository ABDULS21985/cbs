-- V48__wallet_transactions.sql
-- Wallet transaction ledger for multi-currency wallet operations

SET search_path TO cbs;

CREATE TABLE wallet_transaction (
    id                      BIGSERIAL PRIMARY KEY,
    wallet_id               BIGINT NOT NULL REFERENCES currency_wallet(id),
    transaction_type        VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT','DEBIT','FX_BUY','FX_SELL')),
    amount                  NUMERIC(18,2) NOT NULL,
    balance_after           NUMERIC(18,2) NOT NULL,
    narration               VARCHAR(500),
    reference               VARCHAR(40) NOT NULL UNIQUE,
    contra_wallet_id        BIGINT REFERENCES currency_wallet(id),
    fx_rate                 NUMERIC(18,8),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_wallet   ON wallet_transaction(wallet_id);
CREATE INDEX idx_wallet_txn_created  ON wallet_transaction(wallet_id, created_at DESC);
