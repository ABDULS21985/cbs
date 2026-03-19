package com.cbs.product.controller;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
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
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
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
    private final AccountRepository accountRepository;

    @GetMapping
    @Operation(summary = "List all products from the catalog")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductCatalogEntry>>> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String productFamily,
            @RequestParam(required = false) String search) {
        Page<ProductCatalogEntry> result;
        if (status != null && !status.isBlank()) {
            result = new org.springframework.data.domain.PageImpl<>(
                    productCatalogEntryRepository.findByStatusOrderByProductFamilyAscProductNameAsc(status));
        } else {
            result = productCatalogEntryRepository.findAll(
                    PageRequest.of(page, Math.min(size, 200), Sort.by(Sort.Direction.ASC, "productName")));
        }
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

    @GetMapping("/{id}")
    @Operation(summary = "Get product detail by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ProductCatalogEntry>> getProduct(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productCatalogEntryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + id))));
    }

    @PostMapping
    @Operation(summary = "Create a new product")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductCatalogEntry>> createProduct(@RequestBody ProductCatalogEntry product) {
        if (product.getStatus() == null || product.getStatus().isBlank()) {
            product.setStatus("DRAFT");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(productCatalogEntryRepository.save(product)));
    }

    @PostMapping("/{id}")
    @Operation(summary = "Update an existing product")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductCatalogEntry>> updateProduct(@PathVariable Long id, @RequestBody ProductCatalogEntry product) {
        ProductCatalogEntry existing = productCatalogEntryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + id));
        product.setId(id);
        return ResponseEntity.ok(ApiResponse.ok(productCatalogEntryRepository.save(product)));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Publish a draft product to make it available")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductCatalogEntry>> publishProduct(@PathVariable Long id) {
        ProductCatalogEntry product = productCatalogEntryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + id));
        product.setStatus("ACTIVE");
        product.setLaunchedAt(Instant.now());
        ProductCatalogEntry saved = productCatalogEntryRepository.save(product);
        return ResponseEntity.ok(ApiResponse.ok(saved, "Product published successfully"));
    }

    @PostMapping("/{id}/retire")
    @Operation(summary = "Retire an active product")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductCatalogEntry>> retireProduct(@PathVariable Long id) {
        ProductCatalogEntry product = productCatalogEntryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + id));
        product.setStatus("RETIRED");
        product.setRetiredAt(Instant.now());
        ProductCatalogEntry saved = productCatalogEntryRepository.save(product);
        return ResponseEntity.ok(ApiResponse.ok(saved, "Product retired successfully"));
    }

    @GetMapping("/{id}/accounts")
    @Operation(summary = "Get accounts using this product")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProductAccounts(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        ProductCatalogEntry product = productCatalogEntryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + id));
        // Accounts reference products by code; query accounts whose product code matches
        Page<Account> accounts = accountRepository.findAll(
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Map<String, Object>> result = accounts.getContent().stream()
                .filter(a -> a.getProduct() != null && a.getProduct().getCode() != null
                        && a.getProduct().getCode().equalsIgnoreCase(product.getProductCode()))
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("number", a.getAccountNumber());
                    m.put("customer", a.getAccountName());
                    m.put("balance", a.getBookBalance());
                    m.put("status", a.getStatus() != null ? a.getStatus().name() : "UNKNOWN");
                    m.put("opened", a.getOpenedDate() != null ? a.getOpenedDate().toString() : "");
                    return m;
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/bundles")
    @Operation(summary = "Create a product bundle")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductBundle>> createBundle(@RequestBody ProductBundle bundle) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(productBundleRepository.save(bundle)));
    }

    @GetMapping("/{id}/versions")
    @Operation(summary = "Get product version history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getVersions(@PathVariable Long id) {
        // Version history could be tracked via an audit table; for now return empty
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get product statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        long totalCatalog = productCatalogEntryRepository.count();
        long active = productCatalogEntryRepository.findByStatusOrderByProductFamilyAscProductNameAsc("ACTIVE").size();
        long draft = productCatalogEntryRepository.findByStatusOrderByProductFamilyAscProductNameAsc("DRAFT").size();
        long retired = productCatalogEntryRepository.findByStatusOrderByProductFamilyAscProductNameAsc("RETIRED").size();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalCatalogProducts", totalCatalog,
                "activeProducts", active,
                "draftProducts", draft,
                "retiredProducts", retired,
                "totalTemplates", productTemplateRepository.count(),
                "totalBundles", productBundleRepository.count()
        )));
    }
}
