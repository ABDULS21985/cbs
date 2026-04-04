package com.cbs.rulesengine.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.rulesengine.dto.*;
import com.cbs.rulesengine.entity.*;
import com.cbs.rulesengine.service.BusinessRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/v1/rules")
@RequiredArgsConstructor
public class BusinessRuleController {

    private final BusinessRuleService businessRuleService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> createRule(@Valid @RequestBody CreateBusinessRuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(businessRuleService.createRule(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> getRule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getRule(id)));
    }

    @GetMapping("/code/{ruleCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> getRuleByCode(@PathVariable String ruleCode) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getRuleByCode(ruleCode)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> updateRule(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBusinessRuleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.updateRule(id, request)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> activateRule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.activateRule(id)));
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> suspendRule(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.suspendRule(id, reason)));
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> retireRule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.retireRule(id)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<BusinessRuleSummary>>> searchRules(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) BusinessRuleCategory category,
            @RequestParam(required = false) String subCategory,
            @RequestParam(required = false) BusinessRuleStatus status,
            @RequestParam(required = false) BusinessRuleType ruleType,
            @RequestParam(required = false) RuleSeverity severity,
            @RequestParam(required = false) String productCode,
            @RequestParam(required = false) String moduleName,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        PageImpl<BusinessRuleSummary> result = businessRuleService.searchRules(BusinessRuleSearchRequest.builder()
                .query(query)
                .category(category)
                .subCategory(subCategory)
                .status(status)
                .ruleType(ruleType)
                .severity(severity)
                .productCode(productCode)
                .moduleName(moduleName)
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDir(sortDir)
                .build());

        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/product/{productCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<BusinessRuleResponse>>> getActiveRulesForProduct(@PathVariable String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getActiveRulesForProduct(productCode)));
    }

    @GetMapping("/module/{moduleName}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<BusinessRuleResponse>>> getActiveRulesForModule(@PathVariable String moduleName) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getActiveRulesForModule(moduleName)));
    }

    @GetMapping("/statistics")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RuleStatisticsResponse>> getStatistics() {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getRuleStatistics()));
    }

    @GetMapping("/categories")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<RuleCategoryCountResponse>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getRuleCategoryCounts()));
    }

    @GetMapping("/{ruleId}/versions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<BusinessRuleVersionSummary>>> getVersions(
            @PathVariable Long ruleId,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        List<BusinessRuleVersionSummary> versions = businessRuleService.getRuleVersions(ruleId);
        int fromIndex = Math.min(page * size, versions.size());
        int toIndex = Math.min(fromIndex + size, versions.size());
        PageImpl<BusinessRuleVersionSummary> result =
                new PageImpl<>(versions.subList(fromIndex, toIndex), org.springframework.data.domain.Pageable.ofSize(size).withPage(page), versions.size());
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/{ruleId}/versions/{versionNumber}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BusinessRuleVersionResponse>> getVersion(
            @PathVariable Long ruleId,
            @PathVariable Integer versionNumber) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getRuleVersion(ruleId, versionNumber)));
    }

    @GetMapping("/{ruleId}/versions/as-of")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BusinessRuleVersionResponse>> getVersionAsOf(
            @PathVariable Long ruleId,
            @RequestParam Instant date) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.getRuleAsOf(ruleId, date)));
    }

    @GetMapping("/{ruleId}/versions/compare")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VersionComparisonResponse>> compareVersions(
            @PathVariable Long ruleId,
            @RequestParam("v1") Integer version1,
            @RequestParam("v2") Integer version2) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.compareVersions(ruleId, version1, version2)));
    }

    @PostMapping("/{ruleId}/versions/rollback/{versionNumber}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<BusinessRuleResponse>> rollbackVersion(
            @PathVariable Long ruleId,
            @PathVariable Integer versionNumber,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok(businessRuleService.rollbackToVersion(ruleId, versionNumber, reason)));
    }
}
