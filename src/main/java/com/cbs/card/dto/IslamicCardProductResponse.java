package com.cbs.card.dto;

import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.IslamicCardContractType;

import java.time.Instant;

public record IslamicCardProductResponse(
        Long id,
        String productCode,
        String productName,
        String description,
        IslamicCardContractType contractType,
        CardScheme cardScheme,
        String cardTier,
        String restrictionProfileCode,
        String settlementGlCode,
        String feeGlCode,
        String issuanceFeeCode,
        String replacementFeeCode,
        Boolean allowAtm,
        Boolean allowPos,
        Boolean allowOnline,
        Boolean allowInternational,
        Boolean allowContactless,
        Boolean requireVerifiedKyc,
        Boolean allowOverdraft,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}