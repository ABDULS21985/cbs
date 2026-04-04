package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WakalaFeeDistributionResponse {

    private Long accountId;
    private String accountNumber;
    private BigDecimal grossProfit;
    private BigDecimal wakalahFee;
    private BigDecimal customerProfit;
    private BigDecimal effectiveRate;
    private LocalDate periodFrom;
    private LocalDate periodTo;
}
