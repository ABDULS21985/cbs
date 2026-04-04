package com.cbs.islamicaml.dto;

import com.cbs.islamicaml.entity.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicStrSarResponse {
    private Long id;
    private Long baseSarId;
    private String sarRef;
    private SarType sarType;
    private SarJurisdiction jurisdiction;
    private String templateVersion;
    private Long subjectCustomerId;
    private String subjectCustomerName;
    private String subjectCustomerType;
    private String subjectNationalId;
    private String subjectPassportNumber;
    private String subjectNationality;
    private String subjectAddress;
    private String islamicProductInvolved;
    private String islamicContractRef;
    private String islamicTypology;
    private Long shariahComplianceAlert;
    private List<Map<String, Object>> suspiciousTransactions;
    private BigDecimal totalSuspiciousAmount;
    private LocalDate suspiciousPeriodFrom;
    private LocalDate suspiciousPeriodTo;
    private String narrativeSummary;
    private List<String> suspiciousIndicators;
    private SarStatus status;
    private String preparedBy;
    private LocalDateTime preparedAt;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String mlroApprovedBy;
    private LocalDateTime mlroApprovedAt;
    private LocalDateTime filedAt;
    private SarFilingMethod filedVia;
    private String fiuReferenceNumber;
    private LocalDateTime fiuAcknowledgedAt;
    private String fiuResponseNotes;
    private List<Long> linkedAlertIds;
    private List<Long> linkedSanctionsResultIds;
    private List<Long> linkedShariahAlertIds;
    private LocalDate filingDeadline;
    private boolean isUrgent;
    private boolean deadlineBreach;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
}
