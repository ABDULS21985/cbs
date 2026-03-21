package com.cbs.card.dto;

import com.cbs.card.entity.Card;
import com.cbs.card.entity.CardTransaction;

import java.util.List;

/**
 * Maps Card JPA entities to response DTOs — avoids exposing entity internals
 * (lazy proxies, internal audit columns) through the API.
 */
public final class CardMapper {

    private CardMapper() {}

    public static CardResponse toResponse(Card c) {
        if (c == null) return null;
        return new CardResponse(
                c.getId(),
                c.getCardReference(),
                c.getCardNumberMasked(),
                c.getAccount() != null ? c.getAccount().getId() : null,
                c.getAccount() != null ? c.getAccount().getAccountNumber() : null,
                c.getCustomer() != null ? c.getCustomer().getId() : null,
                c.getCustomer() != null ? c.getCustomer().getDisplayName() : null,
                c.getCardType(),
                c.getCardScheme(),
                c.getCardTier(),
                c.getCardholderName(),
                c.getIssueDate(),
                c.getExpiryDate(),
                c.getLastUsedDate(),
                c.getDailyPosLimit(),
                c.getDailyAtmLimit(),
                c.getDailyOnlineLimit(),
                c.getSingleTxnLimit(),
                c.getMonthlyLimit(),
                c.getCreditLimit(),
                c.getAvailableCredit(),
                c.getOutstandingBalance(),
                c.getIsContactlessEnabled(),
                c.getIsOnlineEnabled(),
                c.getIsInternationalEnabled(),
                c.getIsAtmEnabled(),
                c.getIsPosEnabled(),
                c.getPinRetriesRemaining(),
                c.getStatus(),
                c.getBlockReason(),
                c.getCurrencyCode(),
                c.getBranchCode(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }

    public static List<CardResponse> toResponseList(List<Card> cards) {
        return cards.stream().map(CardMapper::toResponse).toList();
    }

    public static CardTransactionResponse toTxnResponse(CardTransaction t) {
        if (t == null) return null;
        return new CardTransactionResponse(
                t.getId(),
                t.getTransactionRef(),
                t.getCard() != null ? t.getCard().getId() : null,
                t.getCard() != null ? t.getCard().getCardReference() : null,
                t.getAccount() != null ? t.getAccount().getId() : null,
                t.getAccount() != null ? t.getAccount().getAccountNumber() : null,
                t.getTransactionType(),
                t.getChannel(),
                t.getAmount(),
                t.getCurrencyCode(),
                t.getBillingAmount(),
                t.getBillingCurrency(),
                t.getFxRate(),
                t.getMerchantName(),
                t.getMerchantId(),
                t.getMerchantCategoryCode(),
                t.getTerminalId(),
                t.getMerchantCity(),
                t.getMerchantCountry(),
                t.getIsInternational(),
                t.getAuthCode(),
                t.getResponseCode(),
                t.getStatus(),
                t.getDeclineReason(),
                t.getIsDisputed(),
                t.getDisputeReason(),
                t.getDisputeDate(),
                t.getTransactionDate(),
                t.getSettlementDate()
        );
    }

    public static List<CardTransactionResponse> toTxnResponseList(List<CardTransaction> txns) {
        return txns.stream().map(CardMapper::toTxnResponse).toList();
    }
}
