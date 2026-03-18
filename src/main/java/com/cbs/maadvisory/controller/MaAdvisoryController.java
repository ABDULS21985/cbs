package com.cbs.maadvisory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.maadvisory.entity.MaEngagement;
import com.cbs.maadvisory.service.MaAdvisoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/ma-advisory") @RequiredArgsConstructor
@Tag(name = "M&A Advisory", description = "Mergers and acquisitions advisory mandate tracking, milestones, fee management")
public class MaAdvisoryController {

    private final MaAdvisoryService service;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MaEngagement>> create(@RequestBody MaEngagement engagement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createEngagement(engagement)));
    }

    @PatchMapping("/{code}/milestone") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MaEngagement>> updateMilestone(
            @PathVariable String code,
            @RequestParam String field,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        MaEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.updateMilestone(engagement.getId(), field, date)));
    }

    @PostMapping("/{code}/fee") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MaEngagement>> recordFee(
            @PathVariable String code, @RequestParam BigDecimal amount) {
        MaEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.recordFee(engagement.getId(), amount)));
    }

    @PostMapping("/{code}/close") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MaEngagement>> close(
            @PathVariable String code, @RequestParam BigDecimal actualDealValue) {
        MaEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.closeEngagement(engagement.getId(), actualDealValue)));
    }

    @PostMapping("/{code}/terminate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MaEngagement>> terminate(
            @PathVariable String code, @RequestParam(defaultValue = "") String reason) {
        MaEngagement engagement = service.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(service.terminateEngagement(engagement.getId(), reason)));
    }

    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MaEngagement>>> active() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveMandates()));
    }

    @GetMapping("/pipeline") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> pipeline() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPipelineByStage()));
    }

    @GetMapping("/revenue") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> revenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(service.getFeeRevenue(from, to)));
    }

    @GetMapping("/workload") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> workload() {
        return ResponseEntity.ok(ApiResponse.ok(service.getTeamWorkload()));
    }
}
