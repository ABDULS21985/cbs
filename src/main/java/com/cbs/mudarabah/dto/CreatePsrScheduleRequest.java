package com.cbs.mudarabah.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreatePsrScheduleRequest {

    private Long productTemplateId;

    @NotBlank(message = "Schedule name is required")
    private String scheduleName;

    @NotBlank(message = "Schedule type is required")
    private String scheduleType;

    private BigDecimal flatPsrCustomer;
    private BigDecimal flatPsrBank;
    private String decisionTableCode;

    @NotNull(message = "Effective from date is required")
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;
    private String approvedBy;
}
