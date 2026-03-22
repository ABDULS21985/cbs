package com.cbs.admin;

import com.cbs.common.dto.ApiResponse;
import com.cbs.security.controller.SecurityAdminController;
import com.cbs.security.entity.*;
import com.cbs.security.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityAdminControllerTest {

    @Mock private SecurityRoleRepository roleRepository;
    @Mock private SecurityPermissionRepository permissionRepository;
    @Mock private RolePermissionRepository rolePermissionRepository;
    @Mock private UserRoleAssignmentRepository userRoleAssignmentRepository;
    @Mock private AbacPolicyRepository abacPolicyRepository;
    @Mock private MfaEnrollmentRepository mfaEnrollmentRepository;
    @Mock private EncryptionKeyRepository encryptionKeyRepository;
    @Mock private SecurityEventRepository securityEventRepository;
    @Mock private SiemCorrelationRuleRepository siemRuleRepository;
    @Mock private MaskingPolicyRepository maskingPolicyRepository;
    @Mock private PiiFieldRegistryRepository piiFieldRegistryRepository;

    @InjectMocks private SecurityAdminController controller;

    @Test
    @DisplayName("GET /v1/security-admin/overview returns security stats")
    void getOverview_ReturnsStats() {
        when(roleRepository.count()).thenReturn(5L);
        when(roleRepository.findByIsActiveTrueOrderByRoleNameAsc()).thenReturn(List.of());
        when(permissionRepository.count()).thenReturn(45L);
        when(userRoleAssignmentRepository.count()).thenReturn(42L);
        when(abacPolicyRepository.count()).thenReturn(8L);
        when(mfaEnrollmentRepository.count()).thenReturn(30L);
        when(mfaEnrollmentRepository.countByStatus("ACTIVE")).thenReturn(28L);
        when(encryptionKeyRepository.count()).thenReturn(6L);
        when(encryptionKeyRepository.findByStatusOrderByCreatedAtDesc("ACTIVE")).thenReturn(List.of());
        when(securityEventRepository.count()).thenReturn(1500L);
        when(securityEventRepository.countByIsAcknowledgedFalse()).thenReturn(12L);
        when(securityEventRepository.countBySeverity("CRITICAL")).thenReturn(3L);
        when(siemRuleRepository.count()).thenReturn(15L);
        when(maskingPolicyRepository.count()).thenReturn(10L);
        when(piiFieldRegistryRepository.count()).thenReturn(22L);

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.getOverview();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).containsEntry("totalRoles", 5L);
        assertThat(response.getBody().getData()).containsEntry("totalPermissions", 45L);
    }

    @Test
    @DisplayName("GET /v1/security-admin/roles returns roles with user counts")
    void getRoles_ReturnsRolesWithCounts() {
        SecurityRole role = new SecurityRole();
        role.setId(1L);
        role.setRoleCode("CBS_ADMIN");
        role.setRoleName("System Administrator");
        role.setRoleType("SYSTEM");
        role.setIsActive(true);
        role.setCreatedAt(Instant.now());
        when(roleRepository.findAll()).thenReturn(List.of(role));
        when(userRoleAssignmentRepository.findByIsActiveTrueOrderByAssignedAtDesc()).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<Map<String, Object>>>> response = controller.getRoles();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).get("roleCode")).isEqualTo("CBS_ADMIN");
    }

    @Test
    @DisplayName("POST /v1/security-admin/roles creates a role")
    void createRole_ReturnsCreated() {
        SecurityRole role = new SecurityRole();
        role.setRoleCode("CUSTOM_ROLE");
        role.setRoleName("Custom Role");
        when(roleRepository.save(any())).thenReturn(role);

        ResponseEntity<ApiResponse<SecurityRole>> response = controller.createRole(role);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("GET /v1/security-admin/permissions returns active permissions")
    void getPermissions_ReturnsActive() {
        when(permissionRepository.findByIsActiveTrueOrderByResourceAscActionAsc()).thenReturn(List.of());
        ResponseEntity<ApiResponse<List<SecurityPermission>>> response = controller.getPermissions();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("GET /v1/security-admin/abac-policies returns active policies")
    void getAbacPolicies_ReturnsActive() {
        when(abacPolicyRepository.findByIsActiveTrueOrderByPriorityAsc()).thenReturn(List.of());
        ResponseEntity<ApiResponse<List<AbacPolicy>>> response = controller.getAbacPolicies();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("POST /v1/security-admin/abac-policies creates policy")
    void createAbacPolicy_ReturnsCreated() {
        AbacPolicy policy = new AbacPolicy();
        policy.setPolicyName("Test Policy");
        when(abacPolicyRepository.save(any())).thenReturn(policy);

        ResponseEntity<ApiResponse<AbacPolicy>> response = controller.createAbacPolicy(policy);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @DisplayName("DELETE /v1/security-admin/abac-policies/{id} deletes policy")
    void deleteAbacPolicy_ReturnsOk() {
        doNothing().when(abacPolicyRepository).deleteById(1L);
        ResponseEntity<ApiResponse<Void>> response = controller.deleteAbacPolicy(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(abacPolicyRepository).deleteById(1L);
    }

    @Test
    @DisplayName("GET /v1/security-admin/mfa-enrollments returns all enrollments")
    void getMfaEnrollments_ReturnsAll() {
        when(mfaEnrollmentRepository.findAll()).thenReturn(List.of());
        ResponseEntity<ApiResponse<List<MfaEnrollment>>> response = controller.getMfaEnrollments();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("POST /v1/security-admin/mfa-enrollments/{id}/suspend suspends enrollment")
    void suspendMfaEnrollment_SetsStatusSuspended() {
        MfaEnrollment enrollment = new MfaEnrollment();
        enrollment.setId(1L);
        enrollment.setStatus("ACTIVE");
        when(mfaEnrollmentRepository.findById(1L)).thenReturn(Optional.of(enrollment));
        when(mfaEnrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ApiResponse<MfaEnrollment>> response = controller.suspendMfaEnrollment(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("SUSPENDED");
    }

    @Test
    @DisplayName("GET /v1/security-admin/encryption-keys returns keys without material")
    void getEncryptionKeys_ExcludesMaterial() {
        EncryptionKey key = new EncryptionKey();
        key.setId(1L);
        key.setKeyAlias("TEST-KEY");
        key.setEncryptedMaterial("secret");
        key.setHsmKeyHandle("handle");
        when(encryptionKeyRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(key));

        ResponseEntity<ApiResponse<List<EncryptionKey>>> response = controller.getEncryptionKeys();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get(0).getEncryptedMaterial()).isNull();
        assertThat(response.getBody().getData().get(0).getHsmKeyHandle()).isNull();
    }

    @Test
    @DisplayName("POST /v1/security-admin/encryption-keys/{id}/rotate marks key for rotation")
    void rotateKey_SetsRotationPending() {
        EncryptionKey key = new EncryptionKey();
        key.setId(1L);
        key.setStatus("ACTIVE");
        when(encryptionKeyRepository.findById(1L)).thenReturn(Optional.of(key));
        when(encryptionKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ApiResponse<EncryptionKey>> response = controller.rotateKey(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("ROTATION_PENDING");
    }

    @Test
    @DisplayName("POST /v1/security-admin/encryption-keys/{id}/destroy destroys key")
    void destroyKey_SetsStatusDestroyed() {
        EncryptionKey key = new EncryptionKey();
        key.setId(1L);
        key.setStatus("ACTIVE");
        when(encryptionKeyRepository.findById(1L)).thenReturn(Optional.of(key));
        when(encryptionKeyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ApiResponse<EncryptionKey>> response = controller.destroyKey(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("DESTROYED");
    }

    @Test
    @DisplayName("POST /v1/security-admin/siem-rules/{id}/toggle flips active status")
    void toggleSiemRule_TogglesActive() {
        SiemCorrelationRule rule = new SiemCorrelationRule();
        rule.setId(1L);
        rule.setIsActive(true);
        when(siemRuleRepository.findById(1L)).thenReturn(Optional.of(rule));
        when(siemRuleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ApiResponse<SiemCorrelationRule>> response = controller.toggleSiemRule(1L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getIsActive()).isFalse();
    }

    @Test
    @DisplayName("GET /v1/security-admin/masking-policies returns active policies")
    void getMaskingPolicies_ReturnsActive() {
        when(maskingPolicyRepository.findByIsActiveTrueOrderByEntityTypeAscFieldNameAsc()).thenReturn(List.of());
        ResponseEntity<ApiResponse<List<MaskingPolicy>>> response = controller.getMaskingPolicies();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("GET /v1/security-admin/pii-registry returns all PII fields")
    void getPiiRegistry_ReturnsAll() {
        when(piiFieldRegistryRepository.findAllByOrderByEntityTypeAscFieldNameAsc()).thenReturn(List.of());
        ResponseEntity<ApiResponse<List<PiiFieldRegistry>>> response = controller.getPiiRegistry();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
