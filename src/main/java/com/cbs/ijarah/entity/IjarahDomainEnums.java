package com.cbs.ijarah.entity;

public final class IjarahDomainEnums {

    private IjarahDomainEnums() {
    }

    public enum IjarahType {
        OPERATING_IJARAH,
        IJARAH_MUNTAHIA_BITTAMLEEK,
        IJARAH_MAWSUFAH_FI_DHIMMAH,
        IJARAH_THUMMA_AL_BAI
    }

    public enum AssetCategory {
        VEHICLE,
        RESIDENTIAL_PROPERTY,
        COMMERCIAL_PROPERTY,
        EQUIPMENT,
        MACHINERY,
        AIRCRAFT,
        VESSEL,
        IT_EQUIPMENT,
        OFFICE_SPACE,
        FURNITURE,
        OTHER
    }

    public enum RentalFrequency {
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY
    }

    public enum RentalType {
        FIXED,
        VARIABLE,
        STEPPED
    }

    public enum RentalReviewFrequency {
        NONE,
        ANNUAL,
        BI_ANNUAL,
        AS_PER_SCHEDULE,
        AS_PER_CONTRACT
    }

    public enum Purpose {
        VEHICLE,
        HOME,
        OFFICE_SPACE,
        EQUIPMENT,
        MACHINERY,
        OTHER
    }

    public enum InsuranceResponsibility {
        BANK,
        CUSTOMER_ON_BEHALF
    }

    public enum MajorMaintenanceResponsibility {
        BANK
    }

    public enum MinorMaintenanceResponsibility {
        CUSTOMER
    }

    public enum TransferType {
        GIFT_HIBAH,
        SALE_AT_NOMINAL,
        SALE_AT_FAIR_VALUE,
        GRADUAL_TRANSFER
    }

    public enum ContractStatus {
        DRAFT,
        ASSET_PROCUREMENT,
        ASSET_OWNED,
        PENDING_EXECUTION,
        ACTIVE,
        RENTAL_ARREARS,
        DEFAULTED,
        TERMINATED_EARLY,
        TERMINATED_ASSET_LOSS,
        MATURED,
        TRANSFERRED_TO_CUSTOMER,
        CLOSED
    }

    public enum ApplicationStatus {
        DRAFT,
        SUBMITTED,
        CREDIT_ASSESSMENT,
        ASSET_QUOTATION,
        PRICING,
        APPROVED,
        REJECTED,
        CANCELLED,
        CONVERTED
    }

    public enum TransferDocumentType {
        WAAD_PROMISE,
        SALE_AGREEMENT,
        GIFT_DEED,
        TRANSFER_SCHEDULE
    }

    public enum TransferStatus {
        DRAFT,
        SIGNED,
        ACTIVE,
        PARTIALLY_TRANSFERRED,
        PENDING_EXECUTION,
        EXECUTED,
        CANCELLED,
        VOID
    }

    public enum UnitTransferFrequency {
        MONTHLY,
        QUARTERLY,
        ANNUALLY
    }

    public enum UnitTransferStatus {
        SCHEDULED,
        TRANSFERRED,
        OVERDUE,
        WAIVED
    }

    public enum AssetStatus {
        UNDER_PROCUREMENT,
        OWNED_UNLEASED,
        LEASED,
        RETURNED,
        TRANSFERRED_TO_CUSTOMER,
        DISPOSED,
        TOTAL_LOSS
    }

    public enum AcquisitionMethod {
        DIRECT_PURCHASE,
        AUCTION,
        TRANSFER_FROM_CUSTOMER,
        CONSTRUCTION
    }

    public enum AssetAcquisitionMethod {
        DIRECT_PURCHASE,
        AUCTION,
        TRANSFER_FROM_CUSTOMER,
        CONSTRUCTION
    }

    public enum DepreciationMethod {
        STRAIGHT_LINE,
        DECLINING_BALANCE,
        UNITS_OF_PRODUCTION
    }

    public enum AssetCondition {
        NEW,
        EXCELLENT,
        GOOD,
        FAIR,
        POOR,
        DAMAGED,
        TOTAL_LOSS
    }

    public enum MaintenanceType {
        MAJOR_STRUCTURAL,
        MAJOR_MECHANICAL,
        ROUTINE_SCHEDULED,
        EMERGENCY_REPAIR,
        REPLACEMENT_PART,
        INSURANCE_CLAIM,
        MINOR_REPAIR
    }

    public enum ResponsibleParty {
        BANK,
        CUSTOMER
    }

    public enum MaintenanceStatus {
        SCHEDULED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    public enum DisposalMethod {
        SOLD,
        GIFTED_IMB,
        SCRAPPED,
        INSURANCE_WRITE_OFF
    }

    public enum LatePenaltyMethod {
        PERCENTAGE_OF_OVERDUE,
        FLAT_PER_INSTALLMENT,
        DAILY_RATE
    }

    public enum RentalInstallmentStatus {
        SCHEDULED,
        DUE,
        PAID,
        PARTIAL,
        OVERDUE,
        WAIVED,
        CANCELLED
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
}
