package com.cbs.portal.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.portal.islamic.dto.IslamicPortalDtos.*;
import com.cbs.portal.islamic.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/portal/islamic")
@RequiredArgsConstructor
@Tag(name = "Islamic Internet Banking Portal", description = "Customer-facing portal with Islamic terminology, bilingual content, and Shariah-compliant UX")
public class IslamicPortalController {

    private final IslamicPortalBffService bffService;
    private final IslamicFinancingPortalService financingService;
    private final IslamicProductMarketplaceService marketplaceService;
    private final ProfitDistributionPortalService profitService;
    private final IslamicOnboardingPortalService onboardingService;

    // ========================================================================
    // CAPABILITY 1 — ACCOUNT VIEWS
    // ========================================================================

    @GetMapping("/dashboard")
    @Operation(summary = "Islamic customer dashboard with accounts, financing, cards — all in Islamic terminology")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicAccountDashboardDTO>> getDashboard(
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(bffService.getDashboard(customerId, language)));
    }

    @GetMapping("/accounts/{accountId}")
    @Operation(summary = "Detailed Islamic account view — Wadiah or Mudarabah specifics")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicAccountDetailDTO>> getAccountDetail(
            @RequestParam Long customerId,
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(bffService.getAccountDetail(customerId, accountId, language)));
    }

    @GetMapping("/accounts/{accountId}/transactions")
    @Operation(summary = "Transaction history with Islamic terminology applied to all descriptions")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Page<IslamicTransactionDTO>>> getTransactionHistory(
            @RequestParam Long customerId,
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(bffService.getTransactionHistory(customerId, accountId, page, size, language)));
    }

    @GetMapping("/accounts/{accountId}/mini-statement")
    @Operation(summary = "Quick view — last 5 transactions with Islamic terminology")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<IslamicTransactionDTO>>> getMiniStatement(
            @RequestParam Long customerId,
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(bffService.getMiniStatement(customerId, accountId, language)));
    }

    // ========================================================================
    // CAPABILITY 2 — FINANCING VIEWS
    // ========================================================================

    @GetMapping("/financing")
    @Operation(summary = "All customer financing contracts — Murabaha, Ijarah, Musharakah")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<IslamicFinancingSummaryDTO>>> getFinancingDashboard(
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(financingService.getFinancingDashboard(customerId, language)));
    }

    @GetMapping("/financing/{contractId}")
    @Operation(summary = "Detailed financing contract view with contract-type-specific terminology")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicFinancingDetailDTO>> getFinancingDetail(
            @RequestParam Long customerId,
            @PathVariable Long contractId,
            @RequestParam String contractType,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(financingService.getFinancingDetail(customerId, contractId, contractType, language)));
    }

    @GetMapping("/financing/{contractId}/schedule")
    @Operation(summary = "Payment schedule — installments, rentals, or combined buyout+rental")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicFinancingDetailDTO>> getPaymentSchedule(
            @RequestParam Long customerId,
            @PathVariable Long contractId,
            @RequestParam String contractType,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(financingService.getFinancingDetail(customerId, contractId, contractType, language)));
    }

    @GetMapping("/financing/{contractId}/early-settlement")
    @Operation(summary = "Early settlement calculator — shows Ibra for Murabaha, buyout for Musharakah")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<EarlySettlementPortalDTO>> calculateEarlySettlement(
            @RequestParam Long customerId,
            @PathVariable Long contractId,
            @RequestParam String contractType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate settlementDate) {
        return ResponseEntity.ok(ApiResponse.ok(financingService.calculateEarlySettlement(customerId, contractId, contractType, settlementDate)));
    }

    @GetMapping("/financing/{contractId}/repayment-summary")
    @Operation(summary = "Repayment summary — total paid, remaining, on-time percentage")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<RepaymentSummaryDTO>> getRepaymentSummary(
            @RequestParam Long customerId,
            @PathVariable Long contractId,
            @RequestParam String contractType) {
        return ResponseEntity.ok(ApiResponse.ok(financingService.getRepaymentSummary(customerId, contractId, contractType)));
    }

    // ========================================================================
    // CAPABILITY 3 — PRODUCT MARKETPLACE
    // ========================================================================

    @GetMapping("/marketplace")
    @Operation(summary = "Browse Shariah-compliant products with Fatwa references and key Islamic features")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicProductMarketplaceDTO>> getMarketplace(
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "EN") String language,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String contractType) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getMarketplace(customerId, language, category, contractType)));
    }

    @GetMapping("/marketplace/{productCode}")
    @Operation(summary = "Product detail with full Shariah badge, eligibility check, and key features")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<ProductCardDTO>> getProductDetail(
            @PathVariable String productCode,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getProductDetail(productCode, customerId, language)));
    }

    @PostMapping("/marketplace/compare")
    @Operation(summary = "Compare up to 4 Islamic products side by side")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<ProductComparisonDTO>> compareProducts(
            @RequestBody List<String> productCodes,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.compareProducts(productCodes, language)));
    }

    @GetMapping("/marketplace/recommended")
    @Operation(summary = "Recommended Shariah-compliant products for the customer")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<ProductCardDTO>>> getRecommendedProducts(
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(marketplaceService.getRecommendedProducts(customerId, language)));
    }

    // ========================================================================
    // CAPABILITY 4 — PROFIT DISTRIBUTION VIEW
    // ========================================================================

    @GetMapping("/accounts/{accountId}/profit-distribution")
    @Operation(summary = "Transparent profit distribution breakdown — pool, weight, PER, IRR, PSR, net")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<ProfitDistributionPortalDTO>> getProfitDistribution(
            @RequestParam Long customerId,
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(profitService.getProfitDistributionView(customerId, accountId, language)));
    }

    @GetMapping("/accounts/{accountId}/profit-history")
    @Operation(summary = "Profit distribution history — last N periods")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<ProfitDistributionPeriodDTO>>> getProfitHistory(
            @RequestParam Long customerId,
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "12") int periods,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(profitService.getDistributionHistory(customerId, accountId, periods, language)));
    }

    // ========================================================================
    // CAPABILITY 5 — DIGITAL ONBOARDING
    // ========================================================================

    @PostMapping("/applications/initiate")
    @Operation(summary = "Initiate Islamic product application with step-by-step flow")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<IslamicApplicationFlowDTO>> initiateApplication(
            @RequestParam Long customerId,
            @RequestParam String productCode,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(onboardingService.initiateApplication(customerId, productCode, language)));
    }

    @GetMapping("/applications/{applicationRef}/shariah-disclosure")
    @Operation(summary = "Get Shariah disclosure for the contract type — MANDATORY step")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<ShariahDisclosurePortalDTO>> getShariahDisclosure(
            @PathVariable String applicationRef,
            @RequestParam String contractType,
            @RequestParam(defaultValue = "EN") String language) {
        return ResponseEntity.ok(ApiResponse.ok(onboardingService.getShariahDisclosure(contractType, language)));
    }

    @PostMapping("/applications/{applicationRef}/shariah-consent")
    @Operation(summary = "Record customer consent to Shariah disclosures — ALL items must be consented")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<Void>> recordShariahConsent(
            @RequestParam Long customerId,
            @PathVariable String applicationRef,
            @RequestBody ShariahConsentRequest consent) {
        onboardingService.recordShariahConsent(customerId, applicationRef, consent);
        return ResponseEntity.ok(ApiResponse.ok(null, "Shariah consent recorded successfully"));
    }

    @PostMapping("/applications/{applicationRef}/submit")
    @Operation(summary = "Submit application — requires Shariah consent to be recorded first")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<ApplicationSubmissionResult>> submitApplication(
            @RequestParam Long customerId,
            @PathVariable String applicationRef,
            @RequestParam String contractType,
            @RequestBody(required = false) Map<String, Object> applicationData) {
        return ResponseEntity.ok(ApiResponse.ok(onboardingService.submitApplication(customerId, applicationRef, contractType, applicationData)));
    }

    @GetMapping("/applications/{applicationRef}/status")
    @Operation(summary = "Check application status")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<ApplicationStatusDTO>> getApplicationStatus(
            @RequestParam Long customerId,
            @PathVariable String applicationRef) {
        return ResponseEntity.ok(ApiResponse.ok(onboardingService.getApplicationStatus(customerId, applicationRef)));
    }

    @GetMapping("/applications")
    @Operation(summary = "List customer's Islamic product applications")
    @PreAuthorize("hasRole('PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<ApplicationStatusDTO>>> getCustomerApplications(
            @RequestParam Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(onboardingService.getCustomerApplications(customerId)));
    }
}
