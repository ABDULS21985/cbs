package com.cbs.ecl.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.ecl.entity.*;
import com.cbs.ecl.repository.EclCalculationRepository;
import com.cbs.ecl.service.EclService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/ecl") @RequiredArgsConstructor
@Tag(name = "IFRS 9 ECL", description = "Expected Credit Loss staging, calculation, scenario weighting")
public class EclController {

    private final EclService eclService;
    private final EclCalculationRepository eclCalculationRepository;

    @PostMapping("/calculate")
    @Operation(summary = "Calculate ECL for a loan with PD/LGD/EAD and macro scenarios")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EclCalculation>> calculate(
            @RequestParam Long loanAccountId, @RequestParam Long customerId,
            @RequestParam String segment, @RequestParam(required = false) String productCode,
            @RequestParam BigDecimal outstandingBalance, @RequestParam(required = false) BigDecimal offBalanceExposure,
            @RequestParam int daysPastDue, @RequestParam(defaultValue = "false") boolean significantDeterioration) {
        return ResponseEntity.ok(ApiResponse.ok(eclService.calculateEcl(
                loanAccountId, customerId, segment, productCode, outstandingBalance, offBalanceExposure, daysPastDue, significantDeterioration)));
    }

    @GetMapping("/parameters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EclModelParameter>>> listParameters() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getAllParameters()));
    }

    @PostMapping("/parameters")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EclModelParameter>> saveParam(@RequestBody EclModelParameter param) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(eclService.saveParameter(param)));
    }

    @GetMapping("/calculations/{date}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EclCalculation>>> getCalculations(@PathVariable LocalDate date,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<EclCalculation> result = eclService.getCalculationsForDate(date, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/summary/{date}")
    @Operation(summary = "Get ECL summary by stage for a date")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EclService.EclSummary>> getSummary(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getEclSummary(date)));
    }

    // List all ECL calculations
    @GetMapping
    @Operation(summary = "List all ECL calculations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EclCalculation>>> listCalculations(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "calculationDate"));
        Page<EclCalculation> result = eclCalculationRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get ECL summary by stage for today")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EclService.EclSummary>> getSummaryToday() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getEclSummary(LocalDate.now())));
    }

    // ========================================================================
    // ECL DASHBOARD ENDPOINTS (aggregated views for the frontend)
    // ========================================================================

    @GetMapping("/stage-distribution")
    @Operation(summary = "ECL stage distribution (count and amount per stage)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStageDistribution() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getStageDistribution()));
    }

    @GetMapping("/stage-migration")
    @Operation(summary = "Stage migration matrix (from→to movements)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStageMigration() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getStageMigration()));
    }

    @GetMapping("/provision-movement")
    @Operation(summary = "Provision movement breakdown by stage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProvisionMovement() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getProvisionMovement()));
    }

    @GetMapping("/pd-term-structure")
    @Operation(summary = "PD term structure by rating grade")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPdTermStructure() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getPdTermStructure()));
    }

    @GetMapping("/lgd-by-collateral")
    @Operation(summary = "LGD rates by collateral type")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLgdByCollateral() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getLgdByCollateral()));
    }

    @GetMapping("/ead-by-product")
    @Operation(summary = "EAD breakdown by product")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getEadByProduct() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getEadByProduct()));
    }

    @GetMapping("/macro-scenarios")
    @Operation(summary = "Macro-economic scenario weights and ECL impact")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMacroScenarios() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getMacroScenarios()));
    }

    @GetMapping("/gl-reconciliation")
    @Operation(summary = "GL reconciliation between CBS ECL and provision balance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGlReconciliation() {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getGlReconciliation()));
    }

    @GetMapping("/loans")
    @Operation(summary = "Loans by ECL stage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLoansByStage(
            @RequestParam(defaultValue = "1") int stage,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eclWeighted"));
        Page<EclCalculation> result = eclService.getLoansByStage(stage, pageable);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("items", result.getContent()), PageMeta.from(result)));
    }

    @GetMapping("/run")
    @Operation(summary = "Get batch ECL run status")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRunStatus() {
        EclBatchRun latest = eclService.getLatestBatchRun();
        if (latest == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "IDLE")));
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "status", latest.getStatus(),
                "jobId", latest.getJobId(),
                "runDate", latest.getRunDate().toString(),
                "processedLoans", latest.getProcessedLoans(),
                "totalLoans", latest.getTotalLoans()
        )));
    }

    @PostMapping("/run")
    @Operation(summary = "Trigger a batch ECL calculation run")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runCalculation() {
        String jobId = eclService.triggerBatchRun();
        return ResponseEntity.accepted().body(ApiResponse.ok(Map.of("jobId", jobId)));
    }
}
