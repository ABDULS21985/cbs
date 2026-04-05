package com.cbs.zakat.entity;

public final class ZakatDomainEnums {

    private ZakatDomainEnums() {
    }

    public enum ComputationType {
        BANK_ZAKAT,
        CUSTOMER_ZAKAT_AGGREGATE,
        CUSTOMER_ZAKAT_INDIVIDUAL
    }

    public enum MethodType {
        NET_ASSETS,
        EQUITY_APPROACH,
        MODIFIED_NET_ASSETS,
        CUSTOM
    }

    public enum ZakatRateBasis {
        HIJRI_YEAR,
        GREGORIAN_YEAR
    }

    public enum BalanceMethod {
        MINIMUM_BALANCE,
        AVERAGE_BALANCE,
        END_OF_YEAR,
        HIGHEST_BALANCE
    }

    public enum NisabBasis {
        GOLD_85G,
        SILVER_595G,
        ZATCA_FIXED
    }

    public enum CustomerZakatDeductionPolicy {
        MANDATORY_SAUDI_NATIONALS,
        OPT_IN,
        BANK_DISCRETION,
        NOT_APPLICABLE
    }

    public enum IahTreatment {
        DEDUCTIBLE,
        NON_DEDUCTIBLE,
        PARTIAL
    }

    public enum PerIrrTreatment {
        DEDUCTIBLE,
        NON_DEDUCTIBLE,
        PER_SSB_RULING
    }

    public enum ReviewFrequency {
        ANNUAL,
        BI_ANNUAL,
        ON_CHANGE
    }

    public enum MethodologyStatus {
        ACTIVE,
        UNDER_REVIEW,
        RETIRED
    }

    public enum ZakatClassification {
        ZAKATABLE_ASSET,
        NON_ZAKATABLE_ASSET,
        DEDUCTIBLE_LIABILITY,
        NON_DEDUCTIBLE_LIABILITY
    }

    public enum ValuationMethod {
        BOOK_VALUE,
        MARKET_VALUE,
        NET_REALISABLE_VALUE,
        LOWER_OF_COST_AND_MARKET
    }

    public enum RuleStatus {
        ACTIVE,
        INACTIVE,
        UNDER_REVIEW
    }

    public enum AdjustmentDirection {
        INCREASE,
        DECREASE
    }

    public enum ZakatStatus {
        DRAFT,
        CALCULATED,
        SSB_REVIEWED,
        APPROVED,
        FILED_WITH_ZATCA,
        ZATCA_ASSESSED,
        PAID,
        CLOSED
    }

    public enum ZatcaReturnType {
        ANNUAL_ZAKAT,
        AMENDED_ZAKAT,
        PROVISIONAL_ZAKAT
    }

    public enum FilingMethod {
        ELECTRONIC_PORTAL,
        API,
        MANUAL
    }

    public enum AssessmentStatus {
        PENDING,
        ACCEPTED,
        ADJUSTED,
        APPEALED
    }

    public enum PaymentStatus {
        NOT_DUE,
        DUE,
        PAID,
        OVERDUE,
        PARTIALLY_PAID
    }

    public enum AppealOutcome {
        PENDING,
        UPHELD,
        PARTIALLY_UPHELD,
        DISMISSED
    }

    public enum ZatcaReturnStatus {
        DRAFT,
        PREPARED,
        FILED,
        ASSESSED,
        PAID,
        CLOSED,
        APPEALED
    }
}