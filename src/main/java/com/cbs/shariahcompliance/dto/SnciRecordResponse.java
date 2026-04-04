package com.cbs.shariahcompliance.dto;

import com.cbs.shariahcompliance.entity.DetectionMethod;
import com.cbs.shariahcompliance.entity.NonComplianceType;
import com.cbs.shariahcompliance.entity.QuarantineStatus;
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
public class SnciRecordResponse {
    private Long id;
    private String snciRef;
    private LocalDate detectionDate;
    private DetectionMethod detectionMethod;
    private String detectionSource;
    private String sourceTransactionRef;
    private String sourceContractRef;
    private String sourceContractType;
    private String sourceAccountCode;
    private String incomeType;
    private BigDecimal amount;
    private String currencyCode;
    private LocalDate incomeDate;
    private NonComplianceType nonComplianceType;
    private String nonComplianceDescription;
    private String nonComplianceDescriptionAr;
    private String shariahRuleViolated;
    private String ssbRulingRef;
    private QuarantineStatus quarantineStatus;
    private LocalDateTime quarantinedAt;
    private String quarantineJournalRef;
    private String quarantineGlAccount;
    private Long purificationBatchId;
    private LocalDateTime purifiedAt;
    private String purificationJournalRef;
    private String charityRecipient;
    private String approvedForPurificationBy;
    private LocalDateTime approvedForPurificationAt;
    private String disputedBy;
    private String disputeReason;
    private String disputeResolvedBy;
    private LocalDateTime disputeResolvedAt;
    private Long alertId;
    private Long auditFindingId;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version;
}
