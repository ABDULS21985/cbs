package com.cbs.fees.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.entity.LatePenaltyRecord;
import com.cbs.fees.islamic.service.IslamicFeeAccrualService;
import com.cbs.fees.islamic.service.IslamicFeeService;
import com.cbs.fees.islamic.service.LatePenaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/islamic-fees")
@RequiredArgsConstructor
public class IslamicFeeController {

    private final IslamicFeeService islamicFeeService;
    private final LatePenaltyService latePenaltyService;
    private final IslamicFeeAccrualService accrualService;

    @PostMapping("/configurations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicFeeConfiguration>> createConfiguration(
            @RequestBody IslamicFeeRequests.SaveIslamicFeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(islamicFeeService.createFee(request)));
    }

    @GetMapping("/configurations/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<IslamicFeeConfiguration>> getConfiguration(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.getFee(id)));
    }

    @GetMapping("/configurations/code/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<IslamicFeeConfiguration>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.getFeeByCode(code)));
    }

    @PutMapping("/configurations/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicFeeConfiguration>> updateConfiguration(
            @PathVariable Long id,
            @RequestBody IslamicFeeRequests.SaveIslamicFeeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.updateFee(id, request)));
    }

    @PostMapping("/configurations/{id}/ssb-approve")
    @PreAuthorize("hasRole('SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<Void>> approveFee(
            @PathVariable Long id,
            @RequestBody IslamicFeeRequests.FeeSsbApprovalRequest request) {
        islamicFeeService.ssbApproveFee(id, request.getApprovedBy(), request.getApprovalRef());
        return ResponseEntity.ok(ApiResponse.ok(null, "Fee approved"));
    }

    @PatchMapping("/configurations/{id}/suspend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Void>> suspendFee(
            @PathVariable Long id,
            @RequestBody IslamicFeeRequests.SuspendFeeRequest request) {
        islamicFeeService.suspendFee(id, request.getReason());
        return ResponseEntity.ok(ApiResponse.ok(null, "Fee suspended"));
    }

    @GetMapping("/configurations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<IslamicFeeConfiguration>>> listFees(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String classification,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.listFees(category, classification, status)));
    }

    @GetMapping("/configurations/product/{productCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<IslamicFeeConfiguration>>> feesForProduct(@PathVariable String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.getFeesForProduct(productCode)));
    }

    @GetMapping("/configurations/contract-type/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<IslamicFeeConfiguration>>> feesForContractType(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.getFeesForContractType(code)));
    }

    @GetMapping("/configurations/charity-routed")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<IslamicFeeConfiguration>>> charityRoutedFees() {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.getCharityRoutedFees()));
    }

    @GetMapping("/configurations/pending-ssb")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<IslamicFeeConfiguration>>> pendingSsb() {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.getFeesPendingSsbApproval()));
    }

    @PostMapping("/calculate")
    @PreAuthorize("hasRole('CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.FeeCalculationResult>> calculate(
            @RequestBody IslamicFeeRequests.FeeCalculationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.calculateFeeByCode(request.getFeeCode(), request.getContext())));
    }

    @PostMapping("/charge")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.FeeChargeResult>> charge(
            @RequestBody IslamicFeeRequests.ChargeFeeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.chargeFee(request)));
    }

    @PostMapping("/charge-late-payment")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.LatePenaltyResult>> chargeLatePayment(
            @RequestBody IslamicFeeResponses.LatePenaltyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(latePenaltyService.processLatePenalty(request)));
    }

    @GetMapping("/product-schedule/{productCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.ProductFeeSchedule>> getProductSchedule(@PathVariable String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(islamicFeeService.getProductFeeSchedule(productCode)));
    }

    @PostMapping("/late-penalties/process")
    @PreAuthorize("hasAnyRole('SYSTEM','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.LatePenaltyResult>> processLatePenalty(
            @RequestBody IslamicFeeResponses.LatePenaltyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(latePenaltyService.processLatePenalty(request)));
    }

    @PostMapping("/late-penalties/batch")
    @PreAuthorize("hasAnyRole('SYSTEM','FINANCE')")
    public ResponseEntity<ApiResponse<List<IslamicFeeResponses.LatePenaltyResult>>> batchLatePenalties(
            @RequestBody(required = false) Map<String, String> body) {
        LocalDate asOfDate = body != null && body.get("asOfDate") != null ? LocalDate.parse(body.get("asOfDate")) : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(latePenaltyService.processAllOverduePenalties(asOfDate)));
    }

    @PostMapping("/late-penalties/{id}/reverse")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Void>> reverseLatePenalty(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        latePenaltyService.reverseLatePenalty(id, body.get("reason"), body.get("authorisedBy"));
        return ResponseEntity.ok(ApiResponse.ok(null, "Late penalty reversed"));
    }

    @GetMapping("/late-penalties/contract/{contractId}")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<LatePenaltyRecord>>> penaltiesByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(latePenaltyService.getPenaltiesByContract(contractId)));
    }

    @GetMapping("/late-penalties/customer/{customerId}")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<LatePenaltyRecord>>> penaltiesByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(latePenaltyService.getPenaltiesByCustomer(customerId)));
    }

    @GetMapping("/late-penalties/summary")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.LatePenaltySummary>> latePenaltySummary() {
        return ResponseEntity.ok(ApiResponse.ok(latePenaltyService.getLatePenaltySummary()));
    }

    @PostMapping("/accrual/batch")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> accrueBatch(@RequestBody(required = false) Map<String, String> body) {
        LocalDate accrualDate = body != null && body.get("accrualDate") != null ? LocalDate.parse(body.get("accrualDate")) : LocalDate.now();
        accrualService.accruePeriodicFees(accrualDate);
        return ResponseEntity.ok(ApiResponse.ok(null, "Periodic fees accrued"));
    }

    @PostMapping("/deferred/recognise-batch")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> recogniseDeferredBatch(@RequestBody(required = false) Map<String, String> body) {
        LocalDate recognitionDate = body != null && body.get("recognitionDate") != null ? LocalDate.parse(body.get("recognitionDate")) : LocalDate.now();
        accrualService.recogniseDeferredFees(recognitionDate);
        return ResponseEntity.ok(ApiResponse.ok(null, "Deferred fees recognised"));
    }

    @GetMapping("/receivable-aging")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.FeeReceivableAging>> receivableAging() {
        return ResponseEntity.ok(ApiResponse.ok(accrualService.getFeeReceivableAging()));
    }

    @GetMapping("/income-report")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicFeeResponses.FeeIncomeReport>> incomeReport(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.ok(accrualService.getFeeIncomeReport(fromDate, toDate)));
    }
}
