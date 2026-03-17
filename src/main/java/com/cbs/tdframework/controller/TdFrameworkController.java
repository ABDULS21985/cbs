package com.cbs.tdframework.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.tdframework.entity.TdFrameworkAgreement;
import com.cbs.tdframework.service.TdFrameworkService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/td-frameworks") @RequiredArgsConstructor
@Tag(name = "Term Deposit Framework", description = "Framework agreements for term deposits — rate tiers, auto-rollover, withdrawal rules")
public class TdFrameworkController {
    private final TdFrameworkService tdFrameworkService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TdFrameworkAgreement>> create(@RequestBody TdFrameworkAgreement agreement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tdFrameworkService.create(agreement)));
    }
    @PostMapping("/{number}/approve") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TdFrameworkAgreement>> approve(@PathVariable String number, @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(tdFrameworkService.approve(number, approvedBy)));
    }
    @GetMapping("/{number}/rate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRate(@PathVariable String number, @RequestParam BigDecimal amount, @RequestParam int tenorDays) {
        BigDecimal rate = tdFrameworkService.getApplicableRate(number, amount, tenorDays);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("agreement", number, "amount", amount, "tenor_days", tenorDays, "applicable_rate", rate)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TdFrameworkAgreement>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(tdFrameworkService.getActiveByCustomer(customerId)));
    }
}
