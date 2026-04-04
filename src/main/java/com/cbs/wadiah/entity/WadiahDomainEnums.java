package com.cbs.wadiah.entity;

public final class WadiahDomainEnums {

    private WadiahDomainEnums() {
    }

    public enum WadiahType {
        YAD_DHAMANAH,
        YAD_AMANAH
    }

    public enum StatementFrequency {
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY,
        ON_DEMAND
    }

    public enum PreferredLanguage {
        EN,
        AR,
        EN_AR
    }

    public enum OnboardingChannel {
        BRANCH,
        ONLINE,
        MOBILE,
        AGENT
    }

    public enum ApplicationStatus {
        INITIATED,
        KYC_VERIFICATION,
        PRODUCT_SELECTION,
        SHARIAH_DISCLOSURE,
        DOCUMENT_SIGNING,
        COMPLIANCE_CHECK,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED,
        CANCELLED,
        EXPIRED
    }

    public enum HibahDistributionMethod {
        FLAT_AMOUNT,
        BALANCE_WEIGHTED,
        TIERED,
        DISCRETIONARY_MANUAL
    }

    public enum HibahFundingSource {
        BANK_EQUITY,
        RETAINED_EARNINGS,
        SPECIFIC_INCOME_POOL
    }

    public enum HibahBatchStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        PROCESSING,
        COMPLETED,
        CANCELLED
    }

    public enum HibahItemStatus {
        PENDING,
        CREDITED,
        FAILED,
        EXCLUDED
    }

    public enum HibahVariabilityRequirement {
        MANDATORY_VARIATION,
        RECOMMENDED_VARIATION,
        NO_REQUIREMENT
    }

    public enum HibahPolicyStatus {
        ACTIVE,
        SUSPENDED,
        UNDER_REVIEW
    }

    public enum SsbReviewFrequency {
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY
    }

    public enum StatementDeliveryMethod {
        PAPER,
        EMAIL,
        PORTAL,
        SMS_NOTIFICATION
    }
}
