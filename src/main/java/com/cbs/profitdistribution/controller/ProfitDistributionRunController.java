package com.cbs.profitdistribution.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.profitdistribution.dto.DistributionDashboard;
import com.cbs.profitdistribution.dto.DistributionRunStepLogResponse;
import com.cbs.profitdistribution.dto.ExecuteFullDistributionRunRequest;
import com.cbs.profitdistribution.dto.InitiateDistributionRunRequest;
import com.cbs.profitdistribution.dto.ProfitDistributionRunResponse;
import com.cbs.profitdistribution.dto.ReserveImpactAnalysis;
import com.cbs.profitdistribution.dto.SsbCertificationPackage;
import com.cbs.profitdistribution.dto.SsbCertificationRequest;
import com.cbs.profitdistribution.entity.DistributionReserveTransaction;
import com.cbs.profitdistribution.service.DistributionReserveService;
import com.cbs.profitdistribution.service.ProfitDistributionRunService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/profit-distribution/runs")
@RequiredArgsConstructor
@Slf4j
public class ProfitDistributionRunController {

    private final ProfitDistributionRunService profitDistributionRunService;
    private final DistributionReserveService distributionReserveService;

    @PostMapping
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> initiateRun(
            @Valid @RequestBody InitiateDistributionRunRequest request) {
        log.info("Initiating distribution run for pool: {}", request.getPoolId());
        ProfitDistributionRunResponse response = profitDistributionRunService.initiateRun(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Distribution run initiated successfully"));
    }

    @GetMapping("/{runId}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> getRun(
            @PathVariable Long runId) {
        log.info("Getting distribution run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.getRunResponse(runId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/ref/{runRef}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> getRunByRef(
            @PathVariable String runRef) {
        log.info("Getting distribution run by reference: {}", runRef);
        ProfitDistributionRunResponse response = profitDistributionRunService.getRunByRef(runRef);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/pool/{poolId}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<ProfitDistributionRunResponse>>> getRunsByPool(
            @PathVariable Long poolId) {
        log.info("Getting distribution runs for pool: {}", poolId);
        List<ProfitDistributionRunResponse> response = profitDistributionRunService.getRunsByPool(poolId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<ProfitDistributionRunResponse>>> getRunsByStatus(
            @PathVariable String status) {
        log.info("Getting distribution runs by status: {}", status);
        List<ProfitDistributionRunResponse> response = profitDistributionRunService.getRunsByStatus(status);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{runId}/calculate")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> executeCalculation(
            @PathVariable Long runId) {
        log.info("Executing calculation for run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.executeCalculation(runId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Calculation executed successfully"));
    }

    @PostMapping("/{runId}/approve-calculation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> approveCalculation(
            @PathVariable Long runId,
            @RequestParam String approvedBy) {
        log.info("Approving calculation for run: {} by: {}", runId, approvedBy);
        ProfitDistributionRunResponse response = profitDistributionRunService.approveCalculation(runId, approvedBy);
        return ResponseEntity.ok(ApiResponse.ok(response, "Calculation approved successfully"));
    }

    @PostMapping("/{runId}/apply-reserves")
    @PreAuthorize("hasRole('FINANCE')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> applyReserves(
            @PathVariable Long runId) {
        log.info("Applying reserves for run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.applyReserves(runId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Reserves applied successfully"));
    }

    @PostMapping("/{runId}/allocate")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> executeAllocation(
            @PathVariable Long runId) {
        log.info("Executing allocation for run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.executeAllocation(runId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Allocation executed successfully"));
    }

    @PostMapping("/{runId}/approve-allocation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> approveAllocation(
            @PathVariable Long runId,
            @RequestParam String approvedBy) {
        log.info("Approving allocation for run: {} by: {}", runId, approvedBy);
        ProfitDistributionRunResponse response = profitDistributionRunService.approveAllocation(runId, approvedBy);
        return ResponseEntity.ok(ApiResponse.ok(response, "Allocation approved successfully"));
    }

    @PostMapping("/{runId}/distribute")
    @PreAuthorize("hasRole('FINANCE')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> executeDistribution(
            @PathVariable Long runId) {
        log.info("Executing distribution for run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.executeDistribution(runId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Distribution executed successfully"));
    }

    @PostMapping("/{runId}/submit-ssb-review")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> submitForSsbReview(
            @PathVariable Long runId) {
        log.info("Submitting run for SSB review: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.submitForSsbReview(runId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Submitted for SSB review successfully"));
    }

