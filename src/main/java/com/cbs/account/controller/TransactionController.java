package com.cbs.account.controller;

import com.cbs.account.dto.TransactionAnalyticsDto;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.dto.TransactionSearchCriteria;
import com.cbs.account.dto.TransactionSummary;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.TransactionService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/v1/transactions")
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional(readOnly = true)
@Tag(name = "Transaction Search", description = "Cross-account transaction search, detail, and reversal")
public class TransactionController {

    private final AccountPostingService accountPostingService;
    private final TransactionService transactionService;

    @GetMapping
    @Operation(summary = "Search transactions across all accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> searchTransactions(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String accountNumber,
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) BigDecimal amountFrom,
            @RequestParam(required = false) BigDecimal amountTo,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer pageSize,
            Pageable pageable) {

        Pageable effectivePageable = PageRequest.of(
                pageable.getPageNumber(),
                Math.min(pageSize != null ? pageSize : pageable.getPageSize(), 100),
                pageable.getSort().isSorted() ? pageable.getSort() : Sort.by(Sort.Direction.DESC, "createdAt")
        );

        TransactionSearchCriteria criteria = TransactionSearchCriteria.builder()
                .search(search)
                .accountNumber(accountNumber)
                .customerId(customerId)
                .dateFrom(dateFrom)
                .dateTo(dateTo)
                .amountFrom(amountFrom)
                .amountTo(amountTo)
                .type(type)
                .channel(channel)
                .status(status)
                .build();

        Page<TransactionResponse> result = transactionService.search(criteria, effectivePageable);
        TransactionSummary summary = transactionService.calculateSummary(criteria);

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "transactions", result.getContent(),
                "summary", summary,
                "page", PageMeta.from(result)
        )));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get transaction detail by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> getTransaction(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getTransaction(id)));
    }

    @GetMapping("/analytics/summary")
    @Operation(summary = "Get transaction analytics KPI summary")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionAnalyticsDto.Summary>> getAnalyticsSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getAnalyticsSummary(from, to)));
    }

    @GetMapping("/analytics/volume-trend")
    @Operation(summary = "Get transaction volume and value trend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<java.util.List<TransactionAnalyticsDto.VolumeTrendPoint>>> getVolumeTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "day") String granularity) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getVolumeTrend(from, to, granularity)));
    }

    @GetMapping("/analytics/categories")
    @Operation(summary = "Get spend category analytics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionAnalyticsDto.CategoryAnalytics>> getCategoryAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getCategoryAnalytics(from, to)));
    }

    @GetMapping("/analytics/channels")
    @Operation(summary = "Get channel performance analytics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionAnalyticsDto.ChannelAnalytics>> getChannelAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getChannelAnalytics(from, to)));
    }

    @GetMapping("/analytics/top-accounts")
    @Operation(summary = "Get top accounts by activity")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<java.util.List<TransactionAnalyticsDto.TopAccount>>> getTopAccounts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "50") Integer limit) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getTopAccounts(from, to, limit)));
    }

    @GetMapping("/analytics/failures")
    @Operation(summary = "Get transaction failure analytics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionAnalyticsDto.FailureAnalysis>> getFailureAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getFailureAnalysis(from, to)));
    }

    @GetMapping("/analytics/hourly-heatmap")
    @Operation(summary = "Get hourly transaction velocity heatmap")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionAnalyticsDto.Heatmap>> getHourlyHeatmap(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(transactionService.getHourlyHeatmap(from, to)));
    }

    @PostMapping("/{id}/reverse")
    @Operation(summary = "Reverse a transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> reverseTransaction(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        AccountPostingService.ReversalResult reversal = accountPostingService.reverseTransaction(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("message", "Transaction reversed successfully", "reversalRef", reversal.reversalGroupRef())));
    }

    @GetMapping("/{id}/receipt")
    @Operation(summary = "Download transaction receipt")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<byte[]> getReceipt(@PathVariable Long id) {
        var transaction = transactionService.getTransactionEntity(id);
        byte[] html = transactionService.renderReceiptHtml(transaction);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=receipt-" + transaction.getTransactionRef() + ".html")
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }
}
