package com.cbs.contributionrisk.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.contributionrisk.entity.RiskContribution;
import com.cbs.contributionrisk.service.ContributionRiskService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List;
@RestController @RequestMapping("/v1/risk-contribution") @RequiredArgsConstructor
@Tag(name = "Risk Contribution", description = "Marginal/incremental risk contribution analysis")
public class ContributionRiskController {
    private final ContributionRiskService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<RiskContribution>> calculate(@RequestBody RiskContribution rc) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculate(rc))); }
    @GetMapping("/portfolio/{code}/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<RiskContribution>>> getByPortfolio(@PathVariable String code, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) { return ResponseEntity.ok(ApiResponse.ok(service.getByPortfolio(code, date))); }
    @GetMapping("/business-unit/{bu}/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<RiskContribution>>> getByBU(@PathVariable String bu, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) { return ResponseEntity.ok(ApiResponse.ok(service.getByBusinessUnit(bu, date))); }
}
