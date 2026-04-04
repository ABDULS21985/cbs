package com.cbs.shariah.dto;

import com.cbs.shariah.entity.ReviewRequestStatus;
import com.cbs.shariah.entity.ReviewRequestType;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReviewRequestResponse {
    private Long id;
    private String requestCode;
    private ReviewRequestType requestType;
    private String title;
    private String description;
    private String submittedBy;
    private Instant submittedAt;
    private List<Long> assignedMemberIds;
    private Integer requiredQuorum;
    private Integer currentApprovals;
    private Integer currentRejections;
    private Long linkedFatwaId;
    private String linkedProductCode;
    private String linkedTransactionRef;
    private String reviewNotes;
    private String resolutionNotes;
    private Instant resolvedAt;
    private String resolvedBy;
    private ReviewRequestStatus status;
    private String priority;
    private Instant slaDeadline;
    private Instant createdAt;
    private Instant updatedAt;
    private List<VoteResponse> votes;
}
