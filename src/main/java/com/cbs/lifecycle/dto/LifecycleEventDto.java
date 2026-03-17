package com.cbs.lifecycle.dto;

import lombok.*;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LifecycleEventDto {
    private Long id;
    private Long accountId;
    private String eventType;
    private String oldStatus;
    private String newStatus;
    private String reason;
    private String performedBy;
    private Instant createdAt;
}
