package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolPerformanceReport {

    private Long poolId;
    private String poolCode;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private BigDecimal totalGrossProfit;
    private BigDecimal totalDistributedToCustomers;
    private BigDecimal totalBankShare;
    private BigDecimal totalPerRetained;
    private BigDecimal totalIrrRetained;
    private int participantCount;
    private BigDecimal averageEffectiveRate;
    private List<PoolProfitAllocationResponse> allocations;
}
