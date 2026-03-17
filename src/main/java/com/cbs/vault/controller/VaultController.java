package com.cbs.vault.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.web.CbsPageRequestFactory;
import com.cbs.vault.entity.*;
import com.cbs.vault.service.VaultService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/vaults")
@RequiredArgsConstructor
@Tag(name = "Vault & Cash Management", description = "Vault CRUD, cash movements, inter-vault transfers")
public class VaultController {

    private final VaultService vaultService;
    private final CbsPageRequestFactory pageRequestFactory;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Vault>> create(@RequestParam String vaultCode, @RequestParam String vaultName,
            @RequestParam String branchCode, @RequestParam VaultType vaultType, @RequestParam String currencyCode,
            @RequestParam(required = false) BigDecimal minimumBalance, @RequestParam(required = false) BigDecimal maximumBalance,
            @RequestParam(required = false) BigDecimal insuranceLimit, @RequestParam(required = false) String custodian) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(vaultService.createVault(
                vaultCode, vaultName, branchCode, vaultType, currencyCode, minimumBalance, maximumBalance, insuranceLimit, custodian)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Vault>> getVault(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(vaultService.getVault(id)));
    }

    @GetMapping("/branch/{branchCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Vault>>> getBranchVaults(@PathVariable String branchCode) {
        return ResponseEntity.ok(ApiResponse.ok(vaultService.getBranchVaults(branchCode)));
    }

    @PostMapping("/{id}/cash-in")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<VaultTransaction>> cashIn(@PathVariable Long id, @RequestParam BigDecimal amount,
            @RequestParam(required = false) String reference, @RequestParam(required = false) String narration) {
        return ResponseEntity.ok(ApiResponse.ok(vaultService.cashIn(id, amount, reference, narration)));
    }

    @PostMapping("/{id}/cash-out")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<VaultTransaction>> cashOut(@PathVariable Long id, @RequestParam BigDecimal amount,
            @RequestParam(required = false) String reference, @RequestParam(required = false) String narration) {
        return ResponseEntity.ok(ApiResponse.ok(vaultService.cashOut(id, amount, reference, narration)));
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> transfer(@RequestParam Long fromVaultId, @RequestParam Long toVaultId,
            @RequestParam BigDecimal amount) {
        vaultService.vaultTransfer(fromVaultId, toVaultId, amount);
        return ResponseEntity.ok(ApiResponse.ok(null, "Transfer completed"));
    }

    @GetMapping("/{id}/transactions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<VaultTransaction>>> getTransactions(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<VaultTransaction> result = vaultService.getTransactions(id, pageRequestFactory.create(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
