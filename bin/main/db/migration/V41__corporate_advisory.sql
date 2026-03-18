SET search_path TO cbs;

-- =====================================================
-- V41: Corporate Advisory (Batch 35 — FINAL)
-- M&A Advisory, Corporate Tax Advisory, Corporate Finance
-- =====================================================

-- ma_engagement: M&A advisory mandate tracking
CREATE TABLE IF NOT EXISTS ma_engagement (
    id                          BIGSERIAL PRIMARY KEY,
    engagement_code             VARCHAR(30) NOT NULL UNIQUE,
    engagement_name             VARCHAR(300) NOT NULL,
    engagement_type             VARCHAR(20) NOT NULL
        CHECK (engagement_type IN ('BUY_SIDE','SELL_SIDE','MERGER','DIVESTITURE','MANAGEMENT_BUYOUT',
               'LEVERAGED_BUYOUT','RESTRUCTURING','FAIRNESS_OPINION','VALUATION_ONLY')),
    client_name                 VARCHAR(200) NOT NULL,
    client_customer_id          BIGINT,
    client_sector               VARCHAR(40),
    target_name                 VARCHAR(200),
    target_sector               VARCHAR(40),
    target_country              VARCHAR(3),
    transaction_currency        VARCHAR(3) DEFAULT 'USD',
    estimated_deal_value        NUMERIC(20,4),
    actual_deal_value           NUMERIC(20,4),
    deal_structure              VARCHAR(20)
        CHECK (deal_structure IN ('CASH','STOCK','MIXED','ASSET_PURCHASE','SHARE_PURCHASE')),
    our_role                    VARCHAR(25) NOT NULL
        CHECK (our_role IN ('SOLE_ADVISER','JOINT_ADVISER','BUY_SIDE_ADVISER','SELL_SIDE_ADVISER',
               'FAIRNESS_OPINION_PROVIDER','VALUATION_ADVISER')),
    lead_banker                 VARCHAR(200),
    team_members                JSONB,
    retainer_fee                NUMERIC(15,4),
    retainer_frequency          VARCHAR(10) CHECK (retainer_frequency IN ('MONTHLY','QUARTERLY')),
    success_fee_pct             NUMERIC(5,4),
    success_fee_min             NUMERIC(15,4),
    success_fee_cap             NUMERIC(15,4),
    expense_reimbursement       BOOLEAN DEFAULT TRUE,
    total_fees_earned           NUMERIC(15,4) DEFAULT 0,
    mandate_date                DATE,
    information_memo_date       DATE,
    data_room_open_date         DATE,
    indicative_bid_deadline     DATE,
    due_diligence_start         DATE,
    due_diligence_end           DATE,
    binding_bid_deadline        DATE,
    signing_date                DATE,
    regulatory_approval_date    DATE,
    closing_date                DATE,
    competing_bidders           INT,
    confidentiality_agreements  JSONB,
    regulatory_approvals        JSONB,
    status                      VARCHAR(20) NOT NULL DEFAULT 'PITCHING'
        CHECK (status IN ('PITCHING','MANDATED','PREPARATION','MARKETING','DUE_DILIGENCE',
               'NEGOTIATION','SIGNING','REGULATORY_CLEARANCE','CLOSED','TERMINATED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_maeng_status ON ma_engagement(status, client_sector);

-- tax_advisory_engagement: Corporate tax advisory mandate tracking
CREATE TABLE IF NOT EXISTS tax_advisory_engagement (
    id                          BIGSERIAL PRIMARY KEY,
    engagement_code             VARCHAR(30) NOT NULL UNIQUE,
    engagement_name             VARCHAR(200) NOT NULL,
    engagement_type             VARCHAR(25) NOT NULL
        CHECK (engagement_type IN ('TAX_STRUCTURING','TRANSFER_PRICING','TAX_DUE_DILIGENCE','TAX_COMPLIANCE_REVIEW',
               'WITHHOLDING_TAX_ADVISORY','DOUBLE_TAX_TREATY','TAX_OPINION','TAX_DISPUTE',
               'VAT_ADVISORY','CUSTOM_DUTY','EXCISE_TAX','INTERNATIONAL_TAX')),
    client_name                 VARCHAR(200) NOT NULL,
    client_customer_id          BIGINT,
    jurisdictions               JSONB,
    tax_authority               VARCHAR(60),
    lead_advisor                VARCHAR(200),
    team_members                JSONB,
    scope_description           TEXT,
    key_issues                  JSONB,
    tax_exposure_estimate       NUMERIC(20,4),
    tax_savings_identified      NUMERIC(20,4),
    advisory_fee                NUMERIC(15,4),
    fee_basis                   VARCHAR(15)
        CHECK (fee_basis IN ('FIXED','HOURLY','SUCCESS_FEE','RETAINER')),
    deliverables                JSONB,
    opinion                     TEXT,
    risk_rating                 VARCHAR(10)
        CHECK (risk_rating IN ('LOW','MEDIUM','HIGH','AGGRESSIVE')),
    disclaimers                 TEXT,
    engagement_start_date       DATE,
    engagement_end_date         DATE,
    status                      VARCHAR(15) NOT NULL DEFAULT 'PROPOSAL'
        CHECK (status IN ('PROPOSAL','ENGAGED','IN_PROGRESS','OPINION_DELIVERED','CLOSED','TERMINATED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);

-- corporate_finance_engagement: Corporate finance advisory
CREATE TABLE IF NOT EXISTS corporate_finance_engagement (
    id                          BIGSERIAL PRIMARY KEY,
    engagement_code             VARCHAR(30) NOT NULL UNIQUE,
    engagement_name             VARCHAR(300) NOT NULL,
    engagement_type             VARCHAR(25) NOT NULL
        CHECK (engagement_type IN ('DEBT_RESTRUCTURING','EQUITY_RESTRUCTURING','CAPITAL_RAISE_ADVISORY',
               'BUSINESS_VALUATION','FINANCIAL_MODELLING','FEASIBILITY_STUDY',
               'STRATEGIC_REVIEW','TURNAROUND_ADVISORY','REFINANCING','RECAPITALIZATION')),
    client_name                 VARCHAR(200) NOT NULL,
    client_customer_id          BIGINT,
    client_sector               VARCHAR(40),
    currency                    VARCHAR(3) DEFAULT 'USD',
    deal_value_estimate         NUMERIC(20,4),
    our_role                    VARCHAR(20) NOT NULL
        CHECK (our_role IN ('SOLE_ADVISER','LEAD_ADVISER','JOINT_ADVISER','INDEPENDENT_ADVISER')),
    lead_banker                 VARCHAR(200),
    team_members                JSONB,
    scope_of_work               TEXT,
    key_assumptions             JSONB,
    deliverables                JSONB,
    financial_model             JSONB,
    valuation_range             JSONB,
    recommendations             TEXT,
    retainer_fee                NUMERIC(15,4),
    success_fee                 NUMERIC(15,4),
    total_fees_invoiced         NUMERIC(15,4) DEFAULT 0,
    total_fees_paid             NUMERIC(15,4) DEFAULT 0,
    mandate_date                DATE,
    kickoff_date                DATE,
    draft_delivery_date         DATE,
    final_delivery_date         DATE,
    completion_date             DATE,
    linked_deals                JSONB,
    status                      VARCHAR(15) NOT NULL DEFAULT 'PROPOSAL'
        CHECK (status IN ('PROPOSAL','MANDATED','ANALYSIS','DRAFT_DELIVERED','FINAL_DELIVERED',
               'EXECUTION','COMPLETED','TERMINATED')),
    created_by VARCHAR(100), updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now(),
    version BIGINT DEFAULT 0
);
