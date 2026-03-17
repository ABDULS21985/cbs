package com.cbs.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KycVerificationRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "ID type is required")
    private String idType;

    @NotBlank(message = "ID number is required")
    private String idNumber;

    private String firstName;
    private String lastName;
    private String dateOfBirth;
}

