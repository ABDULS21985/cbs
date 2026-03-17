package com.cbs.productfactory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.service.ProductFactoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/product-factory") @RequiredArgsConstructor
@Tag(name = "Product Factory", description = "No-code product configuration with approval workflow and versioning")
public class ProductFactoryController {

    private final ProductFactoryService productFactoryService;

    @PostMapping("/templates")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductTemplate>> create(@RequestBody ProductTemplate template) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(productFactoryService.createTemplate(template)));
    }

    @PostMapping("/templates/{id}/submit")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductTemplate>> submit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productFactoryService.submitForApproval(id)));
    }

    @PostMapping("/templates/{id}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductTemplate>> approve(@PathVariable Long id, @RequestParam String approvedBy) {
        return ResponseEntity.ok(ApiResponse.ok(productFactoryService.approveTemplate(id, approvedBy)));
    }

    @PostMapping("/templates/{id}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductTemplate>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productFactoryService.activateTemplate(id)));
    }

    @PostMapping("/templates/{id}/new-version")
    @Operation(summary = "Create a new version from an existing template")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductTemplate>> newVersion(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(productFactoryService.createNewVersion(id)));
    }

    @GetMapping("/templates/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductTemplate>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(productFactoryService.getActiveTemplates()));
    }

    @GetMapping("/templates/category/{category}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductTemplate>>> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(ApiResponse.ok(productFactoryService.getByCategory(category)));
    }
}
