package com.cbs.centralcashhandling.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.centralcashhandling.entity.*; import com.cbs.centralcashhandling.service.CentralCashHandlingService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/cash-vaults") @RequiredArgsConstructor
@Tag(name = "Central Cash Handling", description = "Vault management, CIT, cash movements")
public class CashVaultController {
    private final CentralCashHandlingService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CashVault>> register(@RequestBody CashVault vault) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerVault(vault))); }
    @PostMapping("/movements") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CashMovement>> recordMovement(@RequestBody CashMovement movement) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordMovement(movement))); }
    @PostMapping("/movements/{ref}/confirm") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<CashMovement>> confirm(@PathVariable String ref) { return ResponseEntity.ok(ApiResponse.ok(service.confirmDelivery(ref))); }
    @PostMapping("/{code}/reconcile") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CashVault>> reconcile(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.reconcileVault(code))); }
    @GetMapping("/type/{type}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CashVault>>> getByType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getVaultsByType(type))); }
    @GetMapping("/{code}/movements") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CashMovement>>> getMovements(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getMovements(code))); }
}
