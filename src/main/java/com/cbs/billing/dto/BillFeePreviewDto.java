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
public class BillFeePreviewDto {

    private String billerCode;
    private BigDecimal amount;
    private BigDecimal fee;
    private BigDecimal commission;
    private BigDecimal totalDebit;
    private String feeBearer;
    private String commissionType;
}
