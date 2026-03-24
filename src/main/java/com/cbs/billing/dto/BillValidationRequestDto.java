package com.cbs.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillValidationRequestDto {

    @NotBlank(message = "Biller code is required")
    private String billerCode;

    @NotBlank(message = "Customer ID is required")
    private String customerId;
}
