package com.cbs.productfactory.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.exception.BusinessException;
import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueEntry;
import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueSummary;
import com.cbs.productfactory.islamic.service.IslamicContractTypeService;
import com.cbs.productfactory.islamic.service.IslamicProductCatalogueService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/product-catalogue")
@RequiredArgsConstructor
public class IslamicProductCatalogueController {

    private final IslamicProductCatalogueService catalogueService;
    private final IslamicContractTypeService contractTypeService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<IslamicProductCatalogueEntry>>> browseCatalogue(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) String complianceStatus,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String customerType,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<IslamicProductCatalogueEntry> result = catalogueService.getCatalogue(
                category,
                contractType,
                complianceStatus,
                country,
                currency,
                customerType,
                minAmount,
                maxAmount,
                search,
                includeInactive,
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "productCode"))
        );
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/{productCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<IslamicProductCatalogueEntry>> getProductDetail(@PathVariable String productCode) {
        return ResponseEntity.ok(ApiResponse.ok(catalogueService.getProductDetail(productCode)));
    }

    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<IslamicProductCatalogueSummary>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok(catalogueService.getCatalogueSummary()));
    }

    @GetMapping("/available/{customerId}")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicProductCatalogueEntry>>> getAvailableProducts(
            @PathVariable Long customerId,
            Authentication authentication
    ) {
        enforcePortalOwnership(customerId, authentication);
        return ResponseEntity.ok(ApiResponse.ok(catalogueService.getAvailableProducts(customerId)));
    }

    @PostMapping("/compare")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<IslamicProductCatalogueEntry>>> compareProducts(
            @RequestBody List<String> productCodes
    ) {
        return ResponseEntity.ok(ApiResponse.ok(catalogueService.compareProducts(productCodes)));
    }

    @GetMapping("/recommended/{customerId}")
    @PreAuthorize("hasAnyRole('PORTAL_USER','CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicProductCatalogueEntry>>> getRecommendedProducts(
            @PathVariable Long customerId,
            Authentication authentication
    ) {
        enforcePortalOwnership(customerId, authentication);
        return ResponseEntity.ok(ApiResponse.ok(catalogueService.getRecommendedProducts(customerId)));
    }

    @GetMapping("/contract-types")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<?>>> getContractTypes() {
        return ResponseEntity.ok(ApiResponse.ok(contractTypeService.getAllActive()));
    }

    private void enforcePortalOwnership(Long customerId, Authentication authentication) {
        boolean portalUser = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_PORTAL_USER") || role.equals("PORTAL_USER"));
        if (portalUser && !String.valueOf(customerId).equals(authentication.getName())) {
            throw new BusinessException("Portal users can only access their own product catalogue",
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "PORTAL_CUSTOMER_MISMATCH");
        }
    }
}