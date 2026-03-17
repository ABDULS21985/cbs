package com.cbs.mortgage.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.mortgage.entity.MortgageLoan;
import com.cbs.mortgage.service.MortgageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/mortgages") @RequiredArgsConstructor
@Tag(name = "Mortgage Lending", description = "Mortgage origination, LTV monitoring, rate reversion, overpayments, porting")
public class MortgageController {
    private final MortgageService mortgageService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> originate(@RequestBody MortgageLoan mortgage) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mortgageService.originate(mortgage)));
    }
    @PostMapping("/{number}/advance") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> advance(@PathVariable String number, @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.advanceStatus(number, status)));
    }
    @PostMapping("/{number}/overpayment") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> overpay(@PathVariable String number, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.makeOverpayment(number, amount)));
    }
    @PostMapping("/{number}/revert-svr") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MortgageLoan>> revertSvr(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.revertToSvr(number)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MortgageLoan>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getByCustomer(customerId)));
    }
    @GetMapping("/high-ltv") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MortgageLoan>>> highLtv(@RequestParam(defaultValue = "80") BigDecimal maxLtv) {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getHighLtvMortgages(maxLtv)));
    }
    @GetMapping("/fixed-rate-expiring") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MortgageLoan>>> fixedExpiring() {
        return ResponseEntity.ok(ApiResponse.ok(mortgageService.getFixedRateExpiring()));
    }
}
