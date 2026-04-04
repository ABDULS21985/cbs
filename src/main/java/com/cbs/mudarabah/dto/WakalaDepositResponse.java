package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WakalaDepositResponse {

    private Long id;
    private Long accountId;
    private String accountNumber;
    private String contractReference;
    private LocalDate contractSignedDate;
    private String contractTypeCode;
    private String wakalaType;
    private BigDecimal wakalahFeeRate;
    private BigDecimal wakalahFeeAmount;
    private String feeFrequency;
    private BigDecimal feeAccrued;
    private BigDecimal totalFeesCharged;
    private String investmentMandate;
    private String investmentMandateAr;
    private BigDecimal targetReturnRate;
    private BigDecimal expectedProfitRate;
    private String riskLevel;
    private String accountSubType;
    private Integer tenorDays;
    private LocalDate maturityDate;
    private String maturityInstruction;
    private Long investmentPoolId;
    private LocalDate poolJoinDate;
    private LocalDate lastProfitDistributionDate;
    private BigDecimal cumulativeProfitReceived;
    private BigDecimal cumulativeFeesDeducted;
    private boolean lossExposure;
    private boolean lossDisclosureAccepted;
    private boolean bankNegligenceLiability;
    private boolean earlyWithdrawalAllowed;
    private BigDecimal bookBalance;
    private BigDecimal availableBalance;
    private String status;
    private LocalDate openedDate;
}
