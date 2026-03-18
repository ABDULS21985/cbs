package com.cbs.security.rbac.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.security.rbac.entity.*;
import com.cbs.security.rbac.service.RbacService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/security/rbac") @RequiredArgsConstructor
@Tag(name = "RBAC/ABAC", description = "Role management, ABAC authorization, SoD validation, JIT elevation")
public class RbacController {

    private final RbacService rbacService;

    @PostMapping("/roles")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecurityRole>> createRole(@RequestBody SecurityRole role) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(rbacService.createRole(role)));
    }

    @GetMapping("/roles")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SecurityRole>>> getRoles() {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.getAllRoles()));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<UserRoleAssignment>> assign(
            @RequestParam String userId, @RequestParam String roleCode,
            @RequestParam(required = false) String branchCode, @RequestParam String assignedBy) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.assignRole(userId, roleCode, branchCode, assignedBy)));
    }

    @PostMapping("/elevate")
    @Operation(summary = "JIT privilege elevation with time-limited access")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<UserRoleAssignment>> elevate(
            @RequestParam String userId, @RequestParam String roleCode,
            @RequestParam String reason, @RequestParam String approvedBy,
            @RequestParam(defaultValue = "60") int durationMinutes) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.elevatePrivilege(userId, roleCode, reason, approvedBy, durationMinutes)));
    }

    @GetMapping("/authorize")
    @Operation(summary = "ABAC authorization check: permission + branch + product + amount")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<RbacService.AuthorizationResult>> authorize(
            @RequestParam String userId, @RequestParam String permission,
            @RequestParam(required = false) String branchCode,
            @RequestParam(required = false) String productCode,
            @RequestParam(required = false) BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.authorize(userId, permission, branchCode, productCode, amount)));
    }

    @GetMapping("/sod-check/{userId}/{roleCode}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<RbacService.SodViolation>>> sodCheck(@PathVariable String userId, @PathVariable String roleCode) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.checkSodViolations(userId, roleCode)));
    }

    @GetMapping("/user/{userId}/roles")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<UserRoleAssignment>>> getUserRoles(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.getUserRoles(userId)));
    }
}
