package com.cbs.wadiah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WadiahAccountResponse {

    private Long id;
    private Long accountId;
    private String accountNumber;
    private Long customerId;
    private String customerName;
    private String productCode;
    private String productName;
    private String currencyCode;
    private String status;
    private BigDecimal bookBalance;
    private BigDecimal availableBalance;
    private LocalDate openedDate;
    private String contractReference;
    private LocalDate contractSignedDate;
    private Integer contractVersion;
    private String contractTypeCode;
    private String wadiahType;
    private Boolean principalGuaranteed;
    private Boolean profitContractuallyPromised;
    private Boolean hibahEligible;
    private Boolean hibahDisclosureSigned;
    private LocalDate hibahDisclosureDate;
    private BigDecimal minimumBalance;
    private Boolean chequeBookEnabled;
    private Boolean debitCardEnabled;
    private Boolean standingOrdersEnabled;
    private Boolean sweepEnabled;
    private Long sweepTargetAccountId;
    private BigDecimal sweepThreshold;
    private Boolean onlineBankingEnabled;
    private Boolean mobileEnabled;
    private Boolean ussdEnabled;
    private LocalDate lastHibahDistributionDate;
    private BigDecimal totalHibahReceived;
    private Boolean hibahFrequencyWarning;
    private Boolean zakatApplicable;
    private LocalDate lastZakatCalculationDate;
    private Boolean dormancyExempt;
    private LocalDate lastActivityDate;
    private String statementFrequency;
    private String preferredLanguage;
}
