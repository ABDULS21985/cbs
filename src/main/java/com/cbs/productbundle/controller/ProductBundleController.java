package com.cbs.productbundle.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.productbundle.entity.*;
import com.cbs.productbundle.service.ProductBundleService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/product-bundles") @RequiredArgsConstructor
@Tag(name = "Product Bundles", description = "Product combination packages with bundled pricing and discounts")
public class ProductBundleController {
    private final ProductBundleService bundleService;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductBundle>> create(@RequestBody ProductBundle bundle) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(bundleService.createBundle(bundle)));
    }
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ProductBundle>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(bundleService.getActiveBundles()));
    }
    @PostMapping("/{code}/enroll") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerBundleEnrollment>> enroll(
            @PathVariable String code, @RequestParam Long customerId, @RequestBody List<String> products) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(bundleService.enroll(customerId, code, products)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerBundleEnrollment>>> getEnrollments(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(bundleService.getCustomerEnrollments(customerId)));
    }
}
