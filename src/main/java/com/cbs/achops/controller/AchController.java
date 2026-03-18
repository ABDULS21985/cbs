package com.cbs.achops.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.achops.entity.AchBatch;
import com.cbs.achops.service.AchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/ach") @RequiredArgsConstructor
@Tag(name = "ACH Operations", description = "ACH batch creation, submission, settlement (NIBSS, FedACH, Bacs, SEPA)")
public class AchController {
    private final AchService service;
    @PostMapping("/batches") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<AchBatch>> create(@RequestBody AchBatch batch) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createBatch(batch))); }
    @PostMapping("/batches/{id}/submit") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<AchBatch>> submit(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.submit(id))); }
    @PostMapping("/batches/{id}/settle") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<AchBatch>> settle(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.settle(id))); }
    @GetMapping("/batches/{operator}/{status}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<AchBatch>>> byOperator(@PathVariable String operator, @PathVariable String status) { return ResponseEntity.ok(ApiResponse.ok(service.getByOperator(operator, status))); }
}
