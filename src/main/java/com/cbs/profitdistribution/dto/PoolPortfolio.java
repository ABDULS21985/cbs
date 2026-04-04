package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolPortfolio {

    private Long poolId;
    private String poolCode;
    private List<PoolAssetAssignmentResponse> assets;
    private BigDecimal totalAssigned;
    private Map<String, BigDecimal> compositionByType;
    private Map<String, BigDecimal> compositionPercentage;
}
