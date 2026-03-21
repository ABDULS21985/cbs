package com.cbs.account.dto;

import com.cbs.account.entity.TransactionType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {

    private Long id;
    private String transactionRef;
    private String reference;
    private String accountNumber;
    private TransactionType transactionType;
    private String type;
    private BigDecimal amount;
    private String currencyCode;
    private BigDecimal runningBalance;
    private String narration;
    private String description;
    private LocalDate valueDate;
    private LocalDate postingDate;
    private String dateTime;
    private String contraAccountNumber;
    private String channel;
    private String externalRef;
    private String status;
    private Boolean isReversed;
    private Instant createdAt;
    private String createdBy;
    private String fromAccount;
    private String fromAccountName;
    private String toAccount;
    private String toAccountName;
    private BigDecimal debitAmount;
    private BigDecimal creditAmount;
    private BigDecimal fee;
    private List<GlEntryDto> glEntries;
}
