package com.cbs.card.dto;

import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.CardStatus;
import com.cbs.card.entity.CardType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record CardResponse(
        Long id,
        String cardReference,
        String cardNumberMasked,
        Long accountId,
        String accountNumber,
        Long customerId,
        String customerDisplayName,
        CardType cardType,
        CardScheme cardScheme,
        String cardTier,
        String cardholderName,
        LocalDate issueDate,
        LocalDate expiryDate,
        LocalDate lastUsedDate,
        BigDecimal dailyPosLimit,
        BigDecimal dailyAtmLimit,
        BigDecimal dailyOnlineLimit,
        BigDecimal singleTxnLimit,
        BigDecimal monthlyLimit,
        BigDecimal creditLimit,
        BigDecimal availableCredit,
        BigDecimal outstandingBalance,
        Boolean contactlessEnabled,
        Boolean onlineEnabled,
        Boolean internationalEnabled,
        Boolean atmEnabled,
        Boolean posEnabled,
        Integer pinRetriesRemaining,
        CardStatus status,
        String blockReason,
        String currencyCode,
        String branchCode,
        Instant createdAt,
        Instant updatedAt
) {
}
