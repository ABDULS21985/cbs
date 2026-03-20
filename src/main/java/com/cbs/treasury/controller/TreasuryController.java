package com.cbs.treasury.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.fixedincome.entity.CouponPayment;
import com.cbs.fixedincome.entity.SecurityHolding;
import com.cbs.fixedincome.repository.CouponPaymentRepository;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import com.cbs.ftp.entity.FtpAllocation;
import com.cbs.marketmaking.entity.MarketMakingMandate;
import com.cbs.openitem.entity.SecuritiesFail;
import com.cbs.openitem.repository.SecuritiesFailRepository;
import com.cbs.treasury.entity.DealStatus;
import com.cbs.treasury.entity.DealType;
import com.cbs.treasury.entity.TreasuryDeal;
import com.cbs.treasury.service.TreasuryService;
import com.cbs.tradingbook.entity.TradingBookSnapshot;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/treasury")
@RequiredArgsConstructor
@Tag(name = "Treasury", description = "Treasury trading, FTP, market making, orders, positions and analytics")
@Transactional(readOnly = true)
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
    public ResponseEntity<ApiResponse<TreasuryDeal>> confirm(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.confirmDeal(id)));
    }

    @PostMapping("/deals/{id}/settle")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryDeal>> settle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.settleDeal(id)));
    }

    @GetMapping("/deals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryDeal>>> getByStatus(@RequestParam(required = false) DealStatus status,
                                                                       @RequestParam(defaultValue = "0") int page,
                                                                       @RequestParam(defaultValue = "20") int size) {
        if (status == null) {
            Page<TreasuryDeal> result = treasuryService.getAllDeals(PageRequest.of(page, size));
            return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
        }
        Page<TreasuryDeal> result = treasuryService.getDealsByStatus(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/deals/{id}/amend")
    @Operation(summary = "Amend a treasury deal")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryDeal>> amendDeal(
            @PathVariable Long id,
            @RequestParam(required = false) BigDecimal newAmount,
            @RequestParam(required = false) BigDecimal newRate,
            @RequestParam(required = false) LocalDate newMaturityDate,
            @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(
                treasuryService.amendDeal(id, newAmount, newRate, newMaturityDate, reason)));
    }

    @GetMapping("/deals/{id}/audit-trail")
    @Operation(summary = "Get deal audit trail from metadata amendments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDealAuditTrail(@PathVariable Long id) {
        TreasuryDeal deal = treasuryService.getDeal(id);
        Map<String, Object> trail = new java.util.LinkedHashMap<>();
        trail.put("dealRef", deal.getDealNumber());
        trail.put("events", new java.util.ArrayList<>(java.util.List.of(
                Map.of("event", "BOOKED", "timestamp", deal.getCreatedAt() != null ? deal.getCreatedAt().toString() : "",
                        "user", deal.getDealer() != null ? deal.getDealer() : "", "details", "Deal booked"),
                deal.getConfirmedAt() != null
                        ? Map.of("event", "CONFIRMED", "timestamp", deal.getConfirmedAt().toString(),
                        "user", deal.getConfirmedBy() != null ? deal.getConfirmedBy() : "", "details", "Deal confirmed")
                        : null,
                deal.getSettledAt() != null
                        ? Map.of("event", "SETTLED", "timestamp", deal.getSettledAt().toString(),
                        "user", deal.getSettledBy() != null ? deal.getSettledBy() : "", "details", "Deal settled")
                        : null
        ).stream().filter(java.util.Objects::nonNull).collect(Collectors.toList())));
        if (deal.getMetadata() != null && deal.getMetadata().containsKey("lastAmendment")) {
            trail.put("lastAmendment", deal.getMetadata().get("lastAmendment"));
            trail.put("amendmentCount", deal.getMetadata().getOrDefault("amendmentCount", 0));
        }
        return ResponseEntity.ok(ApiResponse.ok(trail));
    }

    @GetMapping("/deals/batch/maturity")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getMaturityStatus() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "IDLE")));
    }

    @PostMapping("/deals/batch/maturity")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processMaturity() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", treasuryService.processMaturedDeals())));
    }

    @GetMapping("/orders")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.TradingMarketOrder>>> listOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long deskId) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.listOrders(status, deskId)));
    }

    @PostMapping("/orders")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.TradingMarketOrder>> submitOrder(@RequestBody SubmitOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(treasuryService.submitOrder(
                request.instrumentCode(),
                request.instrumentName(),
                request.side(),
                request.quantity(),
                request.price(),
                request.orderType(),
                request.deskId(),
                request.timeInForce(),
                request.currency(),
                request.instrumentType()
        )));
    }

    @PostMapping("/orders/{id}/cancel")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.TradingMarketOrder>> cancelOrder(@PathVariable Long id,
                                                                                        @RequestBody(required = false) CancelOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.cancelOrder(id, request != null ? request.reason() : null)));
    }

    @GetMapping("/executions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.OrderExecutionSummary>>> listExecutions(@RequestParam(required = false) Long orderId) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.listExecutions(orderId)));
    }

    @GetMapping("/positions/{deskId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.TraderPositionSummary>>> getPositionsByDesk(@PathVariable Long deskId) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getPositionsByDesk(deskId)));
    }

    @GetMapping("/positions/breaches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.TraderPositionSummary>>> getPositionBreaches(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getPositionBreaches(
                from != null ? from : LocalDate.now().minusMonths(1),
                to != null ? to : LocalDate.now()
        )));
    }

    @GetMapping("/trading-books")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.TradingBookSummary>>> listTradingBooks() {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.listTradingBooks()));
    }

    @PostMapping("/trading-books/{id}/snapshot")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingBookSnapshot>> snapshotBook(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(treasuryService.snapshotTradingBook(id)));
    }

    @GetMapping("/trading-books/{id}/snapshots")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TradingBookSnapshot>>> getSnapshots(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getTradingBookSnapshots(id)));
    }

    @PostMapping("/desks")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.DealerDeskSummary>> createDesk(@RequestBody DeskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(treasuryService.createDesk(
                request.code(),
                request.name(),
                request.assetClass(),
                request.headDealerId(),
                request.headDealerName(),
                request.positionLimit(),
                request.location(),
                request.timezone(),
                request.pnlCurrency()
        )));
    }

    @PutMapping("/desks/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.DealerDeskSummary>> updateDesk(@PathVariable Long id,
                                                                                     @RequestBody DeskRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.updateDesk(
                id,
                request.name(),
                request.assetClass(),
                request.headDealerId(),
                request.headDealerName(),
                request.positionLimit(),
                request.location(),
                request.timezone(),
                request.pnlCurrency()
        )));
    }

    @PostMapping("/desks/{id}/suspend")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.DealerDeskSummary>> suspendDesk(@PathVariable Long id,
                                                                                      @RequestBody(required = false) SuspendDeskRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.suspendDesk(id, request != null ? request.reason() : null)));
    }

    @PostMapping("/desks/{id}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.DealerDeskSummary>> activateDesk(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.activateDesk(id)));
    }

    @GetMapping("/desks")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.DealerDeskSummary>>> listDesks() {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.listDesks()));
    }

    @GetMapping("/desks/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeskDashboard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getDeskDashboard(id)));
    }

    @GetMapping("/ftp/curve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.FtpCurvePoint>>> getFtpCurve(
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) LocalDate asOfDate) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getFtpCurve(currency, asOfDate)));
    }

    @PostMapping("/ftp/curve/points")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.FtpCurvePoint>> addRatePoint(@RequestBody AddFtpRatePointRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(treasuryService.addFtpRatePoint(
                request.tenor(),
                request.rate(),
                request.effectiveDate(),
                request.currency()
        )));
    }

    @GetMapping("/ftp/allocations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FtpAllocation>>> getAllocations(@RequestParam(required = false) String entityType,
                                                                           @RequestParam(required = false) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getFtpAllocations(entityType, date)));
    }

    @PostMapping("/ftp/allocate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<FtpAllocation>>> runAllocation(@RequestBody RunFtpAllocationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.runAllocation(
                request.entityType(),
                request.period() != null ? YearMonth.parse(request.period()) : YearMonth.now()
        )));
    }

    @GetMapping("/ftp/profitability")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<FtpAllocation>>> getProfitability(@RequestParam(required = false) String entityType,
                                                                             @RequestParam(required = false) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getFtpProfitability(entityType, date)));
    }

    @GetMapping("/market-making/mandates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.MarketMakingMandateSummary>>> listMandates() {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.listMarketMakingMandates()));
    }

    @PostMapping("/market-making/mandates")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.MarketMakingMandateSummary>> createMandate(@RequestBody CreateMandateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(treasuryService.createMarketMakingMandate(
                request.instrumentCode(),
                request.instrumentName(),
                request.obligationType(),
                request.maxBidAskSpreadBps(),
                request.minQuoteTimePct(),
                request.startDate(),
                request.endDate(),
                request.deskId()
        )));
    }

    @GetMapping("/market-making/compliance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.ObligationComplianceSummary>>> getComplianceReport() {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getMarketMakingComplianceReport()));
    }

    @GetMapping("/market-making/{code}/performance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TreasuryService.MandatePerformanceSummary>> getMandatePerformance(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getMandatePerformance(code)));
    }

    @PostMapping("/analytics/record")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TreasuryService.TreasuryAnalyticsRecord>> recordAnalytics(@RequestBody RecordAnalyticsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(treasuryService.recordAnalytics(
                request.currency(),
                request.nim(),
                request.yield(),
                request.roa(),
                request.roe(),
                request.car(),
                request.snapshotDate()
        )));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.TreasuryAnalyticsRecord>>> getTreasuryAnalytics(
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.getTreasuryAnalytics(currency, from, to)));
    }

    @GetMapping("/instruments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TreasuryService.InstrumentOption>>> searchInstruments(@RequestParam String q) {
        return ResponseEntity.ok(ApiResponse.ok(treasuryService.searchInstruments(q)));
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
        List<SecuritiesFail> fails = status != null && !status.isBlank()
                ? securitiesFailRepository.findByStatus(status)
                : securitiesFailRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(fails));
    }

    public record SubmitOrderRequest(
            String instrumentCode,
            String instrumentName,
            String side,
            BigDecimal quantity,
            BigDecimal price,
            String orderType,
            Long deskId,
            String timeInForce,
            String currency,
            String instrumentType
    ) {
    }

    public record CancelOrderRequest(String reason) {
    }

    public record DeskRequest(
            String code,
            String name,
            String assetClass,
            String headDealerId,
            String headDealerName,
            BigDecimal positionLimit,
            String location,
            String timezone,
            String pnlCurrency
    ) {
    }

    public record SuspendDeskRequest(String reason) {
    }

    public record AddFtpRatePointRequest(
            String tenor,
            BigDecimal rate,
            LocalDate effectiveDate,
            String currency
    ) {
    }

    public record RunFtpAllocationRequest(
            String entityType,
            String period
    ) {
    }

    public record CreateMandateRequest(
            String instrumentCode,
            String instrumentName,
            String obligationType,
            BigDecimal maxBidAskSpreadBps,
            BigDecimal minQuoteTimePct,
            LocalDate startDate,
            LocalDate endDate,
            Long deskId
    ) {
    }

    public record RecordAnalyticsRequest(
            String currency,
            BigDecimal nim,
            BigDecimal yield,
            BigDecimal roa,
            BigDecimal roe,
            BigDecimal car,
            LocalDate snapshotDate
    ) {
    }
}
