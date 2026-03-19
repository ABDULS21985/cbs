package com.cbs.capitalmarkets.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.capitalmarkets.entity.CapitalMarketDeal;
import com.cbs.capitalmarkets.entity.DealInvestor;
import com.cbs.capitalmarkets.service.CapitalMarketsService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.util.List;
@RestController @RequestMapping("/v1/capital-markets") @RequiredArgsConstructor
@Tag(name = "Capital Markets", description = "ECM/DCM deal tracking, investor management, allotment")
public class CapitalMarketsController {
    private final CapitalMarketsService service;
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CapitalMarketDeal>>> listAll() { return ResponseEntity.ok(ApiResponse.ok(service.getAllDeals())); }
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CapitalMarketDeal>> create(@RequestBody CapitalMarketDeal deal) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createDeal(deal))); }
    @GetMapping("/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<CapitalMarketDeal>> getByCode(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getByCode(code))); }
    @GetMapping("/pipeline") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CapitalMarketDeal>>> getPipeline() { return ResponseEntity.ok(ApiResponse.ok(service.getDealPipeline())); }
    @PostMapping("/{dealId}/investors") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<DealInvestor>> addInvestor(@PathVariable Long dealId, @RequestBody DealInvestor investor) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addInvestorBid(dealId, investor))); }
    @GetMapping("/{dealId}/investors") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<DealInvestor>>> getInvestorBook(@PathVariable Long dealId) { return ResponseEntity.ok(ApiResponse.ok(service.getInvestorBook(dealId))); }
    @PostMapping("/{code}/pricing") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CapitalMarketDeal>> executePricing(@PathVariable String code, @RequestParam BigDecimal price) { return ResponseEntity.ok(ApiResponse.ok(service.executePricing(code, price))); }
    @PostMapping("/{code}/allotment") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CapitalMarketDeal>> executeAllotment(@PathVariable String code, @RequestParam String method) { return ResponseEntity.ok(ApiResponse.ok(service.executeAllotment(code, method))); }
    @PostMapping("/{code}/settle") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CapitalMarketDeal>> settle(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.settleAllotment(code))); }
}
