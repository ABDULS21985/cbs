package com.cbs.security.rbac.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.security.rbac.entity.*;
import com.cbs.security.rbac.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class RbacService {

    private final SecurityRoleRepository roleRepository;
    private final UserRoleAssignmentRepository assignmentRepository;
    private final SodRuleRepository sodRuleRepository;

    @Transactional
    public SecurityRole createRole(SecurityRole role) {
        roleRepository.findByRoleCode(role.getRoleCode()).ifPresent(r -> {
            throw new BusinessException("Role code exists: " + role.getRoleCode(), "DUPLICATE_ROLE");
        });
        return roleRepository.save(role);
    }

    /**
     * Assigns a role to a user, checking SoD rules first.
     */
    @Transactional
    public UserRoleAssignment assignRole(String userId, String roleCode, String branchCode, String assignedBy) {
        roleRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("SecurityRole", "roleCode", roleCode));

        // Check SoD violations
        List<SodViolation> violations = checkSodViolations(userId, roleCode);
        if (!violations.isEmpty()) {
            String detail = violations.stream().map(v -> v.ruleName() + " (" + v.severity() + ")").collect(Collectors.joining(", "));
            throw new BusinessException("SoD violation: " + detail, "SOD_VIOLATION");
        }

        UserRoleAssignment assignment = UserRoleAssignment.builder()
                .userId(userId).roleCode(roleCode).branchCode(branchCode).assignedBy(assignedBy).build();
        log.info("Role assigned: user={}, role={}, by={}", userId, roleCode, assignedBy);
        return assignmentRepository.save(assignment);
    }

    /**
     * JIT (Just-In-Time) privilege elevation — temporary role grant with approval and expiry.
     */
    @Transactional
    public UserRoleAssignment elevatePrivilege(String userId, String roleCode, String reason,
                                                  String approvedBy, int durationMinutes) {
        UserRoleAssignment jit = UserRoleAssignment.builder()
                .userId(userId).roleCode(roleCode).isJitElevation(true)
                .jitReason(reason).jitApprovedBy(approvedBy)
                .jitExpiresAt(Instant.now().plus(durationMinutes, ChronoUnit.MINUTES))
                .assignedBy(approvedBy).build();
        log.warn("JIT elevation: user={}, role={}, reason={}, expires={}min", userId, roleCode, reason, durationMinutes);
        return assignmentRepository.save(jit);
    }

    /**
     * ABAC authorization check: permission + branch + product + amount.
     */
    public AuthorizationResult authorize(String userId, String permission, String branchCode,
                                            String productCode, BigDecimal amount) {
        List<UserRoleAssignment> assignments = assignmentRepository.findByUserIdAndIsActiveTrue(userId);
        List<UserRoleAssignment> effective = assignments.stream().filter(UserRoleAssignment::isEffective).toList();

        for (UserRoleAssignment assignment : effective) {
            SecurityRole role = roleRepository.findByRoleCode(assignment.getRoleCode()).orElse(null);
            if (role == null || !Boolean.TRUE.equals(role.getIsActive())) continue;

            boolean hasPerm = role.hasPermission(permission);
            boolean branchOk = branchCode == null || role.canAccessBranch(branchCode);
            boolean productOk = productCode == null || role.canAccessProduct(productCode);
            boolean amountOk = amount == null || role.getMaxApprovalAmount() == null
                    || amount.compareTo(role.getMaxApprovalAmount()) <= 0;

            if (hasPerm && branchOk && productOk && amountOk) {
                return new AuthorizationResult(true, role.getRoleCode(), role.getDataAccessLevel(), null);
            }
        }

        return new AuthorizationResult(false, null, null, "No effective role grants permission: " + permission);
    }

    public List<SodViolation> checkSodViolations(String userId, String newRoleCode) {
        List<String> existingRoles = assignmentRepository.findByUserIdAndIsActiveTrue(userId).stream()
                .filter(UserRoleAssignment::isEffective).map(UserRoleAssignment::getRoleCode).toList();
        List<SodRule> rules = sodRuleRepository.findByIsActiveTrueOrderByRuleNameAsc();

        return rules.stream()
                .filter(rule -> existingRoles.stream().anyMatch(er -> rule.isViolatedBy(er, newRoleCode)))
                .map(rule -> new SodViolation(rule.getRuleName(), rule.getConflictingRoleA(), rule.getConflictingRoleB(), rule.getSeverity()))
                .toList();
    }

    public List<SecurityRole> getAllRoles() { return roleRepository.findByIsActiveTrueOrderByRoleCodeAsc(); }
    public List<UserRoleAssignment> getUserRoles(String userId) { return assignmentRepository.findByUserIdAndIsActiveTrue(userId); }

    public record AuthorizationResult(boolean authorized, String roleCode, String dataAccessLevel, String reason) {}
    public record SodViolation(String ruleName, String roleA, String roleB, String severity) {}
}
