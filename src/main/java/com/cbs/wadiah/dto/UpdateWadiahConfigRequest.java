package com.cbs.wadiah.dto;

import com.cbs.wadiah.entity.WadiahDomainEnums;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateWadiahConfigRequest {

    private Boolean hibahEligible;
    private Boolean hibahDisclosureSigned;
    private Boolean chequeBookEnabled;
    private Boolean debitCardEnabled;
    private Boolean standingOrdersEnabled;
    private Boolean sweepEnabled;
    private Long sweepTargetAccountId;
    private BigDecimal sweepThreshold;
    private Boolean onlineBankingEnabled;
    private Boolean mobileEnabled;
    private Boolean ussdEnabled;
    private Boolean dormancyExempt;
    private WadiahDomainEnums.StatementFrequency statementFrequency;
    private WadiahDomainEnums.PreferredLanguage preferredLanguage;
}
