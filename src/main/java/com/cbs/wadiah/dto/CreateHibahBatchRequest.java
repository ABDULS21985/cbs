package com.cbs.wadiah.dto;

import com.cbs.wadiah.entity.WadiahDomainEnums;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateHibahBatchRequest {

    @NotNull
    private LocalDate distributionDate;

    @NotNull
    private LocalDate periodFrom;

    @NotNull
    private LocalDate periodTo;

    private BigDecimal totalDistributionAmount;
    private BigDecimal flatAmount;
    private BigDecimal proposedRate;

    @NotNull
    private WadiahDomainEnums.HibahDistributionMethod distributionMethod;

    private String decisionTableCode;

    @NotNull
    private WadiahDomainEnums.HibahFundingSource fundingSource;

    private String notes;
    private String currencyCode;

    @Builder.Default
    private Map<Long, BigDecimal> manualAmounts = new LinkedHashMap<>();
}
