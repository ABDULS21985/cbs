package com.cbs.escrow.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EscrowReleaseDto {
    private Long id;
    private BigDecimal releaseAmount;
    private Long releaseToAccountId;
    private String releaseToAccountNumber;
    private String releaseReason;
    private String approvedBy;
    private Instant approvalDate;
    private String transactionRef;
    private String status;
    private Instant createdAt;
}
