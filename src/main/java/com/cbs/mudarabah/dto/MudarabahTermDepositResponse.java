package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MudarabahTermDepositResponse {

    private Long id;
    private Long mudarabahAccountId;
    private String depositRef;
    private BigDecimal principalAmount;
    private String currencyCode;
    private int tenorDays;
    private int tenorMonths;
    private LocalDate startDate;
    private LocalDate maturityDate;
    private String maturityDateHijri;
    private BigDecimal psrCustomer;
    private BigDecimal psrBank;
    private String profitDistributionFrequency;
    private LocalDate lastProfitDistributionDate;
    private BigDecimal accumulatedProfit;
    private BigDecimal estimatedMaturityAmount;
    private BigDecimal actualMaturityAmount;
    private Long investmentPoolId;
    private LocalDate poolEntryDate;
    private LocalDate poolExitDate;
    private String maturityInstruction;
    private Long payoutAccountId;
    private boolean autoRenew;
    private int rolloverCount;
    private String originalDepositRef;
    private boolean earlyWithdrawalAllowed;
    private String earlyWithdrawalPenaltyType;
    private String status;
    private LocalDate maturedAt;
    private boolean hasLien;
    private String lienReference;
    private BigDecimal lienAmount;
    private String contractReference;
    private String accountNumber;
    private BigDecimal bookBalance;
}
