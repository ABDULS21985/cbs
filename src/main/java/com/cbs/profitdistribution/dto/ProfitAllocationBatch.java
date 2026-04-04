package com.cbs.profitdistribution.dto;

import com.cbs.mudarabah.dto.PoolProfitAllocationResponse;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProfitAllocationBatch {

    private Long batchId;
    private Long poolId;
    private String poolCode;
    private Long profitCalculationId;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private BigDecimal depositorPoolBeforeReserves;
    private BigDecimal perAdjustment;
    private BigDecimal irrDeduction;
    private BigDecimal depositorPoolAfterReserves;
    private int participantCount;
    private BigDecimal totalCustomerProfit;
    private BigDecimal totalBankProfit;
    private BigDecimal averageEffectiveRate;
    private BigDecimal minimumEffectiveRate;
    private BigDecimal maximumEffectiveRate;
    private BigDecimal roundingAdjustment;
    private boolean isLoss;
    private String status;
    private ConservationCheck conservationCheck;
    private List<PoolProfitAllocationResponse> allocations;
}
