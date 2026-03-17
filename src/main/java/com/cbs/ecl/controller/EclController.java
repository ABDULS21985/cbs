package com.cbs.ecl.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.ecl.entity.*;
import com.cbs.ecl.service.EclService;
import io.swagger.v3.oas.annotations.Operation;
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

@RestController @RequestMapping("/v1/ecl") @RequiredArgsConstructor
@Tag(name = "IFRS 9 ECL", description = "Expected Credit Loss staging, calculation, scenario weighting")
public class EclController {

    private final EclService eclService;

    @PostMapping("/calculate")
    @Operation(summary = "Calculate ECL for a loan with PD/LGD/EAD and macro scenarios")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EclCalculation>> calculate(
            @RequestParam Long loanAccountId, @RequestParam Long customerId,
            @RequestParam String segment, @RequestParam(required = false) String productCode,
            @RequestParam BigDecimal outstandingBalance, @RequestParam(required = false) BigDecimal offBalanceExposure,
            @RequestParam int daysPastDue, @RequestParam(defaultValue = "false") boolean significantDeterioration) {
        return ResponseEntity.ok(ApiResponse.ok(eclService.calculateEcl(
                loanAccountId, customerId, segment, productCode, outstandingBalance, offBalanceExposure, daysPastDue, significantDeterioration)));
    }

    @PostMapping("/parameters")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EclModelParameter>> saveParam(@RequestBody EclModelParameter param) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(eclService.saveParameter(param)));
    }

    @GetMapping("/calculations/{date}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<EclCalculation>>> getCalculations(@PathVariable LocalDate date,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<EclCalculation> result = eclService.getCalculationsForDate(date, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/summary/{date}")
    @Operation(summary = "Get ECL summary by stage for a date")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<EclService.EclSummary>> getSummary(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(eclService.getEclSummary(date)));
    }
}
