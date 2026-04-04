package com.cbs.mudarabah.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InitiatePsrChangeRequest {

    @NotNull(message = "Account ID is required")
    private Long accountId;

    @NotNull(message = "Mudarabah account ID is required")
    private Long mudarabahAccountId;

    @NotNull(message = "Proposed PSR customer is required")
    private BigDecimal proposedPsrCustomer;

    @NotNull(message = "Proposed PSR bank is required")
    private BigDecimal proposedPsrBank;

    @NotBlank(message = "Change reason is required")
    private String changeReason;

    private String reasonDescription;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;
}
