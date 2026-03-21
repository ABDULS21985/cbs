package com.cbs.merchant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuspendMerchantRequest {

    @NotBlank(message = "Suspension reason is required")
    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;
}
