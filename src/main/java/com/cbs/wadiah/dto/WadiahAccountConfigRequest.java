package com.cbs.wadiah.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WadiahAccountConfigRequest {

    private Boolean chequeBook;
    private Boolean debitCard;
    private Boolean onlineBanking;
    private Boolean mobileBanking;
    private Boolean smsAlerts;
    private Boolean eStatements;
    private Boolean sweepToInvestment;
    private Long sweepTargetAccountId;
    private BigDecimal sweepThreshold;
    private BigDecimal initialDeposit;
}
