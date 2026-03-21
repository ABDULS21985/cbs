package com.cbs.security.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.security.entity.*;
import com.cbs.security.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/security-admin")
@RequiredArgsConstructor
@Tag(name = "Security Administration", description = "RBAC, ABAC, MFA, SIEM, Encryption Keys, Data Masking & PII")
public class SecurityAdminController {

    private final SecurityRoleRepository roleRepository;
    private final SecurityPermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleAssignmentRepository userRoleAssignmentRepository;
    private final AbacPolicyRepository abacPolicyRepository;
    private final MfaEnrollmentRepository mfaEnrollmentRepository;
    private final EncryptionKeyRepository encryptionKeyRepository;
    private final SecurityEventRepository securityEventRepository;
    private final SiemCorrelationRuleRepository siemRuleRepository;
    private final MaskingPolicyRepository maskingPolicyRepository;
    private final PiiFieldRegistryRepository piiFieldRegistryRepository;

    // ========== DASHBOARD / OVERVIEW ==========

    @GetMapping("/overview")
    @Operation(summary = "Security overview stats")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverview() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRoles", roleRepository.count());
        stats.put("activeRoles", roleRepository.findByIsActiveTrueOrderByRoleNameAsc().size());
        stats.put("totalPermissions", permissionRepository.count());
        stats.put("totalUserAssignments", userRoleAssignmentRepository.count());
        stats.put("abacPolicies", abacPolicyRepository.count());
        stats.put("mfaEnrollments", mfaEnrollmentRepository.count());
        stats.put("activeMfaEnrollments", mfaEnrollmentRepository.countByStatus("ACTIVE"));
        stats.put("encryptionKeys", encryptionKeyRepository.count());
        stats.put("activeKeys", encryptionKeyRepository.findByStatusOrderByCreatedAtDesc("ACTIVE").size());
        stats.put("securityEvents", securityEventRepository.count());
        stats.put("unacknowledgedEvents", securityEventRepository.countByIsAcknowledgedFalse());
        stats.put("criticalEvents", securityEventRepository.countBySeverity("CRITICAL"));
        stats.put("siemRules", siemRuleRepository.count());
        stats.put("maskingPolicies", maskingPolicyRepository.count());
        stats.put("piiFields", piiFieldRegistryRepository.count());
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    // ========== ROLES (JPA-backed, replacing broken native SQL) ==========

    @GetMapping("/roles")
    @Operation(summary = "List all security roles with assignment counts")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRoles() {
        List<SecurityRole> roles = roleRepository.findAll();
        List<UserRoleAssignment> assignments = userRoleAssignmentRepository.findByIsActiveTrueOrderByAssignedAtDesc();
        Map<Long, Long> userCounts = assignments.stream()
                .collect(Collectors.groupingBy(UserRoleAssignment::getRoleId, Collectors.counting()));

        List<Map<String, Object>> result = roles.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("roleCode", r.getRoleCode());
            m.put("roleName", r.getRoleName());
            m.put("roleType", r.getRoleType());
            m.put("description", r.getDescription());
            m.put("isActive", r.getIsActive());
            m.put("maxSessionMinutes", r.getMaxSessionMinutes());
            m.put("userCount", userCounts.getOrDefault(r.getId(), 0L));
            m.put("createdAt", r.getCreatedAt());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/roles")
    @Operation(summary = "Create a new security role")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecurityRole>> createRole(@RequestBody SecurityRole role) {
        role.setCreatedAt(Instant.now());
        role.setUpdatedAt(Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(roleRepository.save(role)));
    }

    @PutMapping("/roles/{id}")
    @Operation(summary = "Update a security role")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecurityRole>> updateRole(@PathVariable Long id, @RequestBody SecurityRole role) {
        SecurityRole existing = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found: " + id));
        existing.setRoleName(role.getRoleName());
        existing.setDescription(role.getDescription());
        existing.setIsActive(role.getIsActive());
        existing.setMaxSessionMinutes(role.getMaxSessionMinutes());
        existing.setIpWhitelist(role.getIpWhitelist());
        existing.setTimeRestriction(role.getTimeRestriction());
        existing.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(roleRepository.save(existing)));
    }

    // ========== PERMISSIONS ==========

    @GetMapping("/permissions")
    @Operation(summary = "List all security permissions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SecurityPermission>>> getPermissions() {
        return ResponseEntity.ok(ApiResponse.ok(permissionRepository.findByIsActiveTrueOrderByResourceAscActionAsc()));
    }

