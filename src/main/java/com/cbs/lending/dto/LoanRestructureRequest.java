package com.cbs.lending.dto;

import com.cbs.lending.entity.RepaymentScheduleType;
import com.cbs.lending.entity.RestructureType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanRestructureRequest {
    @NotNull private RestructureType restructureType;
    private BigDecimal newInterestRate;
    private Integer newTenureMonths;
    private RepaymentScheduleType newScheduleType;
    private Integer moratoriumMonths;
    private String interestDuringMoratorium;
    private BigDecimal writeOffAmount;
    @NotBlank private String reason;
}
