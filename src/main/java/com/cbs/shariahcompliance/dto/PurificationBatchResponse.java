package com.cbs.shariahcompliance.dto;

import com.cbs.shariahcompliance.entity.PurificationBatchStatus;
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
public class PurificationBatchResponse {
    private Long id;
    private String batchRef;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private BigDecimal totalAmount;
    private String currencyCode;
    private int itemCount;
    private PurificationBatchStatus status;
    private String ssbApprovalRef;
    private String ssbApprovedBy;
    private LocalDateTime ssbApprovedAt;
    private String ssbComments;
    private LocalDateTime disbursedAt;
    private String disbursedBy;
    private BigDecimal totalDisbursed;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version;
}
