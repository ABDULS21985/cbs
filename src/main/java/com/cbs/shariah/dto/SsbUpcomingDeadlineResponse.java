package com.cbs.shariah.dto;

import com.cbs.shariah.entity.ReviewRequestStatus;
import lombok.*;

import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbUpcomingDeadlineResponse {
    private Long reviewId;
    private String requestCode;
    private String title;
    private String priority;
    private ReviewRequestStatus status;
    private Instant slaDeadline;
}
