package com.cbs.cardclearing.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.cardclearing.entity.*;
import com.cbs.cardclearing.service.CardClearingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List;
@RestController @RequestMapping("/v1/card-clearing") @RequiredArgsConstructor
@Tag(name = "Card Clearing & Settlement", description = "Card network clearing batches, interchange, settlement positions, reconciliation")
public class CardClearingController {
    private final CardClearingService service;
    @PostMapping("/batches") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CardClearingBatch>> ingest(@RequestBody CardClearingBatch batch) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.ingestBatch(batch))); }
    @PostMapping("/batches/{batchId}/settle") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CardClearingBatch>> settle(@PathVariable String batchId) { return ResponseEntity.ok(ApiResponse.ok(service.settle(batchId))); }
    @PostMapping("/positions") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CardSettlementPosition>> createPosition(@RequestBody CardSettlementPosition pos) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createPosition(pos))); }
    @GetMapping("/batches/{network}/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CardClearingBatch>>> byNetwork(@PathVariable String network, @PathVariable LocalDate date) { return ResponseEntity.ok(ApiResponse.ok(service.getByNetwork(network, date))); }
    @GetMapping("/positions/{date}/{network}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CardSettlementPosition>>> positions(@PathVariable LocalDate date, @PathVariable String network) { return ResponseEntity.ok(ApiResponse.ok(service.getPositions(date, network))); }
}
