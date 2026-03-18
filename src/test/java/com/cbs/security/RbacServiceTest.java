package com.cbs.security;

import com.cbs.security.entity.*;
import com.cbs.security.repository.*;
import com.cbs.security.service.RbacService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RbacServiceTest {

    @Mock private SecurityRoleRepository roleRepository;
    @Mock private SecurityPermissionRepository permissionRepository;
    @Mock private RolePermissionRepository rolePermissionRepository;
    @Mock private UserRoleAssignmentRepository assignmentRepository;
    @Mock private AbacPolicyRepository abacPolicyRepository;
    @InjectMocks private RbacService rbacService;

    @Test
    @DisplayName("Effective permissions include inherited parent role permissions")
    void effectivePermissions_InheritsParent() {
        // User has TELLER role, TELLER inherits from BASIC_USER
        SecurityRole teller = SecurityRole.builder().id(2L).roleCode("TELLER").parentRoleId(1L).build();
        SecurityRole basic = SecurityRole.builder().id(1L).roleCode("BASIC_USER").parentRoleId(null).build();

        UserRoleAssignment assignment = UserRoleAssignment.builder().userId(100L).roleId(2L).isActive(true).build();
        when(assignmentRepository.findByUserIdAndIsActiveTrue(100L)).thenReturn(List.of(assignment));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(teller));
        when(roleRepository.findById(1L)).thenReturn(Optional.of(basic));

        RolePermission rp1 = RolePermission.builder().roleId(2L).permissionId(10L).build();
        RolePermission rp2 = RolePermission.builder().roleId(1L).permissionId(20L).build();
        when(rolePermissionRepository.findByRoleId(2L)).thenReturn(List.of(rp1));
        when(rolePermissionRepository.findByRoleId(1L)).thenReturn(List.of(rp2));

        SecurityPermission p1 = SecurityPermission.builder().id(10L).permissionCode("ACCOUNT.CREATE")
                .resource("ACCOUNT").action("CREATE").isActive(true).build();
        SecurityPermission p2 = SecurityPermission.builder().id(20L).permissionCode("ACCOUNT.READ")
                .resource("ACCOUNT").action("READ").isActive(true).build();
        when(permissionRepository.findById(10L)).thenReturn(Optional.of(p1));
        when(permissionRepository.findById(20L)).thenReturn(Optional.of(p2));

        List<SecurityPermission> perms = rbacService.getEffectivePermissions(100L);
        assertThat(perms).hasSize(2);
        assertThat(perms).extracting(SecurityPermission::getPermissionCode)
                .containsExactlyInAnyOrder("ACCOUNT.CREATE", "ACCOUNT.READ");
    }

    @Test
    @DisplayName("ABAC DENY policy overrides RBAC PERMIT")
    void abacDenyOverridesRbac() {
        // Setup: user has ACCOUNT.CREATE permission via RBAC
        UserRoleAssignment assignment = UserRoleAssignment.builder().userId(100L).roleId(1L).isActive(true).build();
        when(assignmentRepository.findByUserIdAndIsActiveTrue(100L)).thenReturn(List.of(assignment));

        SecurityRole role = SecurityRole.builder().id(1L).roleCode("OFFICER").build();
        when(roleRepository.findById(1L)).thenReturn(Optional.of(role));

        RolePermission rp = RolePermission.builder().roleId(1L).permissionId(10L).build();
        when(rolePermissionRepository.findByRoleId(1L)).thenReturn(List.of(rp));

        SecurityPermission perm = SecurityPermission.builder().id(10L).permissionCode("ACCOUNT.CREATE")
                .resource("ACCOUNT").action("CREATE").isActive(true).build();
        when(permissionRepository.findById(10L)).thenReturn(Optional.of(perm));

        // ABAC policy: DENY if transaction.amount > 1000000
        AbacPolicy denyLargeAmount = AbacPolicy.builder()
                .policyName("deny-large-account-creation").resource("ACCOUNT").action("CREATE")
                .conditionExpr(Map.of("attribute", "transaction.amount", "operator", ">", "value", 1000000))
                .effect("DENY").priority(1).isActive(true).build();
        when(abacPolicyRepository.findByResourceAndActionAndIsActiveTrueOrderByPriorityAsc("ACCOUNT", "CREATE"))
                .thenReturn(List.of(denyLargeAmount));

        // Transaction of 5,000,000 → DENY
        Map<String, Object> attributes = Map.of("userId", 100L, "transaction", Map.of("amount", 5000000));
        boolean result = rbacService.evaluateAccess("ACCOUNT", "CREATE", attributes);
        assertThat(result).isFalse();

        // Transaction of 500,000 → PERMIT (below threshold)
        Map<String, Object> smallAttrs = Map.of("userId", 100L, "transaction", Map.of("amount", 500000));
        boolean result2 = rbacService.evaluateAccess("ACCOUNT", "CREATE", smallAttrs);
        assertThat(result2).isTrue();
    }
}
