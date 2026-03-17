package com.cbs.eod.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.eod.entity.*;
import com.cbs.eod.service.EndOfDayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/v1/eod")
@RequiredArgsConstructor
@Tag(name = "End-of-Day Processing", description = "EOD, EOM, EOQ, EOY batch execution")
public class EodController {

    private final EndOfDayService eodService;

    @PostMapping("/execute")
    @Operation(summary = "Execute end-of-day processing")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EodRun>> executeEod(
            @RequestParam LocalDate businessDate, @RequestParam String initiatedBy) {
        return ResponseEntity.ok(ApiResponse.ok(eodService.executeEod(businessDate, initiatedBy)));
    }

    @GetMapping("/last/{runType}")
    @Operation(summary = "Get last EOD run")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EodRun>> getLastRun(@PathVariable EodRunType runType) {
        return ResponseEntity.ok(ApiResponse.ok(eodService.getLastRun(runType)));
    }
}
