package com.cbs.wadiah.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WadiahOnboardingResponse {

    private Long id;
    private String applicationRef;
    private Long customerId;
    private Long productTemplateId;
    private String productCode;
    private String currencyCode;
    private String branchCode;
    private String officerId;
    private String channel;
    private String status;
    private Integer currentStep;
    private List<Map<String, Object>> steps;
    private Boolean shariahDisclosurePresented;
    private Boolean shariahDisclosureAccepted;
    private Boolean hibahNonGuaranteeAcknowledged;
    private Boolean zakatObligationDisclosed;
    private Boolean kycVerified;
    private Boolean amlScreeningPassed;
    private Boolean duplicateCheckPassed;
    private String complianceNotes;
    private Map<String, Object> requestedFeatures;
    private Long accountId;
    private Long wadiahAccountId;
    private String contractReference;
    private String rejectionReason;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;
    private LocalDateTime expiresAt;
    private String disclosureText;
}
