package com.cbs.econcapital.controller;
import com.cbs.common.dto.ApiResponse; import com.cbs.econcapital.entity.EconomicCapital; import com.cbs.econcapital.service.EconomicCapitalService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List;
@RestController @RequestMapping("/v1/economic-capital") @RequiredArgsConstructor
@Tag(name = "Economic Capital", description = "Economic capital by risk type, RAROC, capital allocation, surplus/deficit")
public class EconomicCapitalController {
    private final EconomicCapitalService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<EconomicCapital>> calc(@RequestBody EconomicCapital ec) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculate(ec))); }
    @GetMapping("/{date}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<EconomicCapital>>> byDate(@PathVariable LocalDate date) { return ResponseEntity.ok(ApiResponse.ok(service.getByDate(date))); }
    @GetMapping("/{date}/{bu}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<EconomicCapital>>> byBu(@PathVariable LocalDate date, @PathVariable String bu) { return ResponseEntity.ok(ApiResponse.ok(service.getByBusinessUnit(date, bu))); }
}
