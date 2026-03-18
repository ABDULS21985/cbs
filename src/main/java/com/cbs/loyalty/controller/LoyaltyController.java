package com.cbs.loyalty.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.loyalty.entity.*;
import com.cbs.loyalty.service.LoyaltyService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/loyalty") @RequiredArgsConstructor
@Tag(name = "Loyalty & Rewards", description = "Points/cashback/miles programs, earn/redeem, tier management")
public class LoyaltyController {
    private final LoyaltyService loyaltyService;

    @PostMapping("/programs") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<LoyaltyProgram>> createProgram(@RequestBody LoyaltyProgram program) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(loyaltyService.createProgram(program)));
    }
    @PostMapping("/enroll") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LoyaltyAccount>> enroll(@RequestParam Long customerId, @RequestParam String programCode) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(loyaltyService.enroll(customerId, programCode)));
    }
    @PostMapping("/{loyaltyNumber}/earn") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LoyaltyAccount>> earn(@PathVariable String loyaltyNumber,
            @RequestParam Integer points, @RequestParam(required = false) String description,
            @RequestParam(required = false) Long sourceTransactionId) {
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.earnPoints(loyaltyNumber, points, description, sourceTransactionId)));
    }
    @PostMapping("/{loyaltyNumber}/redeem") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<LoyaltyAccount>> redeem(@PathVariable String loyaltyNumber,
            @RequestParam Integer points, @RequestParam String description) {
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.redeemPoints(loyaltyNumber, points, description)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LoyaltyAccount>>> getCustomerAccounts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.getCustomerAccounts(customerId)));
    }
    @GetMapping("/{loyaltyNumber}/transactions") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LoyaltyTransaction>>> getTransactions(@PathVariable String loyaltyNumber) {
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.getTransactions(loyaltyNumber)));
    }
}
