package com.cbs.salesplan.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.salesplan.entity.SalesPlan;
import com.cbs.salesplan.entity.SalesTarget;
import com.cbs.salesplan.service.SalesPlanService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.util.List;

@RestController @RequestMapping("/v1/sales-plans") @RequiredArgsConstructor
@Tag(name = "Sales Planning", description = "Sales targets, territory planning, performance tracking")
public class SalesPlanController {
    private final SalesPlanService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SalesPlan>> create(@RequestBody SalesPlan plan) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createPlan(plan))); }
    @PostMapping("/{code}/targets") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SalesTarget>> addTarget(@PathVariable String code, @RequestBody SalesTarget target) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addTarget(code, target))); }
    @PostMapping("/targets/{code}/record") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<SalesTarget>> recordActual(@PathVariable String code, @RequestParam BigDecimal value) { return ResponseEntity.ok(ApiResponse.ok(service.recordActual(code, value))); }
    @GetMapping("/region/{region}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SalesPlan>>> getByRegion(@PathVariable String region) { return ResponseEntity.ok(ApiResponse.ok(service.getByRegion(region))); }
    @GetMapping("/officer/{id}/targets") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SalesTarget>>> getTargetsByOfficer(@PathVariable String id) { return ResponseEntity.ok(ApiResponse.ok(service.getTargetsByOfficer(id))); }
}
