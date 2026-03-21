package com.cbs.marketdata.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketPriceDto {
    private Long id;
    private String instrumentCode;
    private String priceType;
    private BigDecimal price;
    private String currency;
    private String source;
    private LocalDate priceDate;
    private Instant priceTime;
    private Instant createdAt;

    public static MarketPriceDto from(com.cbs.marketdata.entity.MarketPrice entity) {
        if (entity == null) return null;
        return MarketPriceDto.builder()
                .id(entity.getId())
                .instrumentCode(entity.getInstrumentCode())
                .priceType(entity.getPriceType())
                .price(entity.getPrice())
                .currency(entity.getCurrency())
                .source(entity.getSource())
                .priceDate(entity.getPriceDate())
                .priceTime(entity.getPriceTime())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
