package com.cbs.regulatory.entity;

public final class RegulatoryDomainEnums {

    private RegulatoryDomainEnums() {
    }

    public enum Jurisdiction {
        SA_SAMA,
        AE_CBUAE,
        QA_QCB,
        BH_CBB,
        KW_CBK,
        OM_CBO,
        NG_CBN
    }

    public enum ReturnType {
        BALANCE_SHEET,
        INCOME_STATEMENT,
        CAPITAL_ADEQUACY,
        ASSET_QUALITY,
        FINANCING_PORTFOLIO,
        INVESTMENT_ACCOUNTS,
        PROFIT_DISTRIBUTION,
        LIQUIDITY,
        CONCENTRATION,
        FX_POSITION,
        OFF_BALANCE_SHEET,
        SHARIAH_COMPLIANCE,
        AML_STATISTICAL,
        PER_IRR,
        ZAKAT
    }

    public enum ReportingPeriodType {
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUAL,
        ANNUAL,
        AD_HOC
    }

    public enum DataExtractionStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        FAILED
    }

    public enum ReturnValidationStatus {
        NOT_VALIDATED,
        VALID,
        INVALID,
        WARNINGS
    }

    public enum CrossValidationStatus {
        NOT_CHECKED,
        PASSED,
        FAILED
    }

    public enum ReturnStatus {
        DRAFT,
        GENERATED,
        VALIDATED,
        UNDER_REVIEW,
        APPROVED,
        SUBMITTED,
        ACKNOWLEDGED,
        REJECTED_BY_REGULATOR,
        REVISED,
        FINAL
    }

    public enum SubmissionMethod {
        PORTAL_UPLOAD,
        API,
        EMAIL,
        MANUAL
    }

    public enum OutputFormat {
        JSON,
        XML,
        XBRL,
        CSV,
        EXCEL,
        PDF
    }

    public enum ReturnLineDataType {
        AMOUNT,
        PERCENTAGE,
        COUNT,
        TEXT,
        DATE,
        BOOLEAN
    }

    public enum ReturnSourceType {
        GL_BALANCE,
        GL_MOVEMENT,
        CALCULATED,
        MANUAL,
        CROSS_REFERENCE,
        CONSTANT,
        ENTITY_QUERY,
        ENTITY_COUNT,
        ECL_DATA,
        POOL_DATA,
        CAPITAL_DATA,
        SHARIAH_DATA,
        AML_DATA,
        FINANCING_DATA
    }

    public enum AuditEventType {
        GENERATED,
        REGENERATED,
        LINE_OVERRIDDEN,
        VALIDATED,
        REVIEWED,
        APPROVED,
        SUBMITTED,
        ACKNOWLEDGED,
        REJECTED,
        AMENDED
    }
}
