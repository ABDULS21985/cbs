package com.cbs.bankportfolio.controller;
import com.cbs.common.dto.ApiResponse; import com.cbs.bankportfolio.entity.BankPortfolio; import com.cbs.bankportfolio.service.BankPortfolioService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/bank-portfolios") @RequiredArgsConstructor
@Tag(name = "Bank Portfolio", description = "Portfolio administration — banking/trading book, YTM, duration, VaR, benchmarking")
public class BankPortfolioController {
    private final BankPortfolioService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BankPortfolio>> create(@RequestBody BankPortfolio p) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(p))); }
    @GetMapping("/type/{type}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<BankPortfolio>>> byType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getByType(type))); }
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<BankPortfolio>>> all() { return ResponseEntity.ok(ApiResponse.ok(service.getAll())); }
}
