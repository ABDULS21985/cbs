package com.cbs.positionmgmt.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.positionmgmt.entity.FinancialPosition;
import com.cbs.positionmgmt.service.FinancialPositionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/financial-positions") @RequiredArgsConstructor
@Tag(name = "Financial Position", description = "Intraday position management, limit monitoring, breach detection")
public class FinancialPositionController {
    private final FinancialPositionService service;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FinancialPosition>> record(@RequestBody FinancialPosition pos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.record(pos)));
    }
    @GetMapping("/type/{type}/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FinancialPosition>>> getByType(@PathVariable String type, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type, date)));
    }
    @GetMapping("/breaches") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FinancialPosition>>> getBreaches() {
        return ResponseEntity.ok(ApiResponse.ok(service.getBreaches()));
    }
}
