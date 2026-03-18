package com.cbs.centralcash.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.centralcash.entity.CentralCashPosition;
import com.cbs.centralcash.service.CentralCashService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.time.LocalDate; import java.util.List;
@RestController @RequestMapping("/v1/central-cash") @RequiredArgsConstructor
@Tag(name = "Central Cash Handling", description = "Bank-wide cash position — clearing flows, interbank, central bank, reserve requirements")
public class CentralCashController {
    private final CentralCashService service;
    @PostMapping("/calculate") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CentralCashPosition>> calculate(@RequestParam LocalDate date, @RequestParam String currency, @RequestParam BigDecimal openingBalance, @RequestParam BigDecimal reserveRequirement) { return ResponseEntity.ok(ApiResponse.ok(service.calculatePosition(date, currency, openingBalance, reserveRequirement))); }
    @GetMapping("/{currency}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CentralCashPosition>>> history(@PathVariable String currency) { return ResponseEntity.ok(ApiResponse.ok(service.getHistory(currency))); }
}
