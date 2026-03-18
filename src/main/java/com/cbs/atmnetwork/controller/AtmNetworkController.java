package com.cbs.atmnetwork.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.atmnetwork.entity.AtmNetworkNode;
import com.cbs.atmnetwork.service.AtmNetworkService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.util.List;
@RestController @RequestMapping("/v1/atm-network") @RequiredArgsConstructor
@Tag(name = "ATM Network", description = "ATM network management — registration, status, replenishment, zone monitoring")
public class AtmNetworkController {
    private final AtmNetworkService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<AtmNetworkNode>> register(@RequestBody AtmNetworkNode node) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.register(node))); }
    @PostMapping("/{terminalId}/status") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<AtmNetworkNode>> updateStatus(@PathVariable String terminalId, @RequestParam String status) { return ResponseEntity.ok(ApiResponse.ok(service.updateStatus(terminalId, status))); }
    @PostMapping("/{terminalId}/replenish") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<AtmNetworkNode>> replenish(@PathVariable String terminalId, @RequestParam BigDecimal amount) { return ResponseEntity.ok(ApiResponse.ok(service.replenish(terminalId, amount))); }
    @GetMapping("/status/{status}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<AtmNetworkNode>>> byStatus(@PathVariable String status) { return ResponseEntity.ok(ApiResponse.ok(service.getByStatus(status))); }
    @GetMapping("/zone/{zone}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<AtmNetworkNode>>> byZone(@PathVariable String zone) { return ResponseEntity.ok(ApiResponse.ok(service.getByZone(zone))); }
}
