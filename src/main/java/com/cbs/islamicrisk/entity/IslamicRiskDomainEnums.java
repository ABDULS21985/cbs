package com.cbs.islamicrisk.entity;

public final class IslamicRiskDomainEnums {

    private IslamicRiskDomainEnums() {
    }

    public enum ModelStatus {
        ACTIVE,
        UNDER_CALIBRATION,
        RETIRED
    }

    public enum AssessmentStatus {
        COMPLETED,
        OVERRIDDEN,
        EXPIRED,
        SUPERSEDED
    }

    public enum ApprovalRecommendation {
        AUTO_APPROVE,
        APPROVE_WITH_CONDITIONS,
        ENHANCED_REVIEW,
        DECLINE
    }

    public enum EclConfigStatus {
        ACTIVE,
        UNDER_REVIEW,
        RETIRED
    }

    public enum PdModel {
        TRANSITION_MATRIX,
        LOGISTIC_REGRESSION,
        SCORECARD_MAPPING,
        EXTERNAL_RATING
    }

    public enum LgdModel {
        WORKOUT,
        COLLATERAL_BASED,
        STATISTICAL,
        HYBRID
    }

    public enum EadCalculationMethod {
        AMORTISED_COST,
        NET_BOOK_VALUE,
        SHARE_VALUE,
        HYBRID
    }

    public enum Stage {
        STAGE_1,
        STAGE_2,
        STAGE_3
    }

    public enum ShariahPermissibility {
        PERMISSIBLE,
        RESTRICTED,
        PROHIBITED,
        REQUIRES_REVIEW
    }

    public enum IslamicCollateralType {
        REAL_ESTATE,
        VEHICLE,
        EQUIPMENT_MACHINERY,
        GOLD_PRECIOUS_METALS,
        CASH_DEPOSIT,
        SHARIAH_COMPLIANT_EQUITY,
        SUKUK,
        RECEIVABLES_HALAL,
        KAFALAH_GUARANTEE,
        TAKAFUL_POLICY,
        INVENTORY_HALAL,
        IJARAH_ASSET_OWNERSHIP,
        MUSHARAKAH_SHARE,
        OTHER_PERMISSIBLE
    }

    public enum UnderlyingScreeningResult {
        COMPLIANT,
        NON_COMPLIANT,
        UNDER_REVIEW
    }

    public enum IslamicCollateralValuationMethod {
        MARKET_VALUE,
        INDEPENDENT_APPRAISAL,
        BOOK_VALUE,
        FORCED_SALE_VALUE
    }

    public enum LienPriority {
        FIRST,
        SECOND,
        THIRD,
        PARI_PASSU
    }

    public enum IslamicCollateralStatus {
        ACTIVE,
        RELEASED,
        UNDER_REVIEW,
        EXPIRED
    }

    public enum AaoifiClassification {
        PERFORMING,
        WATCH_LIST,
        SUBSTANDARD,
        DOUBTFUL,
        LOSS
    }

    public enum MigrationTrend {
        IMPROVING,
        STABLE,
        DETERIORATING
    }
}
