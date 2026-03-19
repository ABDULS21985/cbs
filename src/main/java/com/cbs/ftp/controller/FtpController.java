package com.cbs.ftp.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.ftp.entity.*;
import com.cbs.ftp.service.FtpService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/ftp") @RequiredArgsConstructor
@Tag(name = "Funds Transfer Pricing", description = "FTP rate curves, spread calculation, profitability allocation")
public class FtpController {

    private final FtpService ftpService;

    @GetMapping("/curves")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FtpRateCurve>>> listCurves() {
        return ResponseEntity.ok(ApiResponse.ok(ftpService.getAllCurves()));
    }

    @GetMapping("/allocate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FtpAllocation>>> listAllocations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(ftpService.getAllAllocations()));
    }

    @PostMapping("/curves")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FtpRateCurve>> addRatePoint(
            @RequestParam String curveName, @RequestParam String currencyCode,
            @RequestParam LocalDate effectiveDate, @RequestParam int tenorDays, @RequestParam BigDecimal rate) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                ftpService.addRatePoint(curveName, currencyCode, effectiveDate, tenorDays, rate)));
    }

    @PostMapping("/allocate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<FtpAllocation>> allocate(
            @RequestParam String entityType, @RequestParam Long entityId,
            @RequestParam(required = false) String entityRef, @RequestParam String currencyCode,
            @RequestParam BigDecimal averageBalance, @RequestParam BigDecimal actualRate,
            @RequestParam int tenorDays, @RequestParam LocalDate allocationDate) {
        return ResponseEntity.ok(ApiResponse.ok(ftpService.calculateFtp(
                entityType, entityId, entityRef, currencyCode, averageBalance, actualRate, tenorDays, allocationDate)));
    }

    @GetMapping("/profitability/{entityType}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FtpAllocation>>> getProfitability(@PathVariable String entityType,
            @RequestParam LocalDate date, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<FtpAllocation> result = ftpService.getProfitabilityByEntity(entityType, date, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/history/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FtpAllocation>>> getHistory(@PathVariable String entityType,
            @PathVariable Long entityId, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<FtpAllocation> result = ftpService.getEntityHistory(entityType, entityId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
