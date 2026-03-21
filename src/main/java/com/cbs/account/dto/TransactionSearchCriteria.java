package com.cbs.account.dto;

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
public class TransactionSearchCriteria {

    private String search;
    private String accountNumber;
    private String customerId;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private BigDecimal amountFrom;
    private BigDecimal amountTo;
    private String type;
    private String channel;
    private String status;
}
