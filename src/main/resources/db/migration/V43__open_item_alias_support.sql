SET search_path TO cbs;

-- Keep the API backward compatible with legacy/alias values used by clients.
ALTER TABLE IF EXISTS open_item
    DROP CONSTRAINT IF EXISTS open_item_item_type_check,
    DROP CONSTRAINT IF EXISTS open_item_item_category_check,
    DROP CONSTRAINT IF EXISTS open_item_resolution_action_check;

ALTER TABLE IF EXISTS open_item
    ADD CONSTRAINT open_item_item_type_check
        CHECK (item_type IN (
            'UNMATCHED_TRANSACTION',
            'UNMATCHED_TXN',
            'SUSPENSE_ENTRY',
            'RECONCILIATION_BREAK',
            'FAILED_PAYMENT',
            'PENDING_CHARGE',
            'RETURNED_ITEM',
            'DISPUTED_ENTRY',
            'MANUAL_ADJUSTMENT'
        )),
    ADD CONSTRAINT open_item_item_category_check
        CHECK (item_category IN (
            'PAYMENT',
            'CLEARING',
            'SETTLEMENT',
            'FEE',
            'INTEREST',
            'FX',
            'CARD',
            'INTERNAL',
            'RECONCILIATION',
            'NOSTRO'
        )),
    ADD CONSTRAINT open_item_resolution_action_check
        CHECK (resolution_action IN (
            'MATCHED',
            'WRITTEN_OFF',
            'WRITE_OFF',
            'REVERSED',
            'REBOOKED',
            'RETURNED',
            'FORCE_POSTED',
            'ESCALATED'
        ));
