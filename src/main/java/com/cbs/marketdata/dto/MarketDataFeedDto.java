package com.cbs.marketdata.dto;

import lombok.*;
import java.time.Instant;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketDataFeedDto {
    private Long id;
    private String feedCode;
    private String feedName;
    private String provider;
    private String feedType;
    private String dataCategory;
    private List<String> instrumentsCovered;
    private Integer updateFrequencySec;
    private String connectionProtocol;
    private String endpointUrl;
    private Instant lastUpdateAt;
    private Integer recordsToday;
    private Integer errorCountToday;
    private Boolean isActive;
    private String status;

    public static MarketDataFeedDto from(com.cbs.marketdata.entity.MarketDataFeed entity) {
        if (entity == null) return null;
        return MarketDataFeedDto.builder()
                .id(entity.getId())
                .feedCode(entity.getFeedCode())
                .feedName(entity.getFeedName())
                .provider(entity.getProvider())
                .feedType(entity.getFeedType())
                .dataCategory(entity.getDataCategory())
                .instrumentsCovered(entity.getInstrumentsCovered())
                .updateFrequencySec(entity.getUpdateFrequencySec())
                .connectionProtocol(entity.getConnectionProtocol())
                .endpointUrl(entity.getEndpointUrl())
                .lastUpdateAt(entity.getLastUpdateAt())
                .recordsToday(entity.getRecordsToday())
                .errorCountToday(entity.getErrorCountToday())
                .isActive(entity.getIsActive())
                .status(entity.getStatus())
                .build();
    }
}
