package com.cbs.musharakah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.entity.MusharakahUnitTransfer;
import com.cbs.musharakah.service.MusharakahBuyoutService;
import com.cbs.musharakah.service.MusharakahContractService;
import com.cbs.musharakah.service.MusharakahLossService;
import com.cbs.musharakah.service.MusharakahOriginationService;
import com.cbs.musharakah.service.MusharakahRentalService;
import com.cbs.musharakah.service.MusharakahUnitService;
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
@RequestMapping("/api/v1/musharakah")
@RequiredArgsConstructor
public class MusharakahController {

    private final MusharakahOriginationService originationService;
    private final MusharakahContractService contractService;
    private final MusharakahUnitService unitService;
    private final MusharakahRentalService rentalService;
    private final MusharakahBuyoutService buyoutService;
    private final MusharakahLossService lossService;

    @PostMapping("/applications")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahApplicationResponse>> createApplication(
            @Valid @RequestBody MusharakahRequests.CreateApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(originationService.createApplication(request)));
    }

    @GetMapping("/applications/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER','CBS_ADMIN','BRANCH_MANAGER','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahApplicationResponse>> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.getApplication(id)));
    }

    @PostMapping("/applications/{id}/submit")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahApplicationResponse>> submitApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.submitApplication(id)));
    }

    @PostMapping("/applications/{id}/valuation")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahApplicationResponse>> performValuation(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.ValuationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.performValuation(id, request)));
    }

    @PostMapping("/applications/{id}/price")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahApplicationResponse>> priceApplication(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.PricingRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.priceApplication(id, request)));
    }

    @PostMapping("/applications/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahApplicationResponse>> approveApplication(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.approveApplication(id, authentication.getName())));
    }

    @PostMapping("/applications/{id}/convert")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> convertToContract(@PathVariable Long id) {
        var contract = originationService.convertToContract(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(contractService.getContract(contract.getId())));
    }

    @GetMapping("/contracts/{id}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> getContract(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContract(id)));
    }

    @GetMapping("/contracts/ref/{ref}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> getContractByRef(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractByRef(ref)));
    }

    @GetMapping("/contracts/customer/{customerId}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MusharakahResponses.MusharakahContractResponse>>> getCustomerContracts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getCustomerContracts(customerId)));
    }

    @PostMapping("/contracts/{id}/procure-asset")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> procureAsset(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.initiateAssetProcurement(id)));
    }

    @PostMapping("/contracts/{id}/register-joint-ownership")
    @PreAuthorize("hasAnyRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> registerJointOwnership(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.JointOwnershipDetails request) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.registerJointOwnership(id, request)));
    }

    @PostMapping("/contracts/{id}/execute")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> executeContract(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.executeContract(id, authentication.getName())));
    }

    @GetMapping("/contracts/{id}/ownership")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.OwnershipState>> getOwnership(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getCurrentOwnership(id)));
    }

    @GetMapping("/contracts/{id}/early-buyout-quote")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.EarlyBuyoutQuote>> getEarlyBuyoutQuote(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate buyoutDate) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.calculateEarlyBuyout(id, buyoutDate != null ? buyoutDate : LocalDate.now())));
    }

    @PostMapping("/contracts/{id}/early-buyout")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> processEarlyBuyout(
            @PathVariable Long id,
            @RequestParam BigDecimal buyoutAmount) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.processEarlyBuyout(id, buyoutAmount)));
    }

    @PostMapping("/contracts/{id}/dissolve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dissolvePartnership(@PathVariable Long id,
                                                                                @RequestParam(defaultValue = "MANUAL_DISSOLUTION") String reason) {
        contractService.dissolvePartnership(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("dissolved", true)));
    }

    @PostMapping("/contracts/{id}/review-rental")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahContractResponse>> reviewRental(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.RentalReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.reviewRental(id, request)));
    }

    @GetMapping("/portfolio-summary")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahPortfolioSummary>> portfolioSummary() {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getPortfolioSummary()));
    }

    @GetMapping("/contracts/{id}/units")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.OwnershipState>> getCurrentUnits(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getCurrentOwnership(id)));
    }

    @PostMapping("/contracts/{id}/units/transfer")
    @PreAuthorize("hasAnyRole('CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahUnitTransfer>> transferUnits(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.TransferUnitsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.transferUnits(
                id,
                request.getUnitCount(),
                request.getTransferDate(),
                request.getPaymentAmount(),
                request.getPaymentTransactionRef())));
    }

    @GetMapping("/contracts/{id}/units/history")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MusharakahUnitTransfer>>> getTransferHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getTransferHistory(id)));
    }

    @GetMapping("/contracts/{id}/units/timeline")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.OwnershipTimeline>> getOwnershipTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getOwnershipTimeline(id)));
    }

    @PostMapping("/contracts/{id}/units/update-fair-value")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateFairValue(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.UpdateFairValueRequest request) {
        unitService.updateUnitFairValue(id, request.getCurrentMarketValue(), request.getAppraiser());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("updated", true)));
    }

    @GetMapping("/contracts/{id}/units/bank-share-value")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> getBankShareValue(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getBankShareValue(id)));
    }

    @PostMapping("/contracts/{id}/rental-schedule/generate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MusharakahRentalInstallment>>> generateRentalSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.generateRentalSchedule(id)));
    }

    @GetMapping("/contracts/{id}/rental-schedule")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MusharakahRentalInstallment>>> getRentalSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getSchedule(id)));
    }

    @GetMapping("/contracts/{id}/combined-schedule")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahCombinedSchedule>> getCombinedSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getCombinedSchedule(id)));
    }

    @PostMapping("/contracts/{id}/pay-rental")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER')")
    public ResponseEntity<ApiResponse<MusharakahRentalInstallment>> payRental(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.ProcessRentalPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.processRentalPayment(id, request)));
    }

    @GetMapping("/contracts/{id}/next-rental-due")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahRentalInstallment>> getNextRentalDue(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getNextDueInstallment(id)));
    }

    @GetMapping("/contracts/{id}/overdue-rentals")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MusharakahRentalInstallment>>> getOverdueRentals(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getOverdueInstallments(id)));
    }

    @PostMapping("/contracts/{id}/review-rental-rate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reviewRentalRate(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.RentalReviewRequest request) {
        rentalService.applyRentalReview(id, request.getNewRate(), request.getEffectiveDate());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("reviewed", true)));
    }

    @GetMapping("/contracts/{id}/rental-summary")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahRentalSummary>> getRentalSummary(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rentalService.getRentalSummary(id)));
    }

    @PostMapping("/contracts/{id}/buyout-schedule/generate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MusharakahBuyoutInstallment>>> generateBuyoutSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(buyoutService.generateBuyoutSchedule(id)));
    }

    @GetMapping("/contracts/{id}/buyout-schedule")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MusharakahBuyoutInstallment>>> getBuyoutSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(buyoutService.getSchedule(id)));
    }

    @PostMapping("/contracts/{id}/pay-buyout")
    @PreAuthorize("hasAnyRole('CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahBuyoutInstallment>> payBuyout(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.ProcessBuyoutPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(buyoutService.processBuyoutPayment(id, request)));
    }

    @PostMapping("/contracts/{id}/pay-combined")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.CombinedPaymentResult>> payCombined(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.CombinedPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(buyoutService.processCombinedPayment(id, request)));
    }

    @GetMapping("/contracts/{id}/buyout-summary")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahBuyoutSummary>> getBuyoutSummary(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(buyoutService.getBuyoutSummary(id)));
    }

    @PostMapping("/contracts/{id}/loss-events")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahLossEventResponse>> recordLossEvent(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.RecordLossEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lossService.recordLossEvent(id, request)));
    }

    @GetMapping("/contracts/{id}/loss-events")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<MusharakahResponses.MusharakahLossEventResponse>>> getLossHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(lossService.getLossHistory(id)));
    }

    @GetMapping("/loss-events/{id}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahLossEventResponse>> getLossEvent(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(lossService.getLossEvent(id)));
    }

    @PostMapping("/loss-events/{id}/assess")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahLossEventResponse>> assessLoss(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.LossAssessmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(lossService.assessLoss(id, request)));
    }

    @PostMapping("/loss-events/{id}/allocate")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahLossEventResponse>> allocateLoss(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(lossService.allocateLoss(id)));
    }

    @PostMapping("/loss-events/{id}/post")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> postLoss(@PathVariable Long id) {
        lossService.postLoss(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("posted", true)));
    }

    @PostMapping("/contracts/{id}/asset-total-loss")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processTotalLoss(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.AssetTotalLossRequest request) {
        lossService.processAssetTotalLoss(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("terminated", true)));
    }

    @PostMapping("/contracts/{id}/impairment")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processImpairment(
            @PathVariable Long id,
            @RequestParam BigDecimal impairmentAmount,
            @RequestParam(required = false) String valuationRef) {
        lossService.processAssetImpairment(id, impairmentAmount, valuationRef);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", true)));
    }

    @PostMapping("/contracts/{id}/forced-sale")
    @PreAuthorize("hasAnyRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MusharakahResponses.MusharakahLossEventResponse>> processForcedSale(
            @PathVariable Long id,
            @Valid @RequestBody MusharakahRequests.ForcedSaleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(lossService.processForcedSaleLoss(id, request)));
    }
}
