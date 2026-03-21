package com.cbs.nostro.dto;

import lombok.*;

import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreakTimelineDto {
    private Long id;
    private Instant timestamp;
    private String actor;
    private String action;
    private String notes;
    private String type;   // INFO, ACTION, RESOLVED, ESCALATED
}
