package com.cbs.branch.controller;

import com.cbs.branch.entity.*;
import com.cbs.branch.service.BranchService;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/branches") @RequiredArgsConstructor
@Tag(name = "Branch Management", description = "Branch hierarchy, location, services")
public class BranchController {

    private final BranchService branchService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> create(@RequestBody Branch branch) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(branchService.createBranch(branch)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Branch>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getBranch(id)));
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Branch>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getBranchByCode(code)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getAllActiveBranches()));
    }

    @GetMapping("/children/{parentCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getChildren(@PathVariable String parentCode) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getChildBranches(parentCode)));
    }

    @GetMapping("/region/{regionCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getRegion(@PathVariable String regionCode) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getRegionBranches(regionCode)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getByType(@PathVariable BranchType type) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.getBranchesByType(type)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> update(@PathVariable Long id, @RequestBody Branch updated) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.updateBranch(id, updated)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> close(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.closeBranch(id)));
    }
}
