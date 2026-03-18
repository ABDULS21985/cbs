package com.cbs.secposition.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.secposition.entity.SecuritiesMovement;
import com.cbs.secposition.entity.SecuritiesPosition;
import com.cbs.secposition.service.SecuritiesPositionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/securities-positions") @RequiredArgsConstructor
@Tag(name = "Securities Position", description = "Holdings, movements, cost basis, market value tracking")
public class SecuritiesPositionController {
    private final SecuritiesPositionService service;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecuritiesPosition>> record(@RequestBody SecuritiesPosition pos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.record(pos)));
    }
    @PostMapping("/movements") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecuritiesMovement>> recordMovement(@RequestBody SecuritiesMovement movement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordMovement(movement)));
    }
    @GetMapping("/portfolio/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SecuritiesPosition>>> getByPortfolio(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByPortfolio(code)));
    }
    @GetMapping("/{positionId}/movements") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SecuritiesMovement>>> getMovements(@PathVariable String positionId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMovements(positionId)));
    }
}
