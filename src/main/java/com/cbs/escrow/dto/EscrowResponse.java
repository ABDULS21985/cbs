package com.cbs.escrow.dto;

import com.cbs.escrow.entity.EscrowStatus;
import com.cbs.escrow.entity.EscrowType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EscrowResponse {
    private Long id;
    private String mandateNumber;
    private Long accountId;
    private String accountNumber;
    private Long customerId;
    private String customerDisplayName;
    private EscrowType escrowType;
    private String purpose;
    private String depositorName;
    private String beneficiaryName;
    private List<String> releaseConditions;
    private Boolean requiresMultiSign;
    private Integer requiredSignatories;
    private BigDecimal mandatedAmount;
    private BigDecimal releasedAmount;
    private BigDecimal remainingAmount;
    private String currencyCode;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private EscrowStatus status;
    private List<EscrowReleaseDto> releases;
    private Instant createdAt;
}
