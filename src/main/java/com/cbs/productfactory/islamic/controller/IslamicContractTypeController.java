package com.cbs.productfactory.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.service.IslamicContractTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/islamic-contract-types")
@RequiredArgsConstructor
public class IslamicContractTypeController {

    private final IslamicContractTypeService contractTypeService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<IslamicContractType>>> listAllActive() {
        return ResponseEntity.ok(ApiResponse.ok(contractTypeService.getAllActive()));
    }

    @GetMapping("/{code}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<IslamicContractType>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(contractTypeService.getByCode(code)));
    }

    @GetMapping("/category/{category}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<IslamicContractType>>> getByCategory(
            @PathVariable IslamicDomainEnums.ContractCategory category
    ) {
        return ResponseEntity.ok(ApiResponse.ok(contractTypeService.getByCategory(category)));
    }

    @GetMapping("/for-product-category/{productCategory}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<IslamicContractType>>> getForProductCategory(@PathVariable String productCategory) {
        return ResponseEntity.ok(ApiResponse.ok(contractTypeService.getForProductCategory(productCategory)));
    }

    @GetMapping("/{code}/required-fields")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<String>>> getRequiredFields(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(contractTypeService.getRequiredProductFields(code)));
    }

    @GetMapping("/{code}/principles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPrinciples(@PathVariable String code) {
        IslamicContractType contractType = contractTypeService.getByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "code", contractType.getCode(),
                "name", contractType.getName(),
                "principles", contractType.getKeyShariahPrinciples(),
                "principlesAr", contractType.getKeyShariahPrinciplesAr(),
                "prohibitions", contractType.getProhibitions(),
                "prohibitionsAr", contractType.getProhibitionsAr()
        )));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicContractType>> create(@RequestBody IslamicContractType contractType) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(contractTypeService.create(contractType)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicContractType>> update(
            @PathVariable Long id,
            @RequestBody IslamicContractType contractType
    ) {
        return ResponseEntity.ok(ApiResponse.ok(contractTypeService.update(id, contractType)));
    }
}