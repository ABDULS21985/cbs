package com.cbs.payments.islamic.entity;

public final class IslamicPaymentDomainEnums {

    private IslamicPaymentDomainEnums() {
    }

    public enum PaymentScreeningResult {
        PASS,
        FAIL,
        ALERT,
        WARN,
        NOT_SCREENED
    }

    public enum PaymentComplianceAction {
        NONE,
        PASSED,
        BLOCKED,
        ALLOWED_WITH_ALERT,
        MANUAL_OVERRIDE
    }

    public enum PaymentPurpose {
        GENERAL,
        SALARY,
        SUPPLIER_PAYMENT,
        UTILITY,
        RENT,
        GOVERNMENT,
        CHARITY_DONATION,
        ZAKAT,
        TAKAFUL_PREMIUM,
        FINANCING_REPAYMENT,
        INVESTMENT,
        INTRA_BANK_TRANSFER,
        FOREIGN_REMITTANCE,
        OTHER
    }

    public enum ShariahPurposeFlag {
        COMPLIANT,
        NON_COMPLIANT,
        REQUIRES_REVIEW,
        NOT_APPLICABLE
    }

    public enum AuditActionTaken {
        ALLOWED,
        BLOCKED,
        ALLOWED_WITH_ALERT,
        MANUAL_OVERRIDE
    }

    public enum RailType {
        RTGS,
        ACH,
        IPS
    }

    public enum MessageFormat {
        ISO_20022,
        SWIFT_MT,
        PROPRIETARY
    }

    public enum MessageDirection {
        OUTBOUND,
        INBOUND
    }

    public enum MessageStatus {
        PENDING,
        SUBMITTED,
        ACKNOWLEDGED,
        SETTLED,
        REJECTED,
        TIMED_OUT,
        CANCELLED
    }

    public enum ChargesOption {
        OUR,
        BEN,
        SHA
    }

    public enum SwiftStatus {
        PENDING,
        SENT,
        ACKNOWLEDGED,
        DELIVERED,
        RETURNED,
        REJECTED
    }

    public enum InstantScreeningMode {
        REAL_TIME,
        DEFERRED
    }

    public enum DeferredScreeningResult {
        PENDING,
        PASS,
        FAIL,
        ALERT
    }

    public enum ProxyType {
        MOBILE,
        EMAIL,
        NATIONAL_ID,
        CR_NUMBER,
        IBAN
    }

    public enum InstantPaymentStatus {
        INITIATED,
        SCREENING,
        SUBMITTED,
        CONFIRMED,
        REJECTED,
        TIMED_OUT,
        RETURNED
    }

    public enum ScreeningOutcome {
        ALLOWED,
        BLOCKED,
        ALLOWED_WITH_ALERT,
        ALLOWED_WITH_WARNING,
        MANUAL_OVERRIDE
    }

    public enum CheckType {
        MCC,
        COUNTERPARTY,
        BENEFICIARY_BANK,
        PURPOSE,
        AMOUNT_THRESHOLD,
        SOURCE_COMPLIANCE
    }

    public enum CheckResult {
        PASS,
        FAIL,
        ALERT,
        WARN,
        SKIPPED
    }

    public enum CheckAction {
        BLOCK,
        ALERT,
        WARN,
        LOG
    }
}
