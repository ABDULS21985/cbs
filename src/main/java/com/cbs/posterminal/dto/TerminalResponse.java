package com.cbs.posterminal.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerminalResponse {

    private Long id;
    private String terminalId;
    private String terminalType;
    private String merchantId;
    private String merchantName;
    private String merchantCategoryCode;
    private String locationAddress;
    private Boolean supportsContactless;
    private Boolean supportsChip;
    private Boolean supportsMagstripe;
    private Boolean supportsPin;
    private Boolean supportsQr;
    private BigDecimal maxTransactionAmount;
    private String acquiringBankCode;
    private Long settlementAccountId;
    private String batchSettlementTime;
    private Instant lastTransactionAt;
    private Integer transactionsToday;
    private String operationalStatus;
    private Instant lastHeartbeatAt;
    private String softwareVersion;
    private Instant createdAt;
    private Instant updatedAt;
}
