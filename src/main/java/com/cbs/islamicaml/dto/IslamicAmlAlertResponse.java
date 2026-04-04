package com.cbs.islamicaml.dto;

import com.cbs.islamicaml.entity.IslamicAmlAlertStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicAmlAlertResponse {
    private Long id;
    private Long baseAlertId;
    private String alertRef;
    private Long ruleId;
    private String ruleCode;
    private LocalDateTime detectionDate;
    private Long customerId;
    private String customerName;
    private Map<String, Object> islamicContext;
    private List<String> involvedTransactions;
    private List<String> involvedContracts;
    private List<String> involvedAccounts;
    private BigDecimal totalAmountInvolved;
    private String currencyCode;
    private BigDecimal riskScore;
    private String assessmentNotes;
    private IslamicAmlAlertStatus status;
    private String assignedTo;
    private LocalDateTime assignedAt;
    private String investigatedBy;
    private String investigationNotes;
    private boolean sarFiled;
    private String sarReference;
    private String closedBy;
    private LocalDateTime closedAt;
    private String closureReason;
    private LocalDateTime slaDeadline;
    private boolean slaBreach;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
}
