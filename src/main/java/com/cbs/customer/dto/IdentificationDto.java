package com.cbs.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdentificationDto {

    private Long id;

    @NotBlank(message = "ID type is required")
    @Size(max = 30)
    private String idType;

    @NotBlank(message = "ID number is required")
    @Size(max = 50)
    private String idNumber;

    private LocalDate issueDate;
    private LocalDate expiryDate;

    @Size(max = 100)
    private String issuingAuthority;

    @Size(min = 3, max = 3)
    private String issuingCountry;

    private Boolean isPrimary;
    private Boolean isVerified;
    private Instant verifiedAt;

    @Size(max = 500)
    private String documentUrl;

    private Boolean expired;
}
