package com.cbs.productdeploy.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.productdeploy.entity.ProductDeployment;
import com.cbs.productdeploy.service.ProductDeployService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/product-deployments") @RequiredArgsConstructor
@Tag(name = "Product Deployment", description = "Product rollout, pilot, GA, channel activation")
public class ProductDeployController {
    private final ProductDeployService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ProductDeployment>> create(@RequestBody ProductDeployment d) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(d))); }
    @PostMapping("/{code}/approve") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ProductDeployment>> approve(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.approve(code))); }
    @PostMapping("/{code}/complete") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ProductDeployment>> complete(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.complete(code))); }
    @PostMapping("/{code}/rollback") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ProductDeployment>> rollback(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.rollback(code))); }
    @GetMapping("/product/{productCode}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ProductDeployment>>> getByProduct(@PathVariable String productCode) { return ResponseEntity.ok(ApiResponse.ok(service.getByProduct(productCode))); }
}
