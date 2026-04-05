package com.cbs.musharakah.entity;

public final class MusharakahDomainEnums {

    private MusharakahDomainEnums() {
    }

    public enum MusharakahType {
        DIMINISHING_MUSHARAKAH,
        CONSTANT_MUSHARAKAH,
        MUDARABAH_MUSHARAKAH
    }

    public enum AssetCategory {
        RESIDENTIAL_PROPERTY,
        COMMERCIAL_PROPERTY,
        LAND,
        VEHICLE,
        EQUIPMENT,
        BUSINESS_VENTURE,
        OTHER
    }

    public enum UnitPricingMethod {
        FIXED_AT_INCEPTION,
        PERIODIC_FAIR_VALUE,
        AGREED_SCHEDULE
    }

    public enum LossSharingMethod {
        PROPORTIONAL_TO_CAPITAL
    }

    public enum RentalFrequency {
        MONTHLY,
        QUARTERLY
    }

    public enum RentalRateType {
        FIXED,
        VARIABLE_BENCHMARK,
        STEPPED
    }

    public enum RentalReviewFrequency {
        NONE,
        ANNUAL,
        BI_ANNUAL
    }

    public enum BuyoutFrequency {
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY
    }

    public enum InsuranceResponsibility {
        PROPORTIONAL,
        BANK_FULL,
        CUSTOMER_FULL
    }

    public enum MajorMaintenanceSharing {
        PROPORTIONAL_TO_OWNERSHIP,
        BANK_RESPONSIBILITY
    }

    public enum EarlyBuyoutPricingMethod {
        REMAINING_UNITS_AT_FIXED,
        REMAINING_AT_FAIR_VALUE,
        NEGOTIATED
    }

    public enum ContractStatus {
        DRAFT,
        ASSET_PROCUREMENT,
        JOINT_OWNERSHIP_REGISTERED,
        PENDING_EXECUTION,
        ACTIVE,
        RENTAL_ARREARS,
        BUYOUT_ARREARS,
        DEFAULTED,
        FULLY_BOUGHT_OUT,
        TERMINATED_EARLY,
        TERMINATED,
        DISSOLVED,
        CLOSED
    }

    public enum ApplicationStatus {
        DRAFT,
        SUBMITTED,
        CREDIT_ASSESSMENT,
        ASSET_VALUATION,
        PRICING,
        APPROVED,
        REJECTED,
        CANCELLED,
        CONVERTED,
        EXPIRED
    }

    public enum TransferPricingMethod {
        FIXED,
        FAIR_VALUE,
        AGREED
    }

    public enum InstallmentStatus {
        SCHEDULED,
        DUE,
        PAID,
        PARTIAL,
        OVERDUE,
        WAIVED,
        CANCELLED
    }

    public enum LossType {
        ASSET_IMPAIRMENT,
        ASSET_DAMAGE,
        ASSET_TOTAL_LOSS,
        MARKET_DECLINE,
        OPERATIONAL_LOSS,
        FORCED_SALE_LOSS,
        WRITE_OFF
    }

    public enum LossStatus {
        DETECTED,
        ASSESSED,
        ALLOCATED,
        POSTED,
        DISPUTED,
        RESOLVED
    }
}
