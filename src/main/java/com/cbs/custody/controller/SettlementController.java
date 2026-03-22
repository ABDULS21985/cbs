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

    @GetMapping("/instructions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SettlementInstruction>>> listInstructions() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllInstructions()));
    }

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

    @RequestMapping(value = "/instructions/match", method = {RequestMethod.GET, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SettlementInstruction>>> matchInstructions(@RequestParam(required = false) String refA, @RequestParam(required = false) String refB) {
        if (refA == null || refB == null) return ResponseEntity.ok(ApiResponse.ok(java.util.List.of()));
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

    @GetMapping("/batches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SettlementBatch>>> listBatches() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllBatches()));
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

    @PostMapping("/instructions/{ref}/resubmit")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SettlementInstruction>> resubmitSettlement(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.resubmitSettlement(ref)));
    }

    @PostMapping("/instructions/{ref}/cancel")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SettlementInstruction>> cancelSettlement(@PathVariable String ref, @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelSettlement(ref, reason)));
    }

    @PostMapping("/instructions/{ref}/escalate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SettlementInstruction>> escalateSettlement(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.escalateSettlement(ref)));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getSettlementDashboard()));
    }
}
