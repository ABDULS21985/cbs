package com.cbs.murabaha.dto;

import com.cbs.murabaha.entity.MurabahaInstallment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MurabahaRepaymentSummary {

    private Long contractId;
    private String contractRef;
    private BigDecimal financedAmount;
    private BigDecimal totalPaid;
    private BigDecimal principalPaid;
    private BigDecimal profitPaid;
    private BigDecimal latePenaltyPaid;
    private BigDecimal remainingBalance;
    private BigDecimal overdueAmount;
    private BigDecimal completionPercentage;
    private MurabahaInstallment nextDueInstallment;
}
