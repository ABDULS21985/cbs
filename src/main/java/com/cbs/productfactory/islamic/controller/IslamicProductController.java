package com.cbs.productfactory.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.productfactory.islamic.dto.*;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductVersion;
import com.cbs.productfactory.islamic.service.IslamicProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/islamic-products")
@RequiredArgsConstructor
public class IslamicProductController {

    private final IslamicProductService islamicProductService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER')")
    public ResponseEntity<ApiResponse<IslamicProductResponse>> createProduct(
            @Valid @RequestBody IslamicProductRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(islamicProductService.createProduct(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<IslamicProductResponse>> getProduct(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProduct(id)));
    }

    @GetMapping("/code/{productCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<IslamicProductResponse>> getByCode(@PathVariable String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProductByCode(productCode)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER')")
    public ResponseEntity<ApiResponse<IslamicProductResponse>> updateProduct(
            @PathVariable Long id,
            @RequestBody IslamicProductRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.updateProduct(id, request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<List<IslamicProductResponse>>> searchProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long contractType,
            @RequestParam(required = false) IslamicDomainEnums.IslamicProductCategory category,
            @RequestParam(required = false) IslamicDomainEnums.IslamicProductStatus status,
            @RequestParam(required = false) IslamicDomainEnums.ShariahComplianceStatus complianceStatus,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<IslamicProductResponse> result = islamicProductService.searchProducts(
                IslamicProductSearchCriteria.builder()
                        .query(query)
                        .contractTypeId(contractType)
                        .productCategory(category)
                        .status(status)
                        .complianceStatus(complianceStatus)
                        .country(country)
                        .build(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "productCode"))
        );
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitForApproval(@PathVariable Long id) {
        islamicProductService.submitForApproval(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("submitted", true)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approveProduct(
            @PathVariable Long id,
            Authentication authentication
    ) {
        islamicProductService.approveProduct(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("approved", true)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> activateProduct(@PathVariable Long id) {
        islamicProductService.activateProduct(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("activated", true)));
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> suspendProduct(
            @PathVariable Long id,
            @RequestParam(required = false) String reason
    ) {
        islamicProductService.suspendProduct(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("suspended", true)));
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> retireProduct(
            @PathVariable Long id,
            @RequestParam(required = false) String reason
    ) {
        islamicProductService.retireProduct(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("retired", true)));
    }

    @PostMapping("/{id}/link-fatwa")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> linkFatwa(
            @PathVariable Long id,
            @RequestParam Long fatwaId
    ) {
        islamicProductService.linkFatwaToProduct(id, fatwaId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("fatwaLinked", true)));
    }

    @DeleteMapping("/{id}/link-fatwa")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> unlinkFatwa(
            @PathVariable Long id,
            @RequestParam(required = false) String reason
    ) {
        islamicProductService.unlinkFatwaFromProduct(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("fatwaUnlinked", true)));
    }

    @GetMapping("/{id}/parameters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getParameters(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getAllParameters(id)));
    }

    @PostMapping("/{id}/parameters")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setParameter(
            @PathVariable Long id,
            @RequestBody SetIslamicProductParameterRequest request
    ) {
        islamicProductService.setParameter(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("updated", true)));
    }

    @GetMapping("/{id}/profit-rate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','PRODUCT_MANAGER','COMPLIANCE','SHARIAH_BOARD','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BigDecimal>> getApplicableProfitRate(
            @PathVariable Long id,
            @RequestParam Map<String, String> requestParams
    ) {
        requestParams.remove("id");
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getApplicableProfitRate(id, castContext(requestParams))));
    }

    @GetMapping("/eligible/{customerId}")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicProductResponse>>> getEligibleProducts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getEligibleProducts(customerId)));
    }

    @GetMapping("/shariah-review-due")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<IslamicProductResponse>>> getProductsDueForShariahReview() {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProductsDueForShariahReview()));
    }

    @PostMapping("/{id}/shariah-review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recordShariahReview(
            @PathVariable Long id,
            @RequestBody RecordShariahReviewRequest request
    ) {
        islamicProductService.recordShariahReview(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("recorded", true)));
    }

    @GetMapping("/fatwa-compliance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<FatwaComplianceSummary>> getFatwaComplianceSummary() {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getFatwaComplianceSummary()));
    }

    @GetMapping("/without-fatwa")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<IslamicProductResponse>>> getProductsWithoutFatwa() {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProductsWithoutFatwa()));
    }

    @GetMapping("/expiring-fatwa")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<List<IslamicProductResponse>>> getProductsWithExpiringFatwa(
            @RequestParam(defaultValue = "30") int days
    ) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProductsWithExpiringFatwa(days)));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<List<IslamicProductVersion>>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProductHistory(id)));
    }

    @GetMapping("/{id}/versions/{versionNumber}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<IslamicProductVersion>> getVersion(
            @PathVariable Long id,
            @PathVariable Integer versionNumber
    ) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProductVersion(id, versionNumber)));
    }

    @GetMapping("/{id}/versions/material-changes")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<List<IslamicProductVersion>>> getMaterialChanges(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getMaterialChanges(id)));
    }

    @GetMapping("/{id}/compare")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<ProductChangeComparison>> compareVersions(
            @PathVariable Long id,
            @RequestParam Integer v1,
            @RequestParam Integer v2
    ) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.compareVersions(id, v1, v2)));
    }

    @GetMapping("/code/{code}/as-of")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE','SHARIAH_BOARD','AUDIT')")
    public ResponseEntity<ApiResponse<IslamicProductResponse>> getProductAsOf(
            @PathVariable String code,
            @RequestParam LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(islamicProductService.getProductAsOfDate(code, date)));
    }

    private Map<String, Object> castContext(Map<String, String> input) {
        return input.entrySet().stream().collect(java.util.stream.Collectors.toMap(
                Map.Entry::getKey,
                entry -> {
                    String value = entry.getValue();
                    if (value == null) return null;
                    if (value.matches("^-?\\d+$")) return Long.parseLong(value);
                    if (value.matches("^-?\\d+\\.\\d+$")) return new BigDecimal(value);
                    if ("true".equalsIgnoreCase(value) || "false".equalsIgnoreCase(value)) return Boolean.parseBoolean(value);
                    return value;
                },
                (left, right) -> right,
                LinkedHashMap::new
        ));
    }
}
