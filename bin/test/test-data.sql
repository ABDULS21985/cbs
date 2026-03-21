SET search_path TO cbs;

INSERT INTO chart_of_accounts (
    gl_code,
    gl_name,
    gl_category,
    gl_sub_category,
    level_number,
    is_header,
    is_postable,
    currency_code,
    is_multi_currency,
    branch_code,
    is_inter_branch,
    normal_balance,
    allow_manual_posting,
    requires_cost_centre,
    is_active,
    created_by,
    version
) VALUES
    ('1100', 'Opening Balance Suspense', 'ASSET', 'SUSPENSE', 1, FALSE, TRUE, 'NGN', FALSE, 'HEAD', FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'test-bootstrap', 0),
    ('2001', 'Customer Deposit Control', 'LIABILITY', 'DEPOSITS', 1, FALSE, TRUE, 'NGN', FALSE, 'HEAD', FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'test-bootstrap', 0),
    ('4001', 'Fee Income', 'INCOME', 'FEES', 1, FALSE, TRUE, 'NGN', FALSE, 'HEAD', FALSE, 'CREDIT', TRUE, FALSE, TRUE, 'test-bootstrap', 0),
    ('5001', 'Interest Expense', 'EXPENSE', 'INTEREST', 1, FALSE, TRUE, 'NGN', FALSE, 'HEAD', FALSE, 'DEBIT', TRUE, FALSE, TRUE, 'test-bootstrap', 0)
ON CONFLICT (gl_code) DO UPDATE
SET gl_name = EXCLUDED.gl_name,
    gl_category = EXCLUDED.gl_category,
    gl_sub_category = EXCLUDED.gl_sub_category,
    currency_code = EXCLUDED.currency_code,
    branch_code = EXCLUDED.branch_code,
    normal_balance = EXCLUDED.normal_balance,
    is_active = TRUE,
    updated_at = NOW();

UPDATE product
SET gl_account_code = COALESCE(gl_account_code, '2001'),
    gl_fee_income_code = COALESCE(gl_fee_income_code, '4001'),
    gl_interest_expense_code = COALESCE(gl_interest_expense_code, '5001')
WHERE code IN ('SA-STD', 'CA-STD');
