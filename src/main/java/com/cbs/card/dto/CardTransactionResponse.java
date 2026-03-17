package com.cbs.card.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record CardTransactionResponse(
        Long id,
        String transactionRef,
        Long cardId,
        String cardReference,
        Long accountId,
        String accountNumber,
        String transactionType,
        String channel,
        BigDecimal amount,
        String currencyCode,
        BigDecimal billingAmount,
        String billingCurrency,
        BigDecimal fxRate,
        String merchantName,
        String merchantId,
        String merchantCategoryCode,
        String terminalId,
        String merchantCity,
        String merchantCountry,
        Boolean international,
        String authCode,
        String responseCode,
        String status,
        String declineReason,
        Boolean disputed,
        String disputeReason,
        LocalDate disputeDate,
        Instant transactionDate,
        LocalDate settlementDate
) {
}
