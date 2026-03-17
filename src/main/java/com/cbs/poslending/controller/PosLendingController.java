package com.cbs.poslending.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.poslending.entity.PosLoan;
import com.cbs.poslending.service.PosLendingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/pos-loans") @RequiredArgsConstructor
@Tag(name = "POS / BNPL Lending", description = "Point-of-sale lending, buy-now-pay-later, merchant-subsidized zero-interest, deferred payments")
public class PosLendingController {
    private final PosLendingService posLendingService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PosLoan>> originate(@RequestBody PosLoan loan) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(posLendingService.originate(loan)));
    }
    @PostMapping("/{number}/disburse") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PosLoan>> disburse(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(posLendingService.disburseToMerchant(number)));
    }
    @PostMapping("/{number}/return") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PosLoan>> processReturn(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(posLendingService.processReturn(number)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PosLoan>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(posLendingService.getByCustomer(customerId)));
    }
    @GetMapping("/merchant/{merchantId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PosLoan>>> byMerchant(@PathVariable String merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(posLendingService.getByMerchant(merchantId)));
    }
}
