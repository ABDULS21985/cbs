package com.cbs.achops.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.achops.entity.AchBatch;
import com.cbs.achops.repository.AchBatchRepository;
import com.cbs.achops.service.AchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/ach") @RequiredArgsConstructor
@Tag(name = "ACH Operations", description = "ACH batch creation, submission, settlement (NIBSS, FedACH, Bacs, SEPA)")
public class AchController {
    private final AchService service;
    private final AchBatchRepository achBatchRepository;

    @PostMapping("/batches") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<AchBatch>> create(@RequestBody AchBatch batch) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createBatch(batch))); }
    @PostMapping("/batches/{id}/submit") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<AchBatch>> submit(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.submit(id))); }
    @PostMapping("/batches/{id}/settle") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<AchBatch>> settle(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.settle(id))); }
    @GetMapping("/batches/{operator}/{status}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<AchBatch>>> byOperator(@PathVariable String operator, @PathVariable String status) { return ResponseEntity.ok(ApiResponse.ok(service.getByOperator(operator, status))); }

    @GetMapping("/inbound")
    @Operation(summary = "List inbound ACH batches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AchBatch>>> listInbound(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AchBatch> result = achBatchRepository.findByBatchTypeOrderByEffectiveDateDesc(
                "INBOUND", PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/outbound")
    @Operation(summary = "List outbound ACH batches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AchBatch>>> listOutbound(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AchBatch> result = achBatchRepository.findByBatchTypeOrderByEffectiveDateDesc(
                "OUTBOUND", PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/returns")
    @Operation(summary = "List ACH returns/rejections")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AchBatch>>> listReturns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AchBatch> result = achBatchRepository.findByStatusInOrderByEffectiveDateDesc(
                List.of("RETURNED", "REJECTED"), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/settlement")
    @Operation(summary = "List ACH settlement status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AchBatch>>> listSettlement(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AchBatch> result = achBatchRepository.findByStatusInOrderByEffectiveDateDesc(
                List.of("SETTLED", "SUBMITTED"), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
