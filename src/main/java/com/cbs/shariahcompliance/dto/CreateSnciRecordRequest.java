package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSnciRecordRequest {

    @NotBlank(message = "Detection method is required")
    private String detectionMethod;

    private String detectionSource;
    private String sourceTransactionRef;
    private String sourceContractRef;
    private String sourceContractType;
    private String sourceAccountCode;
    private String incomeType;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    @NotBlank(message = "Currency code is required")
    private String currencyCode;

    private LocalDate incomeDate;

    @NotBlank(message = "Non-compliance type is required")
    private String nonComplianceType;

    private String nonComplianceDescription;
    private String shariahRuleViolated;
    private Long alertId;
}
