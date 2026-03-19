package com.cbs.product.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.productbundle.entity.ProductBundle;
import com.cbs.productbundle.repository.ProductBundleRepository;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.repository.ProductCatalogEntryRepository;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Unified product listing from catalog and factory")
public class ProductController {

    private final ProductCatalogEntryRepository productCatalogEntryRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final ProductBundleRepository productBundleRepository;

    @GetMapping
    @Operation(summary = "List all products from the catalog")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductCatalogEntry>>> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ProductCatalogEntry> result = productCatalogEntryRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "productName")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/templates")
    @Operation(summary = "List all product templates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductTemplate>>> listTemplates(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ProductTemplate> result = productTemplateRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "templateName")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/bundles")
    @Operation(summary = "List product bundles")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductBundle>>> listBundles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ProductBundle> result = productBundleRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "bundleName")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get product statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalCatalogProducts", productCatalogEntryRepository.count(),
                "totalTemplates", productTemplateRepository.count(),
                "totalBundles", productBundleRepository.count()
        )));
    }
}
