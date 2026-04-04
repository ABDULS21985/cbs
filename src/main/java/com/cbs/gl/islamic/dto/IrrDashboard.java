package com.cbs.gl.islamic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IrrDashboard {
    @Builder.Default
    private BigDecimal totalIrrAcrossPools = BigDecimal.ZERO;
    @Builder.Default
    private List<String> poolsNearMaximum = new ArrayList<>();
    @Builder.Default
    private List<String> recentLossAbsorptionEvents = new ArrayList<>();
}
