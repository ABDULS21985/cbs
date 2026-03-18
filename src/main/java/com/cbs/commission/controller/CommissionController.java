package com.cbs.commission.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.commission.entity.CommissionAgreement;
import com.cbs.commission.entity.CommissionPayout;
import com.cbs.commission.service.CommissionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.util.List;

@RestController @RequestMapping("/v1/commissions") @RequiredArgsConstructor
@Tag(name = "Commission Management", description = "Commission agreements, payout calculation, approvals")
public class CommissionController {
    private final CommissionService service;
    @PostMapping("/agreements") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CommissionAgreement>> createAgreement(@RequestBody CommissionAgreement agreement) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createAgreement(agreement))); }
    @PostMapping("/agreements/{code}/activate") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CommissionAgreement>> activateAgreement(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.activateAgreement(code))); }
    @PostMapping("/agreements/{code}/calculate-payout") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CommissionPayout>> calculatePayout(@PathVariable String code, @RequestParam BigDecimal grossSales, @RequestParam BigDecimal qualifyingSales, @RequestParam String period) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculatePayout(code, grossSales, qualifyingSales, period))); }
    @PostMapping("/payouts/{code}/approve") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CommissionPayout>> approvePayout(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.approvePayout(code))); }
    @GetMapping("/agreements/party/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CommissionAgreement>>> getAgreementsByParty(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.getAgreementsByParty(id))); }
    @GetMapping("/payouts/party/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CommissionPayout>>> getPayoutsByParty(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.getPayoutsByParty(id))); }
}
