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
    public ResponseEntity<ApiResponse<Card>> block(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.blockCard(id, body.getOrDefault("reason", "Blocked by officer"))));
    }

    @PostMapping("/{id}/hotlist")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Card>> hotlist(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.hotlistCard(id, body.getOrDefault("reason", "Hotlisted"))));
    }

    @PatchMapping("/{id}/controls")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Card>> updateControls(@PathVariable Long id,
            @RequestBody java.util.Map<String, Boolean> controls) {
        return ResponseEntity.ok(ApiResponse.ok(cardService.updateControls(id,
                controls.get("contactlessEnabled"), controls.get("onlineEnabled"),
                controls.get("internationalEnabled"), controls.get("atmEnabled"), controls.get("posEnabled"))));
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

    // Request replacement or new card
    @PostMapping("/request")
    @Operation(summary = "Request a new or replacement card")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Card>> requestCard(@RequestBody java.util.Map<String, Object> body) {
        Long customerId = body.get("customerId") != null ? Long.valueOf(body.get("customerId").toString()) : null;
        Long accountId = body.get("accountId") != null ? Long.valueOf(body.get("accountId").toString()) : null;
        String cardTypeStr = (String) body.getOrDefault("cardType", "DEBIT");
        String schemeStr = (String) body.getOrDefault("scheme", "VISA");
        String deliveryMethod = (String) body.getOrDefault("deliveryMethod", "BRANCH_PICKUP");
        CardType type = CardType.valueOf(cardTypeStr);
        CardScheme scheme = CardScheme.valueOf(schemeStr);
        if (accountId == null) throw new com.cbs.common.exception.BusinessException("accountId is required");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                cardService.issueCard(accountId, type, scheme,
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
