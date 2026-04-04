package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MudarabahTDSearchCriteria {

    private String status;
    private Long investmentPoolId;
    private Long customerId;
    private LocalDate maturityDateFrom;
    private LocalDate maturityDateTo;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    private Integer minTenorDays;
    private Integer maxTenorDays;
}
