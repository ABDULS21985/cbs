package com.cbs.card.controller;

import com.cbs.card.dto.*;
import com.cbs.card.entity.Card;
import com.cbs.card.service.IslamicCardService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/cards/islamic")
@RequiredArgsConstructor
@Tag(name = "Islamic Debit Cards", description = "Shariah-compliant Islamic card products, restrictions, and issuance")
public class IslamicCardController {

    private final IslamicCardService islamicCardService;

    @PostMapping("/profiles")
    @Operation(summary = "Create an Islamic MCC restriction profile")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicCardProfileResponse>> createProfile(
            @Valid @RequestBody SaveIslamicCardProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(islamicCardService.createProfile(request)));
    }

    @GetMapping("/profiles")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<IslamicCardProfileResponse>>> listProfiles() {
        return ResponseEntity.ok(ApiResponse.ok(islamicCardService.listProfiles()));
    }

    @GetMapping("/profiles/{profileCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<IslamicCardProfileResponse>> getProfile(@PathVariable String profileCode) {
        return ResponseEntity.ok(ApiResponse.ok(islamicCardService.getProfile(profileCode)));
    }

    @PostMapping("/products")
    @Operation(summary = "Create an Islamic debit card product")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicCardProductResponse>> createProduct(
            @Valid @RequestBody SaveIslamicCardProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(islamicCardService.createProduct(request)));
    }

    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<IslamicCardProductResponse>>> listProducts() {
        return ResponseEntity.ok(ApiResponse.ok(islamicCardService.listProducts()));
    }

    @GetMapping("/products/{productCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<IslamicCardProductResponse>> getProduct(@PathVariable String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(islamicCardService.getProduct(productCode)));
    }

    @PostMapping
    @Operation(summary = "Issue a Shariah-compliant Islamic debit card")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardResponse>> issueIslamicDebitCard(
            @Valid @RequestBody IssueIslamicCardRequest request) {
        Card card = islamicCardService.issueIslamicDebitCard(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(CardMapper.toResponse(card)));
    }

    @PatchMapping("/{cardId}/profile")
    @Operation(summary = "Assign or override the Islamic MCC restriction profile for an issued card")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardResponse>> assignProfile(
            @PathVariable Long cardId,
            @Valid @RequestBody UpdateIslamicCardProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(CardMapper.toResponse(
                islamicCardService.assignRestrictionProfile(cardId, request.getRestrictionProfileCode()))));
    }
}