package com.cbs.branchnetwork.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.branchnetwork.entity.BranchNetworkPlan;
import com.cbs.branchnetwork.service.BranchNetworkService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/branch-network") @RequiredArgsConstructor
@Tag(name = "Branch Network", description = "Branch planning, openings, closures, relocations")
public class BranchNetworkController {
    private final BranchNetworkService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BranchNetworkPlan>> create(@RequestBody BranchNetworkPlan p) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(p))); }
    @PostMapping("/{code}/approve") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BranchNetworkPlan>> approve(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.approve(code))); }
    @PostMapping("/{code}/complete") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<BranchNetworkPlan>> complete(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.complete(code))); }
    @GetMapping("/region/{region}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<BranchNetworkPlan>>> getByRegion(@PathVariable String region) { return ResponseEntity.ok(ApiResponse.ok(service.getByRegion(region))); }
}
