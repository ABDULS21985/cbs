package com.cbs.customer.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BvnVerificationRequest {

    private Long customerId;

    @NotBlank(message = "BVN is required")
    private String bvn;

    private String firstName;
    private String lastName;
    private String dateOfBirth;
}
