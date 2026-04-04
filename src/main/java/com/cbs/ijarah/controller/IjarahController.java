package com.cbs.ijarah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahGradualTransferUnit;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.entity.IjarahTransferMechanism;
import com.cbs.ijarah.service.IjarahContractService;
import com.cbs.ijarah.service.IjarahGLService;
import com.cbs.ijarah.service.IjarahOriginationService;
import com.cbs.ijarah.service.IjarahRentalService;
import com.cbs.ijarah.service.IjarahTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ijarah")
@RequiredArgsConstructor
public class IjarahController {

    private final IjarahOriginationService originationService;
    private final IjarahContractService contractService;
    private final IjarahTransferService transferService;
    private final IjarahRentalService rentalService;
    private final IjarahGLService glService;

    @PostMapping("/applications")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahApplicationResponse>> createApplication(
            @Valid @RequestBody IjarahRequests.CreateApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(originationService.createApplication(request)));
    }

    @GetMapping("/applications/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER','CBS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahApplicationResponse>> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.getApplication(id)));
    }

    @PostMapping("/applications/{id}/submit")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahApplicationResponse>> submitApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.submitApplication(id)));
    }

    @PostMapping("/applications/{id}/credit-assessment")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahApplicationResponse>> creditAssessment(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.CreditAssessmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.performCreditAssessment(id, request)));
    }

    @PostMapping("/applications/{id}/price")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahApplicationResponse>> priceApplication(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.PricingRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.priceApplication(id, request)));
    }

    @PostMapping("/applications/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahApplicationResponse>> approveApplication(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.approveApplication(id, authentication.getName())));
    }

    @PostMapping("/applications/{id}/convert")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> convertToContract(@PathVariable Long id) {
        IjarahContract contract = originationService.convertToContract(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(contractService.getContract(contract.getId())));
    }

    @GetMapping("/contracts/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> getContract(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContract(id)));
    }

    @GetMapping("/contracts/ref/{ref}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> getContractByRef(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractByRef(ref)));
    }

    @GetMapping("/contracts/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahResponses.IjarahContractResponse>>> getCustomerContracts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getCustomerContracts(customerId)));
    }

    @PostMapping("/contracts/{id}/procure-asset")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> procureAsset(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.AssetProcurementRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.initiateAssetProcurement(id, request)));
    }

    @PostMapping("/contracts/{id}/confirm-ownership")
    @PreAuthorize("hasAnyRole('COMPLIANCE','CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> confirmOwnership(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.AssetOwnershipConfirmationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.confirmAssetOwnership(id, request)));
    }

    @PostMapping("/contracts/{id}/execute")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> executeContract(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.executeContract(id, authentication.getName())));
    }

    @PostMapping("/contracts/{id}/asset-damage")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> assetDamage(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.AssetDamageReportRequest request) {
        contractService.recordAssetDamage(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("recorded", true)));
    }

    @PostMapping("/contracts/{id}/asset-total-loss")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> assetTotalLoss(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.AssetTotalLossRequest request) {
        contractService.recordAssetTotalLoss(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("terminated", true)));
    }

    @PostMapping("/contracts/{id}/insurance-renewal")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> insuranceRenewal(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.InsuranceRenewalRequest request) {
        contractService.processInsuranceRenewal(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("renewed", true)));
    }

    @PostMapping("/contracts/{id}/major-maintenance")
    @PreAuthorize("hasAnyRole('CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> majorMaintenance(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.MaintenanceRecordRequest request) {
        contractService.recordMajorMaintenance(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("recorded", true)));
    }

    @PostMapping("/contracts/{id}/review-rental")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> reviewRental(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.RentalReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.reviewRental(id, request)));
    }

    @PostMapping("/contracts/{id}/maturity")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> processMaturity(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.processLeaseMaturity(id)));
    }

    @PostMapping("/contracts/{id}/early-terminate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahContractResponse>> earlyTerminate(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.EarlyTerminationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.processEarlyTermination(id, request)));
    }

    @GetMapping("/portfolio-summary")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahPortfolioSummary>> portfolioSummary() {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getPortfolioSummary()));
    }

    @GetMapping("/contracts/expiring-insurance")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahContract>>> expiringInsurance(@RequestParam(defaultValue = "30") int daysAhead) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractsWithExpiringInsurance(daysAhead)));
    }

    @GetMapping("/contracts/upcoming-reviews")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahContract>>> upcomingReviews(@RequestParam(defaultValue = "30") int daysAhead) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractsWithUpcomingRentalReview(daysAhead)));
    }

    @GetMapping("/contracts/in-arrears")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahContract>>> inArrears() {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractsInArrears()));
    }

    @PostMapping("/contracts/{contractId}/transfer-mechanism")
    @PreAuthorize("hasAnyRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IjarahTransferMechanism>> createTransferMechanism(
            @PathVariable Long contractId,
            @Valid @RequestBody IjarahRequests.CreateTransferMechanismRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(transferService.createTransferMechanism(contractId, request)));
    }

    @GetMapping("/contracts/{contractId}/transfer-mechanism")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahTransferMechanism>> getTransferByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(transferService.getTransferByContract(contractId)));
    }

    @PostMapping("/transfer-mechanisms/{id}/sign")
    @PreAuthorize("hasAnyRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> signTransfer(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.SignatureDetailsRequest request) {
        transferService.signTransferDocument(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("signed", true)));
    }

    @PostMapping("/transfer-mechanisms/{id}/execute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahTransferMechanism>> executeTransfer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(transferService.executeTransfer(id)));
    }

    @PostMapping("/transfer-mechanisms/{id}/units/{unitNumber}/transfer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processUnitTransfer(
            @PathVariable Long id,
            @PathVariable int unitNumber) {
        transferService.processUnitTransfer(id, unitNumber);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", true)));
    }

    @PostMapping("/transfer-mechanisms/{id}/cancel")
    @PreAuthorize("hasAnyRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cancelTransfer(
            @PathVariable Long id,
            @RequestParam String reason) {
        transferService.cancelTransfer(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("cancelled", true)));
    }

    @GetMapping("/transfer-mechanisms/{id}/schedule")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahGradualTransferUnit>>> transferSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(transferService.getTransferSchedule(id)));
    }

    @GetMapping("/transfer-mechanisms/pending")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahTransferMechanism>>> pendingTransfers() {
        return ResponseEntity.ok(ApiResponse.ok(transferService.getPendingTransfers()));
    }

    @PostMapping("/contracts/{id}/schedule/generate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IjarahRentalInstallment>>> generateSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.generateRentalSchedule(id)));
    }

    @GetMapping("/contracts/{id}/schedule")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahRentalInstallment>>> getSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getSchedule(id)));
    }

    @PostMapping("/contracts/{id}/pay-rental")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER')")
    public ResponseEntity<ApiResponse<IjarahRentalInstallment>> payRental(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.ProcessRentalPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.processRentalPayment(id, request)));
    }

    @GetMapping("/contracts/{id}/next-due")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahRentalInstallment>> nextDue(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getNextDueInstallment(id)));
    }

    @GetMapping("/contracts/{id}/overdue")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahRentalInstallment>>> overdue(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getOverdueInstallments(id)));
    }

    @GetMapping("/contracts/{id}/maintenance-obligations")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahResponses.MaintenanceObligationSummary>> maintenanceObligations(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getMaintenanceObligations(id)));
    }

    @GetMapping("/contracts/{id}/rental-summary")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahRentalSummary>> rentalSummary(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getRentalSummary(id)));
    }

    @GetMapping("/maintenance-due")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahContract>>> maintenanceDue(@RequestParam(defaultValue = "30") int daysAhead) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getContractsWithMaintenanceDue(daysAhead)));
    }

    @PostMapping("/gl/depreciation-batch")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> depreciationBatch(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfMonth) {
        glService.postDepreciationBatch(asOfMonth);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", true)));
    }

    @PostMapping("/gl/rental-income-batch")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rentalIncomeBatch(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodTo) {
        glService.recogniseRentalIncomeBatch(periodFrom, periodTo);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", true)));
    }

    @GetMapping("/gl/balance-sheet-view")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahBalanceSheetView>> balanceSheetView(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getIjarahBalanceSheetView(asOfDate != null ? asOfDate : LocalDate.now())));
    }

    @GetMapping("/gl/income-report")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahIncomeReport>> incomeReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getIncomeReport(fromDate, toDate)));
    }

    @GetMapping("/gl/net-assets")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BigDecimal>> netAssets(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getNetIjarahAssets(asOfDate != null ? asOfDate : LocalDate.now())));
    }

    @PostMapping("/gl/contracts/{id}/impair")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> impair(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam String reason) {
        IjarahResponses.IjarahContractResponse contract = contractService.getContract(id);
        glService.postIjarahImpairment(contract.getIjarahAssetId(), amount, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("impaired", true)));
    }
}
