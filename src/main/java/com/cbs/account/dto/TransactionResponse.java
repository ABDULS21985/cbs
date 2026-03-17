package com.cbs.account.dto;

import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {

    private Long id;
    private String transactionRef;
    private String accountNumber;
    private TransactionType transactionType;
    private BigDecimal amount;
    private String currencyCode;
    private BigDecimal runningBalance;
    private String narration;
    private LocalDate valueDate;
    private LocalDate postingDate;
    private String contraAccountNumber;
    private TransactionChannel channel;
    private String externalRef;
    private String status;
    private Boolean isReversed;
    private Instant createdAt;
    private String createdBy;
}
