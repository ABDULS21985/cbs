package com.cbs.card.issuer;

import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.CardType;

import java.time.LocalDate;

public record CardPanIssueCommand(
        String cardReference,
        Long accountId,
        Long customerId,
        CardType cardType,
        CardScheme cardScheme,
        String cardTier,
        String cardholderName,
        String branchCode,
        String currencyCode,
        LocalDate expiryDate
) {
}