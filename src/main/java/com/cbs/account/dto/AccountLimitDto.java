package com.cbs.account.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountLimitDto {

    private Long id;
    private String limitType;
    private BigDecimal limitValue;
    private BigDecimal previousValue;
    private String reason;
    private LocalDate effectiveDate;
    private String performedBy;
}
