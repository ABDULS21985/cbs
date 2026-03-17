package com.cbs.account.dto;

import com.cbs.account.entity.SignatoryType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignatoryDto {

    private Long id;

    @NotNull(message = "Customer ID is required for signatory")
    private Long customerId;

    private String customerCifNumber;
    private String customerDisplayName;

    @NotNull(message = "Signatory type is required")
    private SignatoryType signatoryType;

    private String signingRule;
    private Boolean isActive;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
