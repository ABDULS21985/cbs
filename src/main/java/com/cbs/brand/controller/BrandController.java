package com.cbs.brand.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.brand.entity.BrandGuideline;
import com.cbs.brand.service.BrandService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;

@RestController @RequestMapping("/v1/brand-guidelines") @RequiredArgsConstructor
@Tag(name = "Brand Management", description = "Brand identity, guidelines, assets")
public class BrandController {
    private final BrandService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BrandGuideline>> create(@RequestBody BrandGuideline bg) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(bg))); }
    @PostMapping("/{code}/activate") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BrandGuideline>> activate(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.activate(code))); }
    @GetMapping("/type/{type}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<BrandGuideline>>> getByType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getByType(type))); }
    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<BrandGuideline>>> getActive() { return ResponseEntity.ok(ApiResponse.ok(service.getActive())); }
}
