package com.cbs.card.controller;

import com.cbs.card.entity.*;
import com.cbs.card.repository.CardRepository;
import com.cbs.card.service.CardService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    private final CardRepository cardRepository;

    @PostMapping
    @Operation(summary = "Issue a new card")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Card>> issueCard(
            @RequestParam Long accountId, @RequestParam CardType cardType, @RequestParam CardScheme cardScheme,
            @RequestParam(required = false) String cardTier, @RequestParam String cardholderName,
            @RequestParam(required = false) LocalDate expiryDate,
            @RequestParam(required = false) BigDecimal dailyPosLimit,
            @RequestParam(required = false) BigDecimal dailyAtmLimit,
            @RequestParam(required = false) BigDecimal dailyOnlineLimit,
            @RequestParam(required = false) BigDecimal singleTxnLimit,
            @RequestParam(required = false) BigDecimal creditLimit) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                cardService.issueCard(accountId, cardType, cardScheme, cardTier, cardholderName,
                        expiryDate, dailyPosLimit, dailyAtmLimit, dailyOnlineLimit, singleTxnLimit, creditLimit)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Card>> getCard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.getCard(id)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Card>>> getCustomerCards(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Card> result = cardService.getCustomerCards(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Card>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.activateCard(id)));
    }

    @PostMapping("/{id}/block")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Card>> block(@PathVariable Long id, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.blockCard(id, reason)));
    }

    @PostMapping("/{id}/hotlist")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Card>> hotlist(@PathVariable Long id, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.hotlistCard(id, reason)));
    }

    @PatchMapping("/{id}/controls")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Card>> updateControls(@PathVariable Long id,
            @RequestParam(required = false) Boolean contactless, @RequestParam(required = false) Boolean online,
            @RequestParam(required = false) Boolean international, @RequestParam(required = false) Boolean atm,
            @RequestParam(required = false) Boolean pos) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.updateControls(id, contactless, online, international, atm, pos)));
    }

    @PostMapping("/{cardId}/authorize")
    @Operation(summary = "Authorize a card transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardTransaction>> authorize(@PathVariable Long cardId,
            @RequestParam String transactionType, @RequestParam String channel,
            @RequestParam BigDecimal amount, @RequestParam String currencyCode,
            @RequestParam(required = false) String merchantName, @RequestParam(required = false) String merchantId,
            @RequestParam(required = false) String mcc, @RequestParam(required = false) String terminalId,
            @RequestParam(required = false) String merchantCity, @RequestParam(required = false) String merchantCountry) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.authorizeTransaction(cardId, transactionType, channel,
                amount, currencyCode, merchantName, merchantId, mcc, terminalId, merchantCity, merchantCountry)));
    }

    @PostMapping("/transactions/{txnId}/dispute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardTransaction>> dispute(@PathVariable Long txnId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.disputeTransaction(txnId, reason)));
    }

    @GetMapping("/{cardId}/transactions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CardTransaction>>> getTransactions(@PathVariable Long cardId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<CardTransaction> result = cardService.getCardTransactions(cardId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // List all cards
    @PostMapping("/request")
    @Operation(summary = "Request a new card (alias for POST /)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Card>> requestCard(
            @RequestParam Long customerId, @RequestParam Long accountId,
            @RequestParam(required = false) String cardType,
            @RequestParam(required = false) String deliveryAddress) {
        CardType type = cardType != null ? CardType.valueOf(cardType) : CardType.DEBIT;
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                cardService.issueCard(accountId, type, CardScheme.VISA,
                        "CLASSIC", "CARDHOLDER", java.time.LocalDate.now().plusYears(3),
                        new java.math.BigDecimal("500000"), new java.math.BigDecimal("200000"),
                        new java.math.BigDecimal("300000"), new java.math.BigDecimal("200000"),
                        java.math.BigDecimal.ZERO)));
    }

    @GetMapping
    @Operation(summary = "List all cards")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Card>>> listCards(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Card> result = cardRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
