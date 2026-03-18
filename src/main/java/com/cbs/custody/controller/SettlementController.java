package com.cbs.custody.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.custody.entity.SettlementBatch;
import com.cbs.custody.entity.SettlementInstruction;
import com.cbs.custody.service.SettlementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/settlements") @RequiredArgsConstructor
@Tag(name = "Settlement Services", description = "Trade settlement instructions, matching, batching, penalty calculation")
public class SettlementController {

    private final SettlementService service;

    @PostMapping("/instructions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SettlementInstruction>> createInstruction(@RequestBody SettlementInstruction instruction) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createInstruction(instruction)));
    }

    @GetMapping("/instructions/{ref}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SettlementInstruction>> getInstruction(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.getInstruction(ref)));
    }

    @PostMapping("/instructions/match")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SettlementInstruction>>> matchInstructions(@RequestParam String refA, @RequestParam String refB) {
        return ResponseEntity.ok(ApiResponse.ok(service.matchInstruction(refA, refB)));
    }

    @PostMapping("/instructions/{ref}/submit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SettlementInstruction>> submitForSettlement(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.submitForSettlement(ref)));
    }

    @PostMapping("/instructions/{ref}/result")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SettlementInstruction>> recordResult(@PathVariable String ref, @RequestParam boolean settled) {
        return ResponseEntity.ok(ApiResponse.ok(service.recordResult(ref, settled)));
    }

    @PostMapping("/batches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<SettlementBatch>> createBatch(@RequestBody SettlementBatch batch) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createBatch(batch)));
    }

    @GetMapping("/failed")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SettlementInstruction>>> getFailedSettlements() {
        return ResponseEntity.ok(ApiResponse.ok(service.getFailedSettlements()));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getSettlementDashboard()));
    }
}
