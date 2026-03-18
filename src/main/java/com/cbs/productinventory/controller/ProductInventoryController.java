package com.cbs.productinventory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.productinventory.entity.ProductInventoryItem;
import com.cbs.productinventory.service.ProductInventoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/product-inventory") @RequiredArgsConstructor
@Tag(name = "Product Inventory", description = "Cheque books, card blanks, tokens — stock management")
public class ProductInventoryController {
    private final ProductInventoryService service;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductInventoryItem>> create(@RequestBody ProductInventoryItem item) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(item)));
    }
    @PostMapping("/{code}/issue") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ProductInventoryItem>> issue(@PathVariable String code, @RequestParam int quantity) {
        return ResponseEntity.ok(ApiResponse.ok(service.issue(code, quantity)));
    }
    @PostMapping("/{code}/replenish") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProductInventoryItem>> replenish(@PathVariable String code, @RequestParam int quantity) {
        return ResponseEntity.ok(ApiResponse.ok(service.replenish(code, quantity)));
    }
    @GetMapping("/low-stock") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductInventoryItem>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.ok(service.getLowStock()));
    }
    @GetMapping("/branch/{branchId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProductInventoryItem>>> getByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByBranch(branchId)));
    }
}
