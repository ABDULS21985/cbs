package com.cbs.channel.dto;

import lombok.*;
import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InteractionResponse {
    private Long id;
    private Long servicePointId;
    private Long customerId;
    private Long sessionId;
    private String interactionType;
    private String channelUsed;
    private Boolean staffAssisted;
    private String staffId;
    private Instant startedAt;
    private Instant endedAt;
    private Integer durationSeconds;
    private Integer customerSatisfactionScore;
    private String feedbackComment;
    private String outcome;
    private Instant createdAt;
}
