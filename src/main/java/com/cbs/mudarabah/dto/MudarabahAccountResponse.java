package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MudarabahAccountResponse {

    private Long id;
    private Long accountId;
    private String accountNumber;
    private String contractReference;
    private LocalDate contractSignedDate;
    private int contractVersion;
    private String contractTypeCode;
    private String mudarabahType;
    private String restrictionDetails;
    private String accountSubType;
    private BigDecimal profitSharingRatioCustomer;
    private BigDecimal profitSharingRatioBank;
    private LocalDateTime psrAgreedAt;
    private Long investmentPoolId;
    private String poolCode;
    private String poolName;
    private BigDecimal poolTotalBalance;
    private BigDecimal accountWeightInPool;
    private LocalDate poolJoinDate;
    private String weightageMethod;
    private LocalDate lastProfitDistributionDate;
    private BigDecimal lastProfitDistributionAmount;
    private BigDecimal cumulativeProfitReceived;
    private BigDecimal indicativeProfitRate;

    @Builder.Default
    private String lastDistributionRateDisclaimer = "Past performance does not indicate future returns";

    private boolean profitReinvest;
    private boolean lossExposure;
    private boolean lossDisclosureAccepted;
    private BigDecimal maximumLossExposure;
    private Integer tenorDays;
    private LocalDate maturityDate;
    private String maturityInstruction;
    private int rolloverCount;
    private boolean zakatApplicable;
    private boolean earlyWithdrawalAllowed;
    private String earlyWithdrawalPenalty;
    private String preferredLanguage;
    private String statementFrequency;

    @Builder.Default
    private String contractTypeName = "Mudarabah";

    @Builder.Default
    private String contractTypeNameAr = "المضاربة";

    private BigDecimal bookBalance;
    private BigDecimal availableBalance;
    private String status;
    private LocalDate openedDate;
}
