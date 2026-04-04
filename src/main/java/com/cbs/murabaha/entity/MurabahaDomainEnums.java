package com.cbs.murabaha.entity;

public final class MurabahaDomainEnums {

    private MurabahaDomainEnums() {
    }

    public enum MurabahahType {
        COMMODITY_MURABAHA,
        ASSET_MURABAHA,
        DEFERRED_PAYMENT_MURABAHA
    }

    public enum AssetCategory {
        VEHICLE,
        PROPERTY,
        EQUIPMENT,
        MACHINERY,
        COMMODITY_METAL,
        COMMODITY_OTHER,
        INVENTORY,
        CONSUMER_GOODS,
        RESIDENTIAL_PROPERTY,
        COMMERCIAL_PROPERTY,
        LAND,
        FURNITURE,
        IT_EQUIPMENT,
        OTHER
    }

    public enum Purpose {
        HOME_PURCHASE,
        VEHICLE_PURCHASE,
        EQUIPMENT,
        WORKING_CAPITAL,
        PERSONAL,
        EDUCATION,
        MEDICAL,
        BUSINESS_EXPANSION,
        OTHER
    }

    public enum ApplicationStatus {
        DRAFT,
        SUBMITTED,
        UNDER_REVIEW,
        CREDIT_ASSESSMENT,
        PRICING,
        APPROVED,
        REJECTED,
        CANCELLED,
        EXPIRED,
        CONVERTED_TO_CONTRACT
    }

    public enum ApplicationChannel {
        BRANCH,
        ONLINE,
        MOBILE
    }

    public enum ContractStatus {
        DRAFT,
        PENDING_OWNERSHIP,
        OWNERSHIP_VERIFIED,
        PENDING_EXECUTION,
        EXECUTED,
        ACTIVE,
        SETTLED,
        EARLY_SETTLED,
        DEFAULTED,
        WRITTEN_OFF,
        CANCELLED
    }

    public enum RepaymentFrequency {
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY
    }

    public enum ProfitRecognitionMethod {
        PROPORTIONAL_TO_TIME,
        PROPORTIONAL_TO_OUTSTANDING,
        SUM_OF_DIGITS
    }

    public enum LatePenaltyMethod {
        FLAT_PER_INSTALLMENT,
        PERCENTAGE_OF_OVERDUE,
        DAILY_RATE
    }

    public enum EarlySettlementRebateMethod {
        IBRA_MANDATORY,
        IBRA_DISCRETIONARY,
        NO_REBATE
    }

    public enum CommodityPurchaseStatus {
        PENDING,
        ORDERED,
        CONFIRMED,
        SETTLED,
        CANCELLED,
        FAILED
    }

    public enum CommoditySaleStatus {
        PENDING,
        OFFERED,
        ACCEPTED,
        COMPLETED,
        ORDERED,
        CONFIRMED,
        SETTLED,
        NOT_APPLICABLE
    }

    public enum CommodityTradeStatus {
        INITIATED,
        PURCHASE_IN_PROGRESS,
        BANK_OWNS_COMMODITY,
        MURABAHA_SALE_EXECUTED,
        CUSTOMER_SALE_IN_PROGRESS,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    public enum OwnershipEvidenceType {
        WAREHOUSE_RECEIPT,
        CERTIFICATE_OF_TITLE,
        BROKER_CONFIRMATION,
        CONSTRUCTIVE_POSSESSION_LETTER,
        TITLE_DEED,
        REGISTRATION_CERTIFICATE,
        DELIVERY_NOTE,
        INSURANCE_CERTIFICATE,
        BANK_ACKNOWLEDGMENT
    }

    public enum AssetCondition {
        NEW,
        USED,
        UNDER_CONSTRUCTION
    }

    public enum AssetPurchaseStatus {
        QUOTE_RECEIVED,
        PO_ISSUED,
        INVOICE_RECEIVED,
        PAYMENT_MADE,
        DELIVERY_PENDING,
        DELIVERED,
        CANCELLED,
        FAILED
    }

    public enum PossessionType {
        CONSTRUCTIVE,
        PHYSICAL
    }

    public enum AssetPurchaseOverallStatus {
        INITIATED,
        QUOTE_PHASE,
        PURCHASE_IN_PROGRESS,
        BANK_OWNS_ASSET,
        OWNERSHIP_VERIFIED,
        MURABAHA_SALE_COMPLETE,
        TRANSFERRED_TO_CUSTOMER,
        CANCELLED,
        FAILED
    }

    public enum InstallmentStatus {
        SCHEDULED,
        DUE,
        PAID,
        PARTIAL,
        OVERDUE,
        WAIVED
    }
}
