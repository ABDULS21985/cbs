package com.cbs.posterminal.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.posterminal.entity.PosTerminal;
import com.cbs.posterminal.service.PosTerminalService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/pos-terminals") @RequiredArgsConstructor
@Tag(name = "POS Terminals", description = "POS terminal administration — registration, heartbeat, status, merchant fleet")
public class PosTerminalController {
    private final PosTerminalService service;
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<PosTerminal>>> listAll() { return ResponseEntity.ok(ApiResponse.ok(service.getAllTerminals())); }
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PosTerminal>> register(@RequestBody PosTerminal terminal) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.register(terminal))); }
    @PostMapping("/{terminalId}/heartbeat") public ResponseEntity<ApiResponse<PosTerminal>> heartbeat(@PathVariable String terminalId) { return ResponseEntity.ok(ApiResponse.ok(service.heartbeat(terminalId))); }
    @PostMapping("/{terminalId}/status") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PosTerminal>> updateStatus(@PathVariable String terminalId, @RequestParam String status) { return ResponseEntity.ok(ApiResponse.ok(service.updateStatus(terminalId, status))); }
    @GetMapping("/merchant/{merchantId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<PosTerminal>>> byMerchant(@PathVariable String merchantId) { return ResponseEntity.ok(ApiResponse.ok(service.getByMerchant(merchantId))); }
}
