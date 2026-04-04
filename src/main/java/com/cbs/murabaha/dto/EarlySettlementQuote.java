package com.cbs.murabaha.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EarlySettlementQuote {

    private Long contractId;
    private String contractRef;
    private LocalDate settlementDate;
    private BigDecimal outstandingPrincipal;
    private BigDecimal recognisedButUnpaidProfit;
    private BigDecimal unrecognisedProfit;
    private BigDecimal remainingBalance;
    private BigDecimal ibraAmount;
    private BigDecimal settlementAmount;
    private String rebateMethod;
}
