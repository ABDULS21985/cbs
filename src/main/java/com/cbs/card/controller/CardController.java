package com.cbs.card.controller;

import com.cbs.card.dto.CardResponse;
import com.cbs.card.dto.CardTransactionResponse;
import com.cbs.card.entity.*;
import com.cbs.card.service.CardService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.web.CbsPageRequestFactory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/cards")
@RequiredArgsConstructor
@Tag(name = "Card Management", description = "Issuance, controls, authorization, transactions, disputes")
public class CardController {

    private final CardService cardService;
    private final CbsPageRequestFactory pageRequestFactory;

    @PostMapping
    @Operation(summary = "Issue a new card")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardResponse>> issueCard(
            @RequestParam Long accountId, @RequestParam CardType cardType, @RequestParam CardScheme cardScheme,
            @RequestParam(required = false) String cardTier, @RequestParam String cardholderName,
            @RequestParam(required = false) LocalDate expiryDate,
            @RequestParam(required = false) BigDecimal dailyPosLimit,
            @RequestParam(required = false) BigDecimal dailyAtmLimit,
            @RequestParam(required = false) BigDecimal dailyOnlineLimit,
            @RequestParam(required = false) BigDecimal singleTxnLimit,
            @RequestParam(required = false) BigDecimal creditLimit) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                toCardResponse(cardService.issueCard(accountId, cardType, cardScheme, cardTier, cardholderName,
                        expiryDate, dailyPosLimit, dailyAtmLimit, dailyOnlineLimit, singleTxnLimit, creditLimit))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<CardResponse>> getCard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(toCardResponse(cardService.getCard(id))));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CardResponse>>> getCustomerCards(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Card> result = cardService.getCustomerCards(customerId, pageRequestFactory.create(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent().stream().map(this::toCardResponse).toList(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(toCardResponse(cardService.activateCard(id))));
    }

    @PostMapping("/{id}/block")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardResponse>> block(@PathVariable Long id, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(toCardResponse(cardService.blockCard(id, reason))));
    }

    @PostMapping("/{id}/hotlist")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardResponse>> hotlist(@PathVariable Long id, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(toCardResponse(cardService.hotlistCard(id, reason))));
    }

    @PatchMapping("/{id}/controls")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardResponse>> updateControls(@PathVariable Long id,
            @RequestParam(required = false) Boolean contactless, @RequestParam(required = false) Boolean online,
            @RequestParam(required = false) Boolean international, @RequestParam(required = false) Boolean atm,
            @RequestParam(required = false) Boolean pos) {
        return ResponseEntity.ok(ApiResponse.ok(toCardResponse(
                cardService.updateControls(id, contactless, online, international, atm, pos))));
    }

    @PostMapping("/{cardId}/authorize")
    @Operation(summary = "Authorize a card transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardTransactionResponse>> authorize(@PathVariable Long cardId,
            @RequestParam String transactionType, @RequestParam String channel,
            @RequestParam BigDecimal amount, @RequestParam String currencyCode,
            @RequestParam(required = false) String merchantName, @RequestParam(required = false) String merchantId,
            @RequestParam(required = false) String mcc, @RequestParam(required = false) String terminalId,
            @RequestParam(required = false) String merchantCity, @RequestParam(required = false) String merchantCountry) {
        return ResponseEntity.ok(ApiResponse.ok(toCardTransactionResponse(
                cardService.authorizeTransaction(cardId, transactionType, channel,
                        amount, currencyCode, merchantName, merchantId, mcc, terminalId, merchantCity, merchantCountry))));
    }

    @PostMapping("/transactions/{txnId}/dispute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardTransactionResponse>> dispute(@PathVariable Long txnId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(toCardTransactionResponse(cardService.disputeTransaction(txnId, reason))));
    }

    @GetMapping("/{cardId}/transactions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CardTransactionResponse>>> getTransactions(@PathVariable Long cardId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<CardTransaction> result = cardService.getCardTransactions(cardId, pageRequestFactory.create(page, size));
        return ResponseEntity.ok(ApiResponse.ok(
                result.getContent().stream().map(this::toCardTransactionResponse).toList(),
                PageMeta.from(result)));
    }

    private CardResponse toCardResponse(Card card) {
        return new CardResponse(
                card.getId(),
                card.getCardReference(),
                card.getCardNumberMasked(),
                card.getAccount().getId(),
                card.getAccount().getAccountNumber(),
                card.getCustomer().getId(),
                card.getCustomer().getDisplayName(),
                card.getCardType(),
                card.getCardScheme(),
                card.getCardTier(),
                card.getCardholderName(),
                card.getIssueDate(),
                card.getExpiryDate(),
                card.getLastUsedDate(),
                card.getDailyPosLimit(),
                card.getDailyAtmLimit(),
                card.getDailyOnlineLimit(),
                card.getSingleTxnLimit(),
                card.getMonthlyLimit(),
                card.getCreditLimit(),
                card.getAvailableCredit(),
                card.getOutstandingBalance(),
                card.getIsContactlessEnabled(),
                card.getIsOnlineEnabled(),
                card.getIsInternationalEnabled(),
                card.getIsAtmEnabled(),
                card.getIsPosEnabled(),
                card.getPinRetriesRemaining(),
                card.getStatus(),
                card.getBlockReason(),
                card.getCurrencyCode(),
                card.getBranchCode(),
                card.getCreatedAt(),
                card.getUpdatedAt());
    }

    private CardTransactionResponse toCardTransactionResponse(CardTransaction txn) {
        return new CardTransactionResponse(
                txn.getId(),
                txn.getTransactionRef(),
                txn.getCard().getId(),
                txn.getCard().getCardReference(),
                txn.getAccount().getId(),
                txn.getAccount().getAccountNumber(),
                txn.getTransactionType(),
                txn.getChannel(),
                txn.getAmount(),
                txn.getCurrencyCode(),
                txn.getBillingAmount(),
                txn.getBillingCurrency(),
                txn.getFxRate(),
                txn.getMerchantName(),
                txn.getMerchantId(),
                txn.getMerchantCategoryCode(),
                txn.getTerminalId(),
                txn.getMerchantCity(),
                txn.getMerchantCountry(),
                txn.getIsInternational(),
                txn.getAuthCode(),
                txn.getResponseCode(),
                txn.getStatus(),
                txn.getDeclineReason(),
                txn.getIsDisputed(),
                txn.getDisputeReason(),
                txn.getDisputeDate(),
                txn.getTransactionDate(),
                txn.getSettlementDate());
    }
}
