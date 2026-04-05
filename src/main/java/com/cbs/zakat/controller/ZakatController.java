package com.cbs.zakat.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.zakat.dto.ZakatRequests;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatComputation;
import com.cbs.zakat.entity.ZakatComputationLineItem;
import com.cbs.zakat.service.ZakatClassificationService;
import com.cbs.zakat.service.ZakatComputationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/zakat")
@RequiredArgsConstructor
@Tag(name = "Zakat", description = "Zakat computation, review, customer deduction, and certificates")
@Transactional(readOnly = true)
public class ZakatController {

    private final ZakatComputationService computationService;
    private final ZakatClassificationService classificationService;

    @PostMapping("/compute/bank")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatComputation>> computeBankZakat(
            @Valid @RequestBody ZakatRequests.ComputeBankZakatRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(computationService.computeBankZakat(request)));
    }

    @GetMapping("/customers/{customerId}/compute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ZakatResponses.CustomerZakatResult>> computeCustomerZakat(
            @PathVariable Long customerId,
            @RequestParam Integer zakatYear,
            @RequestParam(required = false) String methodologyCode) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.computeCustomerZakat(customerId, zakatYear, methodologyCode)));
    }

    @PostMapping("/compute/customers/aggregate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ZakatResponses.CustomerZakatResult>>> computeCustomerAggregate(
            @Valid @RequestBody ZakatRequests.ComputeCustomerAggregateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.computeCustomerAggregate(request)));
    }

    @PostMapping("/calculate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatResponses.ZakatCalculationResult>> calculate(
            @Valid @RequestBody ZakatRequests.CalculateZakatRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.calculate(request)));
    }

    @GetMapping("/classifications/{glAccountCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatResponses.ZakatClassificationResult>> classifyAccount(
            @PathVariable String glAccountCode,
            @RequestParam String methodologyCode) {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.classifyGlAccount(glAccountCode, methodologyCode)));
    }

    @GetMapping("/classifications/summary")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatResponses.ClassificationSummary>> summarizeClassifications(
            @RequestParam String methodologyCode,
            @RequestParam(required = false) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.summarizeClassifications(methodologyCode, asOfDate)));
    }

    @GetMapping("/computations/{computationRef}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatComputation>> getComputation(@PathVariable String computationRef) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.getComputation(computationRef)));
    }

    @GetMapping("/computations/{computationRef}/line-items")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ZakatComputationLineItem>>> getComputationLineItems(@PathVariable String computationRef) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.getComputationLineItems(computationRef)));
    }

    @PostMapping("/computations/{computationRef}/review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatComputation>> reviewComputation(@PathVariable String computationRef,
                                                                           @Valid @RequestBody ZakatRequests.SsbReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.reviewComputation(computationRef, request)));
    }

    @PostMapping("/computations/{computationRef}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ZakatComputation>> approveComputation(@PathVariable String computationRef,
                                                                            @Valid @RequestBody ZakatRequests.ApproveComputationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.approveComputation(computationRef, request)));
    }

    @PostMapping("/computations/{computationRef}/accrue")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatComputation>> accrueZakat(@PathVariable String computationRef,
                                                                     @Valid @RequestBody ZakatRequests.AccrueZakatRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.accrueZakat(computationRef, request)));
    }

    @PostMapping("/computations/{computationRef}/pay")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatComputation>> payZakat(@PathVariable String computationRef,
                                                                  @Valid @RequestBody ZakatRequests.PayZakatRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.payComputation(computationRef, request)));
    }

    @PostMapping("/customers/{customerId}/deduct")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ZakatResponses.ZakatCertificate>> deductCustomerZakat(
            @PathVariable Long customerId,
            @Valid @RequestBody ZakatRequests.CustomerZakatDeductionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.deductCustomerZakat(customerId, request)));
    }

    @GetMapping("/customers/{customerId}/certificate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ZakatResponses.ZakatCertificate>> getCertificate(
            @PathVariable Long customerId,
            @RequestParam Integer zakatYear) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.generateCustomerCertificate(customerId, zakatYear)));
    }

    @GetMapping("/trend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatResponses.ZakatTrendReport>> getTrendReport(
            @RequestParam Integer fromYear,
            @RequestParam Integer toYear) {
        return ResponseEntity.ok(ApiResponse.ok(computationService.getTrendReport(fromYear, toYear)));
    }
}