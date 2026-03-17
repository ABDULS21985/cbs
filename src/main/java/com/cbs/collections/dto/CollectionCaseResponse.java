package com.cbs.collections.dto;

import com.cbs.collections.entity.CollectionCaseStatus;
import com.cbs.collections.entity.CollectionPriority;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CollectionCaseResponse {
    private Long id;
    private String caseNumber;
    private Long loanAccountId;
    private String loanNumber;
    private Long customerId;
    private String customerDisplayName;
    private String assignedTo;
    private String assignedTeam;
    private CollectionPriority priority;
    private Integer daysPastDue;
    private BigDecimal overdueAmount;
    private BigDecimal totalOutstanding;
    private String currencyCode;
    private String delinquencyBucket;
    private CollectionCaseStatus status;
    private Integer escalationLevel;
    private String resolutionType;
    private BigDecimal resolutionAmount;
    private LocalDate resolvedDate;
    private List<CollectionActionDto> actions;
    private Instant createdAt;
}
