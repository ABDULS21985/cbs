package com.cbs.murabaha.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.murabaha.dto.AssetDamageReportRequest;
import com.cbs.murabaha.dto.ComplianceValidationResult;
import com.cbs.murabaha.dto.CreateMurabahaApplicationRequest;
import com.cbs.murabaha.dto.CreditAssessmentRequest;
import com.cbs.murabaha.dto.DeliveryDetailsRequest;
import com.cbs.murabaha.dto.EarlySettlementQuote;
import com.cbs.murabaha.dto.EarlySettlementRequest;
import com.cbs.murabaha.dto.ExecuteCustomerSaleRequest;
import com.cbs.murabaha.dto.ExecutePurchaseRequest;
import com.cbs.murabaha.dto.InitiateAssetPurchaseRequest;
import com.cbs.murabaha.dto.MurabahaApplicationResponse;
import com.cbs.murabaha.dto.MurabahaApprovalDetails;
import com.cbs.murabaha.dto.MurabahaContractResponse;
import com.cbs.murabaha.dto.MurabahaPortfolioSummary;
import com.cbs.murabaha.dto.MurabahaPricingRequest;
import com.cbs.murabaha.dto.MurabahaProfitRecognitionReport;
import com.cbs.murabaha.dto.MurabahaRepaymentSummary;
import com.cbs.murabaha.dto.OwnershipEvidenceRequest;
import com.cbs.murabaha.dto.PaymentDetailsRequest;
import com.cbs.murabaha.dto.ProcessMurabahaRepaymentRequest;
import com.cbs.murabaha.dto.PurchaseConfirmationRequest;
import com.cbs.murabaha.dto.PurchaseOrderDetailsRequest;
import com.cbs.murabaha.dto.TransferDetailsRequest;
import com.cbs.murabaha.entity.AssetMurabahaPurchase;
import com.cbs.murabaha.entity.CommodityMurabahaTrade;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import com.cbs.murabaha.service.AssetMurabahaService;
import com.cbs.murabaha.service.CommodityMurabahaService;
import com.cbs.murabaha.service.MurabahaContractService;
import com.cbs.murabaha.service.MurabahaOriginationService;
import com.cbs.murabaha.service.MurabahaProfitRecognitionService;
import com.cbs.murabaha.service.MurabahaScheduleService;
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
@RequestMapping("/api/v1/murabaha")
@RequiredArgsConstructor
public class MurabahaController {

    private final MurabahaOriginationService originationService;
    private final MurabahaContractService contractService;
    private final CommodityMurabahaService commodityService;
    private final AssetMurabahaService assetService;
    private final MurabahaScheduleService scheduleService;
    private final MurabahaProfitRecognitionService profitRecognitionService;

