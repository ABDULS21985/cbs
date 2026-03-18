package com.cbs.bizriskmodel.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.bizriskmodel.entity.BusinessRiskAssessment;
import com.cbs.bizriskmodel.service.BizRiskModelService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/business-risk") @RequiredArgsConstructor
@Tag(name = "Business Risk Model", description = "Strategic risk assessment and scoring")
public class BizRiskModelController {
    private final BizRiskModelService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BusinessRiskAssessment>> create(@RequestBody BusinessRiskAssessment a) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(a))); }
    @PostMapping("/{code}/complete") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BusinessRiskAssessment>> complete(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.complete(code))); }
    @GetMapping("/domain/{domain}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<BusinessRiskAssessment>>> getByDomain(@PathVariable String domain) { return ResponseEntity.ok(ApiResponse.ok(service.getByDomain(domain))); }
    @GetMapping("/rating/{rating}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<BusinessRiskAssessment>>> getByRating(@PathVariable String rating) { return ResponseEntity.ok(ApiResponse.ok(service.getByRating(rating))); }
}