    @PostMapping("/permissions")
    @Operation(summary = "Create a security permission")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecurityPermission>> createPermission(@RequestBody SecurityPermission permission) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(permissionRepository.save(permission)));
    }

    // ========== ROLE-PERMISSION MAPPING ==========

    @GetMapping("/roles/{roleId}/permissions")
    @Operation(summary = "Get permissions assigned to a role")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<RolePermission>>> getRolePermissions(@PathVariable Long roleId) {
        return ResponseEntity.ok(ApiResponse.ok(rolePermissionRepository.findByRoleId(roleId)));
    }

    @PutMapping("/roles/{roleId}/permissions")
    @Operation(summary = "Replace permissions for a role")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateRolePermissions(
            @PathVariable Long roleId, @RequestBody List<Long> permissionIds) {
        rolePermissionRepository.deleteByRoleId(roleId);
        List<RolePermission> newMappings = permissionIds.stream().map(pid ->
            RolePermission.builder().roleId(roleId).permissionId(pid).build()
        ).collect(Collectors.toList());
        rolePermissionRepository.saveAll(newMappings);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("roleId", roleId, "permissionCount", permissionIds.size())));
    }

    // ========== USER ROLE ASSIGNMENTS ==========

    @GetMapping("/user-assignments")
    @Operation(summary = "List all user role assignments")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<UserRoleAssignment>>> getUserAssignments() {
        return ResponseEntity.ok(ApiResponse.ok(userRoleAssignmentRepository.findByIsActiveTrueOrderByAssignedAtDesc()));
    }

    @GetMapping("/user-assignments/{userId}")
    @Operation(summary = "Get roles for a specific user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<UserRoleAssignment>>> getUserRoles(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(userRoleAssignmentRepository.findByUserIdAndIsActiveTrue(userId)));
    }

    @PostMapping("/user-assignments")
    @Operation(summary = "Assign a role to a user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<UserRoleAssignment>> assignRole(@RequestBody UserRoleAssignment assignment) {
        assignment.setAssignedAt(Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(userRoleAssignmentRepository.save(assignment)));
    }

    // ========== ABAC POLICIES ==========

    @GetMapping("/abac-policies")
    @Operation(summary = "List all ABAC policies")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AbacPolicy>>> getAbacPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(abacPolicyRepository.findByIsActiveTrueOrderByPriorityAsc()));
    }

    @PostMapping("/abac-policies")
    @Operation(summary = "Create an ABAC policy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AbacPolicy>> createAbacPolicy(@RequestBody AbacPolicy policy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(abacPolicyRepository.save(policy)));
    }

    @PutMapping("/abac-policies/{id}")
    @Operation(summary = "Update an ABAC policy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<AbacPolicy>> updateAbacPolicy(@PathVariable Long id, @RequestBody AbacPolicy policy) {
        policy.setId(id);
        policy.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(abacPolicyRepository.save(policy)));
    }

    @DeleteMapping("/abac-policies/{id}")
    @Operation(summary = "Delete an ABAC policy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAbacPolicy(@PathVariable Long id) {
        abacPolicyRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ========== MFA ENROLLMENTS ==========

    @GetMapping("/mfa-enrollments")
    @Operation(summary = "List all MFA enrollments")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MfaEnrollment>>> getMfaEnrollments() {
        return ResponseEntity.ok(ApiResponse.ok(mfaEnrollmentRepository.findAll()));
    }

    @GetMapping("/mfa-enrollments/user/{userId}")
    @Operation(summary = "Get MFA enrollments for a user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MfaEnrollment>>> getUserMfaEnrollments(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(mfaEnrollmentRepository.findByUserIdOrderByCreatedAtDesc(userId)));
    }

    @PostMapping("/mfa-enrollments/{id}/suspend")
    @Operation(summary = "Suspend an MFA enrollment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MfaEnrollment>> suspendMfaEnrollment(@PathVariable Long id) {
        MfaEnrollment enrollment = mfaEnrollmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MFA enrollment not found: " + id));
        enrollment.setStatus("SUSPENDED");
        enrollment.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(mfaEnrollmentRepository.save(enrollment)));
    }

    @PostMapping("/mfa-enrollments/{id}/revoke")
    @Operation(summary = "Revoke an MFA enrollment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MfaEnrollment>> revokeMfaEnrollment(@PathVariable Long id) {
        MfaEnrollment enrollment = mfaEnrollmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MFA enrollment not found: " + id));
        enrollment.setStatus("REVOKED");
        enrollment.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(mfaEnrollmentRepository.save(enrollment)));
    }

    @PostMapping("/mfa-enrollments/{id}/activate")
    @Operation(summary = "Activate an MFA enrollment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MfaEnrollment>> activateMfaEnrollment(@PathVariable Long id) {
        MfaEnrollment enrollment = mfaEnrollmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MFA enrollment not found: " + id));
        enrollment.setStatus("ACTIVE");
        enrollment.setIsVerified(true);
        enrollment.setVerifiedAt(Instant.now());
        enrollment.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(mfaEnrollmentRepository.save(enrollment)));
    }

    // ========== ENCRYPTION KEYS ==========

    @GetMapping("/encryption-keys")
    @Operation(summary = "List all encryption keys (material excluded)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<EncryptionKey>>> getEncryptionKeys() {
        List<EncryptionKey> keys = encryptionKeyRepository.findAllByOrderByCreatedAtDesc();
        // Never expose key material over API
        keys.forEach(k -> { k.setEncryptedMaterial(null); k.setHsmKeyHandle(null); });
        return ResponseEntity.ok(ApiResponse.ok(keys));
    }

    @PostMapping("/encryption-keys")
    @Operation(summary = "Register an encryption key")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EncryptionKey>> createEncryptionKey(@RequestBody EncryptionKey key) {
        key.setCreatedAt(Instant.now());
        key.setUpdatedAt(Instant.now());
        EncryptionKey saved = encryptionKeyRepository.save(key);
        saved.setEncryptedMaterial(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(saved));
    }

    @PostMapping("/encryption-keys/{id}/rotate")
    @Operation(summary = "Mark a key for rotation")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EncryptionKey>> rotateKey(@PathVariable Long id) {
        EncryptionKey key = encryptionKeyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Key not found: " + id));
        key.setStatus("ROTATION_PENDING");
        key.setLastRotatedAt(Instant.now());
        key.setUpdatedAt(Instant.now());
        EncryptionKey saved = encryptionKeyRepository.save(key);
        saved.setEncryptedMaterial(null);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @PostMapping("/encryption-keys/{id}/destroy")
    @Operation(summary = "Destroy an encryption key")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<EncryptionKey>> destroyKey(@PathVariable Long id) {
        EncryptionKey key = encryptionKeyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Key not found: " + id));
        key.setStatus("DESTROYED");
        key.setEncryptedMaterial(null);
        key.setUpdatedAt(Instant.now());
        EncryptionKey saved = encryptionKeyRepository.save(key);
        saved.setEncryptedMaterial(null);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    // ========== SECURITY EVENTS (SIEM) ==========

    @GetMapping("/events")
    @Operation(summary = "List security events with pagination")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSecurityEvents(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<SecurityEvent> events = (category != null && !category.isEmpty())
                ? securityEventRepository.findByEventCategoryOrderByCreatedAtDesc(category, PageRequest.of(page, size))
                : securityEventRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", events.getContent());
        result.put("totalElements", events.getTotalElements());
        result.put("totalPages", events.getTotalPages());
        result.put("page", page);
        result.put("size", size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/events/{id}/acknowledge")
    @Operation(summary = "Acknowledge a security event")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SecurityEvent>> acknowledgeEvent(
            @PathVariable Long id, @RequestParam String acknowledgedBy) {
        SecurityEvent event = securityEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
        event.setIsAcknowledged(true);
        event.setAcknowledgedBy(acknowledgedBy);
        event.setAcknowledgedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(securityEventRepository.save(event)));
    }

    // ========== SIEM CORRELATION RULES ==========

    @GetMapping("/siem-rules")
    @Operation(summary = "List all SIEM correlation rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SiemCorrelationRule>>> getSiemRules() {
        return ResponseEntity.ok(ApiResponse.ok(siemRuleRepository.findAll()));
    }

    @PostMapping("/siem-rules")
    @Operation(summary = "Create a SIEM correlation rule")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SiemCorrelationRule>> createSiemRule(@RequestBody SiemCorrelationRule rule) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(siemRuleRepository.save(rule)));
    }

    @PutMapping("/siem-rules/{id}")
    @Operation(summary = "Update a SIEM correlation rule")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SiemCorrelationRule>> updateSiemRule(@PathVariable Long id, @RequestBody SiemCorrelationRule rule) {
        rule.setId(id);
        rule.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(siemRuleRepository.save(rule)));
    }

    @PostMapping("/siem-rules/{id}/toggle")
    @Operation(summary = "Toggle a SIEM rule active/inactive")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SiemCorrelationRule>> toggleSiemRule(@PathVariable Long id) {
        SiemCorrelationRule rule = siemRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SIEM rule not found: " + id));
        rule.setIsActive(!rule.getIsActive());
        rule.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(siemRuleRepository.save(rule)));
    }

    // ========== MASKING POLICIES ==========

    @GetMapping("/masking-policies")
    @Operation(summary = "List all data masking policies")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<MaskingPolicy>>> getMaskingPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(maskingPolicyRepository.findByIsActiveTrueOrderByEntityTypeAscFieldNameAsc()));
    }

    @PostMapping("/masking-policies")
    @Operation(summary = "Create a masking policy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MaskingPolicy>> createMaskingPolicy(@RequestBody MaskingPolicy policy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(maskingPolicyRepository.save(policy)));
    }

    @PutMapping("/masking-policies/{id}")
    @Operation(summary = "Update a masking policy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MaskingPolicy>> updateMaskingPolicy(@PathVariable Long id, @RequestBody MaskingPolicy policy) {
        policy.setId(id);
        policy.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.ok(maskingPolicyRepository.save(policy)));
    }

    // ========== PII FIELD REGISTRY ==========

    @GetMapping("/pii-registry")
    @Operation(summary = "List all PII field registrations")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<PiiFieldRegistry>>> getPiiRegistry() {
        return ResponseEntity.ok(ApiResponse.ok(piiFieldRegistryRepository.findAllByOrderByEntityTypeAscFieldNameAsc()));
    }

    @PostMapping("/pii-registry")
    @Operation(summary = "Register a PII field")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PiiFieldRegistry>> registerPiiField(@RequestBody PiiFieldRegistry field) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(piiFieldRegistryRepository.save(field)));
    }
}
