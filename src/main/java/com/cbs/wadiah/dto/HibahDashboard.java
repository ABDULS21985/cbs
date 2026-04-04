package com.cbs.wadiah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HibahDashboard {

    private BigDecimal totalDistributedYtd;
    private LocalDate lastDistributionDate;
    private BigDecimal averageRate;
    private long eligibleAccountCount;
    private List<String> patternAlerts;
}
