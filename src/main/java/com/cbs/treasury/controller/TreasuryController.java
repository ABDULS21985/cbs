package com.cbs.treasury.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.fixedincome.entity.CouponPayment;
import com.cbs.fixedincome.entity.SecurityHolding;
import com.cbs.fixedincome.repository.CouponPaymentRepository;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import com.cbs.openitem.entity.SecuritiesFail;
import com.cbs.openitem.repository.SecuritiesFailRepository;
import com.cbs.treasury.entity.*;
import com.cbs.treasury.service.TreasuryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/treasury")
@RequiredArgsConstructor
@Tag(name = "Treasury", description = "FX deals, money market, bonds, repo, T-bills")
public class TreasuryController {

    private final TreasuryService treasuryService;
    private final SecurityHoldingRepository securityHoldingRepository;
    private final CouponPaymentRepository couponPaymentRepository;
    private final SecuritiesFailRepository securitiesFailRepository;

    @PostMapping("/deals")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryDeal>> bookDeal(
            @RequestParam DealType dealType, @RequestParam(required = false) Long counterpartyId,
            @RequestParam String leg1Currency, @RequestParam BigDecimal leg1Amount,
            @RequestParam(required = false) Long leg1AccountId, @RequestParam LocalDate leg1ValueDate,
            @RequestParam(required = false) String leg2Currency, @RequestParam(required = false) BigDecimal leg2Amount,
            @RequestParam(required = false) Long leg2AccountId, @RequestParam(required = false) LocalDate leg2ValueDate,
            @RequestParam(required = false) BigDecimal dealRate, @RequestParam(required = false) BigDecimal yieldRate,
            @RequestParam(required = false) Integer tenorDays, @RequestParam(required = false) String dealer) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(treasuryService.bookDeal(
                dealType, counterpartyId, leg1Currency, leg1Amount, leg1AccountId, leg1ValueDate,
                leg2Currency, leg2Amount, leg2AccountId, leg2ValueDate, dealRate, yieldRate, tenorDays, dealer)));
    }

    @GetMapping("/deals/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TreasuryDeal>> getDeal(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getDeal(id)));
    }

    @PostMapping("/deals/{id}/confirm")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryDeal>> confirm(@PathVariable Long id, @RequestParam String confirmedBy) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.confirmDeal(id, confirmedBy)));
    }

    @PostMapping("/deals/{id}/settle")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryDeal>> settle(@PathVariable Long id, @RequestParam String settledBy) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.settleDeal(id, settledBy)));
    }

    @GetMapping("/deals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryDeal>>> getByStatus(@RequestParam(required = false) DealStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (status == null) {
            Page<TreasuryDeal> result = treasuryService.getAllDeals(PageRequest.of(page, size));
            return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
        }
        Page<TreasuryDeal> result = treasuryService.getDealsByStatus(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/deals/batch/maturity")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processMaturity() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", treasuryService.processMaturedDeals())));
    }

    // ========================================================================
    // TREASURY EXTENDED ENDPOINTS
    // ========================================================================

    @GetMapping("/orders")
    @Operation(summary = "List trade orders (aggregated from treasury deals)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryDeal>>> listOrders(
            @RequestParam(required = false) DealType dealType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TreasuryDeal> result;
        if (dealType != null) {
            result = treasuryService.getDealsByTypeAndStatus(dealType, DealStatus.PENDING, PageRequest.of(page, size));
        } else {
            result = treasuryService.getDealsByStatus(DealStatus.PENDING, PageRequest.of(page, size));
        }
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/confirmations")
    @Operation(summary = "List trade confirmations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryDeal>>> listConfirmations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TreasuryDeal> result = treasuryService.getDealsByStatus(DealStatus.CONFIRMED, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/executions")
    @Operation(summary = "List execution log (settled deals)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryDeal>>> listExecutions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TreasuryDeal> result = treasuryService.getDealsByStatus(DealStatus.SETTLED, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/fixed-income/holdings")
    @Operation(summary = "List bond/T-bill holdings")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SecurityHolding>>> listFixedIncomeHoldings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SecurityHolding> result = securityHoldingRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "maturityDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/fixed-income/coupons")
    @Operation(summary = "List coupon payment schedule")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CouponPayment>>> listCoupons(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CouponPayment> result = couponPaymentRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "couponDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/settlement-fails")
    @Operation(summary = "List settlement failures")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SecuritiesFail>>> listSettlementFails(
            @RequestParam(required = false) String status) {
        List<SecuritiesFail> fails;
        if (status != null && !status.isBlank()) {
            fails = securitiesFailRepository.findByStatus(status);
        } else {
            fails = securitiesFailRepository.findAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(fails));
    }
}