    @PostMapping("/applications")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaApplicationResponse>> createApplication(
            @Valid @RequestBody CreateMurabahaApplicationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(originationService.createApplication(request)));
    }

    @GetMapping("/applications/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER','CBS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<ApiResponse<MurabahaApplicationResponse>> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.getApplication(id)));
    }

    @PostMapping("/applications/{id}/submit")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaApplicationResponse>> submitApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.submitApplication(id)));
    }

    @PostMapping("/applications/{id}/credit-assessment")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaApplicationResponse>> performCreditAssessment(
            @PathVariable Long id,
            @Valid @RequestBody CreditAssessmentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.performCreditAssessment(id, request)));
    }

    @PostMapping("/applications/{id}/price")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MurabahaApplicationResponse>> priceApplication(
            @PathVariable Long id,
            @Valid @RequestBody MurabahaPricingRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.priceApplication(id, request)));
    }

    @PostMapping("/applications/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<ApiResponse<MurabahaApplicationResponse>> approveApplication(
            @PathVariable Long id,
            @Valid @RequestBody MurabahaApprovalDetails request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.approveApplication(id, authentication.getName(), request)));
    }

    @PostMapping("/applications/{id}/reject")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','BRANCH_MANAGER','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaApplicationResponse>> rejectApplication(
            @PathVariable Long id,
            @RequestParam String reason
    ) {
        return ResponseEntity.ok(ApiResponse.ok(originationService.rejectApplication(id, reason)));
    }

    @PostMapping("/applications/{id}/convert")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaContractResponse>> convertToContract(@PathVariable Long id) {
        MurabahaContract contract = originationService.convertToContract(id);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(contractService.getContract(contract.getId())));
    }

    @GetMapping("/contracts/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<MurabahaContractResponse>> getContract(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContract(id)));
    }

    @GetMapping("/contracts/ref/{ref}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<MurabahaContractResponse>> getContractByRef(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractByRef(ref)));
    }

    @GetMapping("/contracts/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','LOAN_OFFICER','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<MurabahaContractResponse>>> getCustomerContracts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getCustomerContracts(customerId)));
    }

    @PostMapping("/contracts/{id}/execute")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MurabahaContractResponse>> executeContract(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.executeContract(id, authentication.getName())));
    }

    @GetMapping("/contracts/{id}/early-settlement-quote")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EarlySettlementQuote>> earlySettlementQuote(
            @PathVariable Long id,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.calculateEarlySettlement(id, date)));
    }

    @PostMapping("/contracts/{id}/early-settle")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MurabahaContractResponse>> earlySettle(
            @PathVariable Long id,
            @Valid @RequestBody EarlySettlementRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.processEarlySettlement(
                id,
                request.getSettlementDate(),
                request.getIbraAmount(),
                request.getDebitAccountId(),
                request.getExternalRef())));
    }

    @PostMapping("/contracts/{id}/default")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markDefaulted(
            @PathVariable Long id,
            @RequestParam String reason
    ) {
        contractService.markAsDefaulted(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("defaulted", true)));
    }

    @PostMapping("/contracts/{id}/write-off")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> writeOff(
            @PathVariable Long id,
            @RequestParam String reason,
            Authentication authentication
    ) {
        contractService.writeOff(id, authentication.getName(), reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("writtenOff", true)));
    }

    @GetMapping("/portfolio-summary")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<MurabahaPortfolioSummary>> portfolioSummary() {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getPortfolioSummary()));
    }

    @GetMapping("/contracts/maturing")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<MurabahaContract>>> getMaturingContracts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractsMaturingBetween(from, to)));
    }

    @PostMapping("/contracts/{contractId}/commodity-trade/initiate")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> initiateCommodityTrade(@PathVariable Long contractId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(commodityService.initiateTrade(contractId)));
    }

    @PostMapping("/commodity-trades/{tradeId}/purchase")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> executePurchase(
            @PathVariable Long tradeId,
            @Valid @RequestBody ExecutePurchaseRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.executePurchase(tradeId, request)));
    }

    @PostMapping("/commodity-trades/{tradeId}/confirm-purchase")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> confirmPurchase(
            @PathVariable Long tradeId,
            @Valid @RequestBody PurchaseConfirmationRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.confirmPurchase(tradeId, request)));
    }

    @PostMapping("/commodity-trades/{tradeId}/record-ownership")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> recordOwnership(
            @PathVariable Long tradeId,
            @Valid @RequestBody OwnershipEvidenceRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.recordOwnership(tradeId, request)));
    }

    @PostMapping("/commodity-trades/{tradeId}/verify-ownership")
    @PreAuthorize("hasAnyRole('COMPLIANCE')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> verifyCommodityOwnership(
            @PathVariable Long tradeId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.verifyOwnership(tradeId, authentication.getName())));
    }

    @PostMapping("/commodity-trades/{tradeId}/murabaha-sale")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> executeMurabahaSale(
            @PathVariable Long tradeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate saleDate
    ) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.executeMurabahaSale(tradeId, saleDate)));
    }

    @PostMapping("/commodity-trades/{tradeId}/customer-sale")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> executeCustomerSale(
            @PathVariable Long tradeId,
            @Valid @RequestBody ExecuteCustomerSaleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.executeCustomerSale(tradeId, request)));
    }

    @GetMapping("/commodity-trades/{tradeId}")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN','COMPLIANCE','FINANCE')")
    public ResponseEntity<ApiResponse<CommodityMurabahaTrade>> getTrade(@PathVariable Long tradeId) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.getTrade(tradeId)));
    }

    @GetMapping("/commodity-trades/{tradeId}/compliance")
    @PreAuthorize("hasAnyRole('TREASURY','CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<ComplianceValidationResult>> getTradeCompliance(@PathVariable Long tradeId) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.validateTradeCompliance(tradeId)));
    }

    @GetMapping("/commodity-trades/pending-ownership")
    @PreAuthorize("hasAnyRole('COMPLIANCE','TREASURY','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<CommodityMurabahaTrade>>> pendingCommodityOwnership() {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.getPendingOwnershipVerification()));
    }

    @PostMapping("/contracts/{contractId}/asset-purchase/initiate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> initiateAssetPurchase(
            @PathVariable Long contractId,
            @Valid @RequestBody InitiateAssetPurchaseRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(assetService.initiatePurchase(contractId, request)));
    }

    @PostMapping("/asset-purchases/{id}/purchase-order")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> issuePurchaseOrder(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderDetailsRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.issuePurchaseOrder(id, request)));
    }

    @PostMapping("/asset-purchases/{id}/record-payment")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> recordSupplierPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentDetailsRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.recordPaymentToSupplier(id, request)));
    }

    @PostMapping("/asset-purchases/{id}/record-delivery")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> recordDelivery(
            @PathVariable Long id,
            @Valid @RequestBody DeliveryDetailsRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.recordDelivery(id, request)));
    }

    @PostMapping("/asset-purchases/{id}/record-possession")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> recordPossession(
            @PathVariable Long id,
            @Valid @RequestBody OwnershipEvidenceRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.recordPossession(id, request)));
    }

    @PostMapping("/asset-purchases/{id}/verify-ownership")
    @PreAuthorize("hasAnyRole('COMPLIANCE')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> verifyAssetOwnership(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.verifyOwnership(id, authentication.getName())));
    }

    @PostMapping("/asset-purchases/{id}/transfer-to-customer")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> transferToCustomer(
            @PathVariable Long id,
            @Valid @RequestBody TransferDetailsRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.transferToCustomer(id, request)));
    }

    @PostMapping("/asset-purchases/{id}/report-damage")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reportDamage(
            @PathVariable Long id,
            @Valid @RequestBody AssetDamageReportRequest request
    ) {
        assetService.recordAssetDamageOrLoss(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("reported", true)));
    }

    @GetMapping("/asset-purchases/{id}")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','COMPLIANCE','FINANCE')")
    public ResponseEntity<ApiResponse<AssetMurabahaPurchase>> getAssetPurchase(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getPurchase(id)));
    }

    @GetMapping("/asset-purchases/{id}/checklist")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<Object>> getVerificationChecklist(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getPurchase(id).getVerificationChecklist()));
    }

    @GetMapping("/asset-purchases/pending-verification")
    @PreAuthorize("hasAnyRole('COMPLIANCE','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AssetMurabahaPurchase>>> pendingAssetVerification() {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getPendingVerification()));
    }

    @GetMapping("/contracts/{id}/schedule")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<List<MurabahaInstallment>>> getSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getSchedule(id)));
    }

    @PostMapping("/contracts/{id}/schedule/generate")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MurabahaInstallment>>> generateSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.generateSchedule(id)));
    }

    @PostMapping("/contracts/{id}/repay")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MurabahaInstallment>> repay(
            @PathVariable Long id,
            @Valid @RequestBody ProcessMurabahaRepaymentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.processRepayment(id, request)));
    }

    @GetMapping("/contracts/{id}/next-due")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaInstallment>> nextDue(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getNextDueInstallment(id)));
    }

    @GetMapping("/contracts/{id}/overdue")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<List<MurabahaInstallment>>> overdue(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getOverdueInstallments(id)));
    }

    @GetMapping("/contracts/{id}/repayment-summary")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','TELLER','CBS_ADMIN','LOAN_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaRepaymentSummary>> repaymentSummary(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getRepaymentSummary(id)));
    }

    @PostMapping("/contracts/{id}/recognise-profit")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recogniseProfit(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        profitRecognitionService.recogniseProfitForPeriod(id, fromDate, toDate);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("recognised", true)));
    }

    @PostMapping("/profit-recognition/batch")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recogniseProfitBatch(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        profitRecognitionService.recogniseProfitBatch(fromDate, toDate);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("batchRecognised", true)));
    }

    @GetMapping("/profit-recognition/report")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<MurabahaProfitRecognitionReport>> profitRecognitionReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ResponseEntity.ok(ApiResponse.ok(profitRecognitionService.getProfitRecognitionReport(fromDate, toDate)));
    }

    @GetMapping("/deferred-profit-total")
    @PreAuthorize("hasAnyRole('FINANCE','CBS_ADMIN','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> deferredProfitTotal() {
        return ResponseEntity.ok(ApiResponse.ok(profitRecognitionService.getTotalDeferredProfit()));
    }

    @PostMapping("/contracts/{id}/impair")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> impairContract(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam String reason
    ) {
        profitRecognitionService.recogniseImpairment(id, amount, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("impaired", true)));
    }

    @PostMapping("/contracts/{id}/reverse-impairment")
    @PreAuthorize("hasAnyRole('FINANCE','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reverseImpairment(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam String reason
    ) {
        profitRecognitionService.reverseImpairment(id, amount, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("reversed", true)));
    }
}
