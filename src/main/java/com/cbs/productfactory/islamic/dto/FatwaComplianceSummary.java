package com.cbs.productfactory.islamic.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FatwaComplianceSummary {

    private int totalIslamicProducts;
    private int productsWithActiveFatwa;
    private int productsPendingFatwa;
    private int productsWithExpiredFatwa;
    private int productsWithNoFatwa;
    private int productsSuspendedDueToFatwa;
    @Builder.Default
    private List<ProductFatwaAlert> upcomingExpirations = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductFatwaAlert {
        private Long productId;
        private String productCode;
        private String productName;
        private Long fatwaId;
        private String fatwaReference;
        private LocalDate fatwaExpiryDate;
        private long daysToExpiry;
    }
}