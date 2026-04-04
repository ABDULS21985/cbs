package com.cbs.shariah.dto;

import com.cbs.shariah.entity.ReviewRequestType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateReviewRequest {

    @NotNull(message = "Request type is required")
    private ReviewRequestType requestType;

    @NotBlank(message = "Title is required")
    @Size(max = 300)
    private String title;

    private String description;

    @NotEmpty(message = "At least one member must be assigned")
    private List<Long> assignedMemberIds;

    @Min(value = 1, message = "Quorum must be at least 1")
    private Integer requiredQuorum;

    private Long linkedFatwaId;

    @Size(max = 60)
    private String linkedProductCode;

    @Size(max = 60)
    private String linkedTransactionRef;

    private String priority;

    private Instant slaDeadline;

    @JsonIgnore
    @AssertTrue(message = "Required quorum must be less than or equal to the number of assigned members")
    public boolean isRequiredQuorumValid() {
        return requiredQuorum == null || assignedMemberIds == null || requiredQuorum <= assignedMemberIds.size();
    }

    @JsonIgnore
    @AssertTrue(message = "Assigned members must be unique")
    public boolean areAssignedMembersUnique() {
        return assignedMemberIds == null || new HashSet<>(assignedMemberIds).size() == assignedMemberIds.size();
    }

    @JsonIgnore
    @AssertTrue(message = "Priority must be one of NORMAL, HIGH, or URGENT")
    public boolean isPriorityValid() {
        if (priority == null || priority.isBlank()) {
            return true;
        }
        return Set.of("NORMAL", "HIGH", "URGENT").contains(priority.toUpperCase(Locale.ROOT));
    }
}
