package com.cbs.treasury.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.treasury.entity.*;
import com.cbs.treasury.service.TreasuryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/treasury")
@RequiredArgsConstructor
@Tag(name = "Treasury", description = "FX deals, money market, bonds, repo, T-bills")
public class TreasuryController {

    private final TreasuryService treasuryService;

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
    public ResponseEntity<ApiResponse<List<TreasuryDeal>>> getByStatus(@RequestParam DealStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<TreasuryDeal> result = treasuryService.getDealsByStatus(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/deals/batch/maturity")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processMaturity() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", treasuryService.processMaturedDeals())));
    }
}
