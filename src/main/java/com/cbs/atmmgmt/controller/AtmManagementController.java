package com.cbs.atmmgmt.controller;

import com.cbs.atmmgmt.entity.*;
import com.cbs.atmmgmt.service.AtmManagementService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/atm") @RequiredArgsConstructor
@Tag(name = "ATM/Kiosk Management", description = "Terminal registration, cash forecasting, replenishment, health monitoring")
public class AtmManagementController {

    private final AtmManagementService atmService;
    private final CurrentActorProvider currentActorProvider;

    @PostMapping("/terminals")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AtmTerminal>> register(@RequestBody AtmTerminal terminal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(atmService.registerTerminal(terminal)));
    }

    @GetMapping("/terminals")
    @Operation(summary = "List all ATM terminals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AtmTerminal>>> listTerminals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AtmTerminal> result = atmService.getAllTerminals(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/terminals/{terminalId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AtmTerminal>> getTerminal(@PathVariable String terminalId) {
        return ResponseEntity.ok(ApiResponse.ok(atmService.getTerminal(terminalId)));
    }

    @GetMapping("/terminals/status/{status}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AtmTerminal>>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(ApiResponse.ok(atmService.getTerminalsByStatus(status)));
    }

    @GetMapping("/terminals/branch/{branchCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AtmTerminal>>> getBranchTerminals(@PathVariable String branchCode) {
        return ResponseEntity.ok(ApiResponse.ok(atmService.getBranchTerminals(branchCode)));
    }

    @GetMapping("/terminals/low-cash")
    @Operation(summary = "Get terminals that need cash replenishment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AtmTerminal>>> getLowCash() {
        return ResponseEntity.ok(ApiResponse.ok(atmService.getLowCashTerminals()));
    }

    @PostMapping("/terminals/{terminalId}/replenish")
    @Operation(summary = "Replenish ATM cash and update forecast")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AtmTerminal>> replenish(@PathVariable String terminalId,
            @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(atmService.replenishCash(terminalId, amount, currentActorProvider.getCurrentActor())));
    }

    @PatchMapping("/terminals/{terminalId}/status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AtmTerminal>> updateStatus(@PathVariable String terminalId, @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok(atmService.updateStatus(terminalId, status)));
    }

    @GetMapping("/terminals/{terminalId}/journal")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AtmJournalEntry>>> getJournal(@PathVariable String terminalId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<AtmJournalEntry> result = atmService.getTerminalJournal(terminalId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/dashboard")
    @Operation(summary = "ATM fleet dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AtmManagementService.AtmFleetDashboard>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(atmService.getFleetDashboard()));
    }
}