    @PostMapping("/{runId}/certify-ssb")
    @PreAuthorize("hasRole('SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> certifySsb(
            @PathVariable Long runId,
            @Valid @RequestBody SsbCertificationRequest request) {
        log.info("Certifying SSB for run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.certifySsb(runId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "SSB certification recorded successfully"));
    }

    @PostMapping("/{runId}/ssb-certify")
    @PreAuthorize("hasRole('SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> certifyBySsb(
            @PathVariable Long runId,
            @Valid @RequestBody SsbCertificationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                profitDistributionRunService.certifySsb(runId, request),
                "SSB certification recorded successfully"));
    }

    @PostMapping("/{runId}/waive-ssb")
    @PreAuthorize("hasRole('SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> waiveSsb(
            @PathVariable Long runId,
            @Valid @RequestBody SsbCertificationRequest request) {
        log.info("Recording SSB waiver for run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.waiveSsbCertification(runId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "SSB waiver recorded successfully"));
    }

    @PostMapping("/{runId}/complete")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> completeRun(
            @PathVariable Long runId) {
        log.info("Completing distribution run: {}", runId);
        ProfitDistributionRunResponse response = profitDistributionRunService.completeRun(runId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Distribution run completed successfully"));
    }

    @GetMapping("/{runId}/steps")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','COMPLIANCE','AUDIT')")
    public ResponseEntity<ApiResponse<List<DistributionRunStepLogResponse>>> getStepLogs(
            @PathVariable Long runId) {
        log.info("Getting step logs for run: {}", runId);
        List<DistributionRunStepLogResponse> response = profitDistributionRunService.getStepLogs(runId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{runId}/step-log")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','COMPLIANCE','AUDIT')")
    public ResponseEntity<ApiResponse<List<DistributionRunStepLogResponse>>> getStepLogAlias(
            @PathVariable Long runId) {
        return ResponseEntity.ok(ApiResponse.ok(profitDistributionRunService.getStepLogs(runId)));
    }

    @GetMapping("/{runId}/reserves")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<DistributionReserveTransaction>>> getReserveTransactions(
            @PathVariable Long runId) {
        log.info("Getting reserve transactions for run: {}", runId);
        List<DistributionReserveTransaction> response = distributionReserveService.getReserveTransactions(runId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{runId}/reserve-impact")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<ReserveImpactAnalysis>> getReserveImpact(@PathVariable Long runId) {
        return ResponseEntity.ok(ApiResponse.ok(distributionReserveService.getReserveImpact(runId)));
    }

    @GetMapping("/{runId}/ssb-package")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SsbCertificationPackage>> getSsbPackage(@PathVariable Long runId) {
        return ResponseEntity.ok(ApiResponse.ok(profitDistributionRunService.getSsbCertificationPackage(runId)));
    }

    @PostMapping("/full-run")
    @PreAuthorize("hasRole('FINANCE')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> executeFullRun(
            @Valid @RequestBody ExecuteFullDistributionRunRequest request) {
        ProfitDistributionRunResponse response = profitDistributionRunService.executeFullRun(
                request.getPoolId(), request.getPeriodFrom(), request.getPeriodTo(), request.isAutoApprove());
        return ResponseEntity.ok(ApiResponse.ok(response, "Full distribution run executed"));
    }

    @PostMapping("/{runId}/reverse")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProfitDistributionRunResponse>> reverseRun(
            @PathVariable Long runId,
            @RequestParam String reason,
            @RequestParam String authorisedBy) {
        return ResponseEntity.ok(ApiResponse.ok(
                profitDistributionRunService.reverseDistribution(runId, reason, authorisedBy),
                "Distribution reversed successfully"));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<DistributionDashboard>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(profitDistributionRunService.getDistributionDashboard()));
    }
}
