package com.cbs.productfactory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import com.cbs.productfactory.service.ProductFactoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/product-factory") @RequiredArgsConstructor
@Tag(name = "Product Factory", description = "No-code product configuration with approval workflow and versioning")
public class ProductFactoryController {

    private final ProductFactoryService productFactoryService;
    private final ProductTemplateRepository productTemplateRepository;

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
    public ResponseEntity<ApiResponse<ProductTemplate>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productFactoryService.approveTemplate(id)));
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

    @GetMapping
    @Operation(summary = "List all product templates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductTemplate>>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ProductTemplate> result = productTemplateRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "templateName")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/templates")
    @Operation(summary = "List all product templates (all statuses)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductTemplate>>> listTemplates(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ProductTemplate> result = productTemplateRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "templateName")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
