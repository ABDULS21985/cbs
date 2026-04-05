package com.cbs.card.dto;

import com.cbs.card.entity.IslamicCardProduct;
import com.cbs.card.entity.IslamicCardProfile;

import java.util.List;

public final class IslamicCardMapper {

    private IslamicCardMapper() {
    }

    public static IslamicCardProfileResponse toProfileResponse(IslamicCardProfile profile) {
        if (profile == null) {
            return null;
        }
        return new IslamicCardProfileResponse(
                profile.getId(),
                profile.getProfileCode(),
                profile.getProfileName(),
                profile.getDescription(),
                List.copyOf(profile.getRestrictedMccs()),
                profile.getActive(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    public static IslamicCardProductResponse toProductResponse(IslamicCardProduct product) {
        if (product == null) {
            return null;
        }
        return new IslamicCardProductResponse(
                product.getId(),
                product.getProductCode(),
                product.getProductName(),
                product.getDescription(),
                product.getContractType(),
                product.getCardScheme(),
                product.getCardTier(),
                product.getRestrictionProfile() != null ? product.getRestrictionProfile().getProfileCode() : null,
                product.getSettlementGlCode(),
                product.getFeeGlCode(),
                product.getIssuanceFeeCode(),
                product.getReplacementFeeCode(),
                product.getAllowAtm(),
                product.getAllowPos(),
                product.getAllowOnline(),
                product.getAllowInternational(),
                product.getAllowContactless(),
                product.getRequireVerifiedKyc(),
                product.getAllowOverdraft(),
                product.getActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}