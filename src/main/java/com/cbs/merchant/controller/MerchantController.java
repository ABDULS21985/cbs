package com.cbs.merchant.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.merchant.entity.MerchantProfile;
import com.cbs.merchant.service.MerchantService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/merchants") @RequiredArgsConstructor
@Tag(name = "Merchant Acquiring", description = "Merchant onboarding, MDR rates, risk management, chargeback monitoring")
public class MerchantController {
    private final MerchantService service;
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MerchantProfile>>> listAll() { return ResponseEntity.ok(ApiResponse.ok(service.getAllMerchants())); }
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MerchantProfile>> onboard(@RequestBody MerchantProfile merchant) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.onboard(merchant))); }
    @PostMapping("/{id}/activate") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MerchantProfile>> activate(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.activate(id))); }
    @PostMapping("/{id}/suspend") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MerchantProfile>> suspend(@PathVariable String id, @RequestParam String reason) { return ResponseEntity.ok(ApiResponse.ok(service.suspend(id, reason))); }
    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MerchantProfile>>> active() { return ResponseEntity.ok(ApiResponse.ok(service.getActive())); }
    @GetMapping("/high-risk") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<MerchantProfile>>> highRisk() { return ResponseEntity.ok(ApiResponse.ok(service.getHighRisk())); }
}
