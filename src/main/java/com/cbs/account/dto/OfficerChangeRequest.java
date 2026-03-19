package com.cbs.account.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfficerChangeRequest {

    @NotBlank(message = "Officer ID is required")
    private String officerId;

    @NotBlank(message = "Officer name is required")
    private String officerName;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;
}
