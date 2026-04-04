package com.cbs.wadiah.dto;

import com.cbs.wadiah.entity.WadiahDomainEnums;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InitiateWadiahApplicationRequest {

    private Long customerId;
    private Long newCustomerOnboardingId;

    @NotBlank
    private String productCode;

    @Builder.Default
    private String currencyCode = "SAR";

    private String branchCode;
    private String officerId;

    @Builder.Default
    private WadiahDomainEnums.OnboardingChannel channel = WadiahDomainEnums.OnboardingChannel.BRANCH;
}
