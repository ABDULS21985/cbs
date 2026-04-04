package com.cbs.productfactory.islamic.dto;

import lombok.*;

import java.util.LinkedHashMap;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IslamicProductCatalogueSummary {

    private int totalProducts;
    private int activeProducts;
    private int compliantProducts;
    private int pendingFatwaProducts;
    private int suspendedProducts;
    @Builder.Default
    private Map<String, Integer> productsByCategory = new LinkedHashMap<>();
    @Builder.Default
    private Map<String, Integer> productsByContractType = new LinkedHashMap<>();
    @Builder.Default
    private Map<String, Integer> productsByComplianceStatus = new LinkedHashMap<>();
}