package com.cbs.shariahcompliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurificationReport {
    private BigDecimal totalPurified;
    private Map<String, BigDecimal> byType;
    private Map<String, BigDecimal> byCharity;
    private BigDecimal outstandingBalance;
    private LocalDate periodFrom;
    private LocalDate periodTo;
}
