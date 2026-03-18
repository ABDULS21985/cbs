package com.cbs.productcatalog.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.service.ProductCatalogService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/product-catalog")
@RequiredArgsConstructor
@Tag(name = "Product Catalog", description = "Product directory + design — features, fees, rates, channels, Sharia compliance")
public class ProductCatalogController {

    private final ProductCatalogService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductCatalogEntry>> create(@RequestBody ProductCatalogEntry e) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(e)));
    }

    @PostMapping("/{code}/launch")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductCatalogEntry>> launch(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.launch(code)));
    }

    @GetMapping("/family/{family}")
    public ResponseEntity<ApiResponse<List<ProductCatalogEntry>>> byFamily(@PathVariable String family) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByFamily(family)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductCatalogEntry>>> all() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @GetMapping("/sharia-compliant")
    public ResponseEntity<ApiResponse<List<ProductCatalogEntry>>> sharia() {
        return ResponseEntity.ok(ApiResponse.ok(service.getShariaCompliant()));
    }
}
