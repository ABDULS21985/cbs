package com.cbs.nostro.dto;

import com.cbs.nostro.entity.PositionType;
import com.cbs.nostro.entity.ReconciliationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NostroPositionDto {

    private Long id;

    @NotNull(message = "Account ID is required")
    private Long accountId;

    private String accountNumber;

    @NotNull(message = "Correspondent bank ID is required")
    private Long correspondentBankId;

    private String correspondentBankName;
    private String correspondentSwiftBic;

    @NotNull(message = "Position type is required")
    private PositionType positionType;

    private String currencyCode;
    private BigDecimal bookBalance;
    private BigDecimal statementBalance;
    private BigDecimal unreconciledAmount;
    private LocalDate lastStatementDate;
    private LocalDate lastReconciledDate;
    private ReconciliationStatus reconciliationStatus;
    private Integer outstandingItemsCount;
    private BigDecimal creditLimit;
    private BigDecimal debitLimit;
    private Boolean isActive;
    private Instant createdAt;
}
