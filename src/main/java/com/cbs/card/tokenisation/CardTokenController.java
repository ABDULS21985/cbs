package com.cbs.card.tokenisation;

import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/cards/tokens") @RequiredArgsConstructor
@Tag(name = "Card Tokenisation", description = "Wallet provisioning (Apple/Google/Samsung Pay), token lifecycle")
public class CardTokenController {

    private final CardTokenService tokenService;

    @PostMapping("/provision/{cardId}")
    @Operation(summary = "Provision a token for a digital wallet")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardToken>> provision(@PathVariable Long cardId,
            @RequestParam WalletProvider walletProvider,
            @RequestParam(required = false) String deviceName, @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String deviceType, @RequestParam(required = false) String tokenRequestorId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                tokenService.provisionToken(cardId, walletProvider, deviceName, deviceId, deviceType, tokenRequestorId)));
    }

    @GetMapping("/card/{cardId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<CardToken>>> getCardTokens(@PathVariable Long cardId) {
        return ResponseEntity.ok(ApiResponse.ok(tokenService.getCardTokens(cardId)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<CardToken>>> getCustomerTokens(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(tokenService.getCustomerTokens(customerId)));
    }

    @PostMapping("/{tokenId}/suspend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardToken>> suspend(@PathVariable Long tokenId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(tokenService.suspendToken(tokenId, reason)));
    }

    @PostMapping("/{tokenId}/resume")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardToken>> resume(@PathVariable Long tokenId) {
        return ResponseEntity.ok(ApiResponse.ok(tokenService.resumeToken(tokenId)));
    }

    @PostMapping("/{tokenId}/deactivate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardToken>> deactivate(@PathVariable Long tokenId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(tokenService.deactivateToken(tokenId, reason)));
    }

    @PostMapping("/deactivate-all/{cardId}")
    @Operation(summary = "Deactivate all tokens for a card (used on hotlisting)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> deactivateAll(@PathVariable Long cardId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("deactivated", tokenService.deactivateAllTokensForCard(cardId, reason))));
    }
}
