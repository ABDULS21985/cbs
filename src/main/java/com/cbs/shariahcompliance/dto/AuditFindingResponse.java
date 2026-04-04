package com.cbs.shariahcompliance.dto;

import com.cbs.shariahcompliance.entity.FindingCategory;
import com.cbs.shariahcompliance.entity.FindingSeverity;
import com.cbs.shariahcompliance.entity.RemediationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditFindingResponse {
    private Long id;
    private Long auditId;
    private String findingRef;
    private Long sampleId;
    private String title;
    private String titleAr;
    private String description;
    private String descriptionAr;
    private FindingCategory category;
    private FindingSeverity severity;
    private String shariahRuleViolated;
    private String impact;
    private String impactAr;
    private String recommendation;
    private String recommendationAr;
    private boolean hasSnciImplication;
    private BigDecimal snciAmount;
    private Long snciRecordId;
    private RemediationStatus remediationStatus;
    private String remediationOwner;
    private LocalDate remediationDueDate;
    private LocalDate remediationCompletedDate;
    private String remediationNotes;
    private String remediationVerifiedBy;
    private LocalDateTime remediationVerifiedAt;
    private String managementResponse;
    private String managementRespondedBy;
    private LocalDateTime managementRespondedAt;
    private boolean ssbAccepted;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version;
}
