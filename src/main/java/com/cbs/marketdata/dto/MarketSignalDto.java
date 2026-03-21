package com.cbs.marketdata.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketSignalDto {
    private Long id;
    private String signalCode;
    private String instrumentCode;
    private String instrumentName;
    private String signalType;
    private String signalDirection;
    private BigDecimal confidencePct;
    private String signalStrength;
    private List<String> indicatorsUsed;
    private String analysisSummary;
    private BigDecimal targetPrice;
    private BigDecimal stopLoss;
    private String timeHorizon;
    private LocalDate signalDate;
    private LocalDate expiresAt;
    private String status;

    public static MarketSignalDto from(com.cbs.marketdata.entity.MarketSignal entity) {
        if (entity == null) return null;
        return MarketSignalDto.builder()
                .id(entity.getId())
                .signalCode(entity.getSignalCode())
                .instrumentCode(entity.getInstrumentCode())
                .instrumentName(entity.getInstrumentName())
                .signalType(entity.getSignalType())
                .signalDirection(entity.getSignalDirection())
                .confidencePct(entity.getConfidencePct())
                .signalStrength(entity.getSignalStrength())
                .indicatorsUsed(entity.getIndicatorsUsed())
                .analysisSummary(entity.getAnalysisSummary())
                .targetPrice(entity.getTargetPrice())
                .stopLoss(entity.getStopLoss())
                .timeHorizon(entity.getTimeHorizon())
                .signalDate(entity.getSignalDate())
                .expiresAt(entity.getExpiresAt())
                .status(entity.getStatus())
                .build();
    }
}
