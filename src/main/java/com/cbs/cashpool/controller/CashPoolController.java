package com.cbs.cashpool.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.cashpool.entity.*;
import com.cbs.cashpool.service.CashPoolService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/cash-pools") @RequiredArgsConstructor
@Tag(name = "Cash Concentration / Pooling", description = "Physical cash pooling — ZBA, target balance, threshold sweeps, intercompany loans")
public class CashPoolController {
    private final CashPoolService cashPoolService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CashPoolStructure>> create(@RequestBody CashPoolStructure pool) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(cashPoolService.createPool(pool)));
    }
    @PostMapping("/{poolCode}/participants") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CashPoolParticipant>> addParticipant(@PathVariable String poolCode, @RequestBody CashPoolParticipant p) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(cashPoolService.addParticipant(poolCode, p)));
    }
    @PostMapping("/{poolCode}/sweep") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<CashPoolSweepLog>>> sweep(@PathVariable String poolCode) {
        return ResponseEntity.ok(ApiResponse.ok(cashPoolService.executeSweep(poolCode)));
    }
    @GetMapping("/{poolCode}/participants") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CashPoolParticipant>>> participants(@PathVariable String poolCode) {
        return ResponseEntity.ok(ApiResponse.ok(cashPoolService.getParticipants(poolCode)));
    }
    @GetMapping("/{poolCode}/sweeps") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CashPoolSweepLog>>> sweepHistory(@PathVariable String poolCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(cashPoolService.getSweepHistory(poolCode, date)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CashPoolStructure>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(cashPoolService.getByCustomer(customerId)));
    }
}
