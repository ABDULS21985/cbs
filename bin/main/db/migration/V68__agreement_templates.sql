-- Agreement Templates table and seed data
CREATE TABLE IF NOT EXISTS agreement_template (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200)    NOT NULL,
    type        VARCHAR(30)     NOT NULL CHECK (type IN ('MASTER_SERVICE','PRODUCT_SPECIFIC','FEE_SCHEDULE','LIMIT_AGREEMENT','CHANNEL_ACCESS','DATA_SHARING','PRIVACY_CONSENT','POWER_OF_ATTORNEY','GUARANTEE','COLLATERAL','NDA')),
    description TEXT,
    content     TEXT,
    is_active   BOOLEAN         NOT NULL DEFAULT true,
    created_at  TIMESTAMP       NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT now()
);

INSERT INTO agreement_template (name, type, description, content, is_active) VALUES
('Master Service Agreement', 'MASTER_SERVICE', 'Standard master service agreement covering all banking services, fees, and terms of engagement.', 'This Master Service Agreement ("Agreement") is entered into between the Bank and the Customer...', true),
('Current Account Terms', 'PRODUCT_SPECIFIC', 'Terms and conditions specific to current/checking account products.', 'These terms govern the operation of your current account including deposits, withdrawals, and overdraft facilities...', true),
('Savings Account Terms', 'PRODUCT_SPECIFIC', 'Terms and conditions for savings account products including interest accrual rules.', 'These terms govern your savings account including minimum balance requirements, interest calculation, and withdrawal limits...', true),
('Fee Schedule Agreement', 'FEE_SCHEDULE', 'Standard fee schedule covering transaction fees, maintenance fees, and service charges.', 'This Fee Schedule outlines all applicable charges for banking services...', true),
('Transaction Limit Agreement', 'LIMIT_AGREEMENT', 'Agreement governing transaction and account limits for the customer.', 'This agreement establishes the daily, weekly, and monthly transaction limits applicable to your accounts...', true),
('Digital Banking Access', 'CHANNEL_ACCESS', 'Terms of access for internet banking, mobile banking, and API channels.', 'This agreement governs your access to and use of the Bank''s digital banking channels including internet banking, mobile app, and API services...', true),
('Data Sharing Consent', 'DATA_SHARING', 'Customer consent for sharing data with third parties and credit bureaus.', 'By signing this agreement, you consent to the Bank sharing your financial data with authorized third parties, credit bureaus, and regulatory bodies as required...', true),
('Privacy & Data Protection', 'PRIVACY_CONSENT', 'Privacy policy and data protection consent under applicable regulations.', 'This agreement outlines how the Bank collects, processes, stores, and protects your personal and financial data in compliance with applicable data protection regulations...', true),
('Power of Attorney', 'POWER_OF_ATTORNEY', 'Standard power of attorney template for account operation by authorized third parties.', 'This Power of Attorney authorizes the named individual(s) to operate the specified accounts on behalf of the account holder...', true),
('Guarantee Agreement', 'GUARANTEE', 'Standard guarantee agreement template for financial guarantees.', 'This Guarantee Agreement is made between the Guarantor and the Bank, whereby the Guarantor unconditionally guarantees the obligations of the Principal...', true),
('Collateral Agreement', 'COLLATERAL', 'Agreement for pledging collateral against credit facilities.', 'This Collateral Agreement governs the pledge of assets as security for credit facilities extended by the Bank...', true),
('Non-Disclosure Agreement', 'NDA', 'Confidentiality agreement for sensitive banking relationships.', 'This Non-Disclosure Agreement establishes the terms under which confidential information may be shared between the parties...', true);
