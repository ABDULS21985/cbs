package com.cbs.card.dto;

import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.IslamicCardContractType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveIslamicCardProductRequest {

    @NotBlank(message = "productCode is required")
    private String productCode;

    @NotBlank(message = "productName is required")
    private String productName;

    private String description;

    @NotNull(message = "contractType is required")
    private IslamicCardContractType contractType;

    @NotNull(message = "cardScheme is required")
    private CardScheme cardScheme;

    private String cardTier;

    private String restrictionProfileCode;

    @NotBlank(message = "settlementGlCode is required")
    private String settlementGlCode;

    private String feeGlCode;
    private String issuanceFeeCode;
    private String replacementFeeCode;
    private Boolean allowAtm;
    private Boolean allowPos;
    private Boolean allowOnline;
    private Boolean allowInternational;
    private Boolean allowContactless;
    private Boolean requireVerifiedKyc;
    private Boolean allowOverdraft;
    private Boolean active;
}