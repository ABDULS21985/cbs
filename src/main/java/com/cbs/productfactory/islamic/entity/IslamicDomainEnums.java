package com.cbs.productfactory.islamic.entity;

public final class IslamicDomainEnums {

    private IslamicDomainEnums() {
    }

    public enum IslamicProductCategory {
        FINANCING,
        DEPOSIT,
        INVESTMENT,
        INSURANCE,
        TRADE,
        GUARANTEE,
        AGENCY,
        SUKUK
    }

    public enum ProfitCalculationMethod {
        NONE,
        COST_PLUS_MARKUP,
        PROFIT_SHARING_RATIO,
        RENTAL_RATE,
        EXPECTED_PROFIT_RATE,
        COMMISSION_BASED
    }

    public enum ProfitRateType {
        FIXED,
        VARIABLE,
        TIERED,
        STEP_UP,
        STEP_DOWN
    }

    public enum ProfitDistributionFrequency {
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY,
        AT_MATURITY,
        ON_SALE
    }

    public enum ProfitDistributionMethod {
        ACTUAL_PROFIT,
        INDICATIVE_RATE_SMOOTHED,
        EXPECTED_PROFIT_RATE
    }

    public enum LossSharingMethod {
        PROPORTIONAL_TO_CAPITAL,
        BANK_ABSORBS_FIRST,
        CUSTOM
    }

    public enum DiminishingFrequency {
        MONTHLY,
        QUARTERLY,
        ANNUALLY
    }

    public enum AssetOwnershipDuringTenor {
        BANK_OWNED,
        CUSTOMER_OWNED,
        JOINT
    }

    public enum RentalReviewFrequency {
        NONE,
        ANNUAL,
        BI_ANNUAL,
        AS_PER_CONTRACT
    }

    public enum MaintenanceResponsibility {
        BANK,
        CUSTOMER,
        SHARED
    }

    public enum InsuranceResponsibility {
        BANK,
        CUSTOMER
    }

    public enum TakafulModel {
        MUDARABAH,
        WAKALAH,
        HYBRID
    }

    public enum ShariahComplianceStatus {
        DRAFT,
        PENDING_FATWA,
        FATWA_ISSUED,
        COMPLIANT,
        NON_COMPLIANT,
        SUSPENDED,
        RETIRED
    }

    public enum IslamicProductStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        ACTIVE,
        SUSPENDED,
        RETIRED
    }

    public enum ParameterType {
        STRING,
        DECIMAL,
        INTEGER,
        BOOLEAN,
        DATE,
        JSON
    }

    public enum VersionChangeType {
        CREATED,
        MATERIAL_CHANGE,
        NON_MATERIAL_CHANGE,
        FATWA_LINKED,
        FATWA_UNLINKED,
        STATUS_CHANGE,
        PARAMETER_CHANGE
    }

    public enum VersionReviewStatus {
        NOT_REQUIRED,
        PENDING,
        APPROVED,
        REJECTED
    }

    public enum ContractCategory {
        LOAN_BASED,
        SALE_BASED,
        LEASE_BASED,
        PARTNERSHIP_BASED,
        AGENCY_BASED,
        GUARANTEE,
        SAFEKEEPING,
        FORWARD_SALE
    }

    public enum ContractTypeStatus {
        ACTIVE,
        INACTIVE,
        DEPRECATED
    }

    public enum AccountingTreatment {
        AMORTISED_COST,
        FAIR_VALUE_PL,
        FAIR_VALUE_OCI,
        OFF_BALANCE_SHEET
    }
}
