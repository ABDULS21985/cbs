package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateSarRequest {

    @NotBlank(message = "SAR type is required")
    private String sarType;

    @NotNull(message = "Subject customer ID is required")
    private Long subjectCustomerId;

    private String islamicProductInvolved;
    private String islamicContractRef;
    private String islamicTypology;
    private List<Map<String, Object>> suspiciousTransactions;
    private BigDecimal totalSuspiciousAmount;
    private LocalDate suspiciousPeriodFrom;
    private LocalDate suspiciousPeriodTo;

    @NotBlank(message = "Narrative summary is required")
    private String narrativeSummary;

    private List<String> suspiciousIndicators;
    private List<Long> linkedAlertIds;
    private boolean isUrgent;
}
