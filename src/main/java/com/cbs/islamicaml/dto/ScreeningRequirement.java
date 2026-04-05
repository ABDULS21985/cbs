package com.cbs.islamicaml.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreeningRequirement {

    private Long accountId;
    private String transactionType;
    private boolean islamicAccount;
    private boolean amlRequired;
    private boolean shariahRequired;
    private boolean enhancedAmlRequired;
    private String sourceProductCode;
    private String sourceContractTypeCode;
    private String requirementCode;
    private String actionRequired;
}
