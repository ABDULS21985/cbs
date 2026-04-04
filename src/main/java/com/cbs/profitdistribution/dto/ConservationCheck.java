package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConservationCheck {

    private BigDecimal inputAmount;
    private BigDecimal sumOfAllocations;
    private BigDecimal difference;
    private boolean isPassing;
    private BigDecimal tolerance;
    private String status;
}
