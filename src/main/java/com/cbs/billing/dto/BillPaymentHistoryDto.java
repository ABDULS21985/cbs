package com.cbs.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillPaymentHistoryDto {

    private Long id;
    private String transactionRef;
    private String billerName;
    private String billerCode;
    private String categoryCode;
    private BigDecimal amount;
    private BigDecimal fee;
    private BigDecimal totalDebit;
    private String status;
    private String token;
    private String confirmationNumber;
    private String customerReference;
    private Instant paidAt;
}
