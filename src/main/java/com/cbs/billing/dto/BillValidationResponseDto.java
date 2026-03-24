package com.cbs.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillValidationResponseDto {

    private boolean referenceValid;
    private String customerId;
    private String customerName;
    private String billerCode;
    private BigDecimal outstandingBalance;
    private String meterToken;
}
