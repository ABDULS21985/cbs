package com.cbs.card.controller;

import com.cbs.card.dto.CardMapper;
import com.cbs.card.dto.CardResponse;
import com.cbs.card.dto.CardTransactionAdjustmentRequest;
import com.cbs.card.dto.CardTransactionResponse;
import com.cbs.card.dto.IssueCardRequest;
import com.cbs.card.entity.*;
import com.cbs.card.repository.CardRepository;
import com.cbs.card.service.CardService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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
    public ResponseEntity<ApiResponse<CardResponse>> issueCard(
            @Valid @RequestBody IssueCardRequest request) {
        Card card = cardService.issueCard(
                request.getAccountId(), request.getCardType(), request.getCardScheme(),
                request.getCardTier(), request.getCardholderName(), request.getExpiryDate(),
                request.getDailyPosLimit(), request.getDailyAtmLimit(),
                request.getDailyOnlineLimit(), request.getSingleTxnLimit(),
                request.getCreditLimit(), request.getBranchCode(), CardStatus.ACTIVE);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(CardMapper.toResponse(card)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<CardResponse>> getCard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponse(cardService.getCard(id))));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CardResponse>>> getCustomerCards(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Card> result = cardService.getCustomerCards(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponseList(result.getContent()), PageMeta.from(result)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponse(cardService.activateCard(id))));
    }

    @PostMapping("/{id}/block")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardResponse>> block(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponse(
                cardService.blockCard(id, body.getOrDefault("reason", "Blocked by officer")))));
    }

    @PostMapping("/{id}/hotlist")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardResponse>> hotlist(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponse(
                cardService.hotlistCard(id, body.getOrDefault("reason", "Hotlisted")))));
    }

    @PatchMapping("/{id}/controls")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardResponse>> updateControls(@PathVariable Long id,
            @RequestBody Map<String, Boolean> controls) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponse(cardService.updateControls(id,
                controls.get("contactlessEnabled"), controls.get("onlineEnabled"),
                controls.get("internationalEnabled"), controls.get("atmEnabled"), controls.get("posEnabled")))));
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
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toTxnResponse(cardService.authorizeTransaction(cardId, transactionType, channel,
                amount, currencyCode, merchantName, merchantId, mcc, terminalId, merchantCity, merchantCountry))));
    }

    @PostMapping("/transactions/{txnId}/dispute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardTransactionResponse>> dispute(@PathVariable Long txnId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toTxnResponse(cardService.disputeTransaction(txnId, reason))));
    }

    @PostMapping("/transactions/{txnId}/refund")
    @Operation(summary = "Refund a card transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardTransactionResponse>> refund(@PathVariable Long txnId,
                                                                       @Valid @RequestBody CardTransactionAdjustmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toTxnResponse(
                cardService.refundTransaction(txnId, request.getAmount(), request.getReason())
        )));
    }

    @PostMapping("/transactions/{txnId}/reversal")
    @Operation(summary = "Reverse a card transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardTransactionResponse>> reverse(@PathVariable Long txnId,
                                                                        @Valid @RequestBody CardTransactionAdjustmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toTxnResponse(
                cardService.reverseTransaction(txnId, request.getAmount(), request.getReason())
        )));
    }

    @GetMapping("/{cardId}/transactions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CardTransactionResponse>>> getTransactions(@PathVariable Long cardId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<CardTransaction> result = cardService.getCardTransactions(cardId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toTxnResponseList(result.getContent()), PageMeta.from(result)));
    }

    @PostMapping("/request")
    @Operation(summary = "Request a new or replacement card")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardResponse>> requestCard(@RequestBody Map<String, Object> body) {
        Long accountId = body.get("accountId") != null ? Long.valueOf(body.get("accountId").toString()) : null;
        String cardTypeStr = (String) body.getOrDefault("cardType", "DEBIT");
        String schemeStr = (String) body.getOrDefault("cardScheme", body.getOrDefault("scheme", "VISA"));
        String cardholderName = (String) body.getOrDefault("cardholderName", "CARDHOLDER");
        String cardTier = (String) body.getOrDefault("cardTier", "CLASSIC");
        CardType type = CardType.valueOf(cardTypeStr);
        CardScheme scheme = CardScheme.valueOf(schemeStr);
        if (accountId == null) throw new com.cbs.common.exception.BusinessException("accountId is required");
        Card card = cardService.issueCard(accountId, type, scheme,
                cardTier, cardholderName, LocalDate.now().plusYears(3),
                new BigDecimal("500000"), new BigDecimal("200000"),
                new BigDecimal("300000"), new BigDecimal("200000"),
                BigDecimal.ZERO, null, CardStatus.ACTIVE);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(CardMapper.toResponse(card)));
    }

    @GetMapping
    @Operation(summary = "List all cards")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CardResponse>>> listCards(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<Card> all = cardRepository.findAllWithDetails();
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponseList(all)));
    }
}
