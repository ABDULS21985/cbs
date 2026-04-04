package com.cbs.shariah.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbDashboardResponse {
    private long activeMembers;
    private long pendingReviews;
    private long approvedThisMonth;
    private long rejectedThisMonth;
    private double avgResolutionDays;
    private Map<String, Long> reviewsByCategory;
    private List<SsbUpcomingDeadlineResponse> upcomingDeadlines;
}
