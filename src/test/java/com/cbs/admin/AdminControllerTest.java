package com.cbs.admin;

import com.cbs.account.repository.AccountRepository;
import com.cbs.admin.controller.AdminController;
import com.cbs.admin.service.AdminUserService;
import com.cbs.billing.repository.BillerRepository;
import com.cbs.channel.repository.ChannelSessionRepository;
import com.cbs.common.dto.ApiResponse;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.SystemParameterRepository;
import com.cbs.lending.repository.LoanAccountRepository;
import com.cbs.provider.entity.ServiceProvider;
import com.cbs.provider.repository.ProviderHealthLogRepository;
import com.cbs.provider.repository.ProviderTransactionLogRepository;
import com.cbs.provider.repository.ServiceProviderRepository;
import com.cbs.provider.service.ProviderManagementService;
import com.cbs.security.entity.SecurityRole;
import com.cbs.security.repository.SecurityRoleRepository;
import com.cbs.security.repository.UserRoleAssignmentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
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
class AdminControllerTest {

    @Mock private EntityManager entityManager;
    @Mock private SystemParameterRepository systemParameterRepository;
    @Mock private BillerRepository billerRepository;
    @Mock private ServiceProviderRepository serviceProviderRepository;
    @Mock private ProviderHealthLogRepository providerHealthLogRepository;
    @Mock private ProviderTransactionLogRepository providerTransactionLogRepository;
    @Mock private ProviderManagementService providerManagementService;
    @Mock private ChannelSessionRepository channelSessionRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private LoanAccountRepository loanAccountRepository;
    @Mock private AdminUserService adminUserService;
    @Mock private UserRoleAssignmentRepository userRoleAssignmentRepository;
    @Mock private SecurityRoleRepository securityRoleRepository;

    @InjectMocks private AdminController controller;

    // ── User Endpoints ──────────────────────────────────────────

    @Test
    @DisplayName("GET /v1/admin/users returns user list from role assignments")
    void getUsers_ReturnsUserList() {
        when(adminUserService.getUsernameIndex()).thenReturn(Map.of());
        when(adminUserService.getUserIdIndex()).thenReturn(Map.of());

        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<Map<String, Object>>>> response = controller.getUsers();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    @DisplayName("POST /v1/admin/users creates user with Keycloak and CBS role assignment")
    void createUser_PersistsToKeycloakAndCbs() {
        when(adminUserService.createKeycloakUser(anyString(), anyString(), any(), any(), any(), eq(true)))
                .thenReturn("kc-uuid-123");

        SecurityRole officerRole = SecurityRole.builder().id(2L).roleCode("CBS_OFFICER").roleName("Officer").build();
        when(securityRoleRepository.findByRoleCode("CBS_OFFICER")).thenReturn(Optional.of(officerRole));
        when(userRoleAssignmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("username", "newuser");
        userData.put("firstName", "New");
        userData.put("lastName", "User");
        userData.put("email", "new@cbs.bank");
        userData.put("roles", List.of("CBS_OFFICER"));

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.createUser(userData);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData().get("id")).isEqualTo("kc-uuid-123");
        assertThat(response.getBody().getData().get("status")).isEqualTo("ACTIVE");
        assertThat(response.getBody().getData()).doesNotContainKey("password");

        verify(adminUserService).createKeycloakUser(eq("newuser"), eq("new@cbs.bank"), eq("New"), eq("User"), isNull(), eq(true));
        verify(userRoleAssignmentRepository).save(any());
    }

    @Test
    @DisplayName("POST /v1/admin/users degrades gracefully when Keycloak unavailable")
    void createUser_DegradesToCbsOnly() {
        when(adminUserService.createKeycloakUser(anyString(), any(), any(), any(), any(), eq(true)))
                .thenReturn(null);

        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("username", "localuser");
        userData.put("email", "local@cbs.bank");

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.createUser(userData);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData()).containsKey("id");
        assertThat(response.getBody().getData().get("status")).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("PUT /v1/admin/users/{id} updates user in Keycloak and CBS")
    void updateUser_UpdatesKeycloakAndCbs() {
        when(adminUserService.updateKeycloakUser(eq("kc-uuid-123"), eq("updated@cbs.bank"), isNull(), isNull(), isNull()))
                .thenReturn(true);

        Map<String, Object> updates = new LinkedHashMap<>();
        updates.put("email", "updated@cbs.bank");

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.updateUser("kc-uuid-123", updates);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("id")).isEqualTo("kc-uuid-123");

        verify(adminUserService).updateKeycloakUser(eq("kc-uuid-123"), eq("updated@cbs.bank"), isNull(), isNull(), isNull());
    }

    @Test
    @DisplayName("POST /v1/admin/users/{id}/disable disables in Keycloak and deactivates CBS assignments")
    void disableUser_DisablesInKeycloakAndCbs() {
        when(adminUserService.disableKeycloakUser("1")).thenReturn(true);
        when(userRoleAssignmentRepository.findByUserIdAndIsActiveTrue(1L)).thenReturn(List.of());

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.disableUser("1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("status")).isEqualTo("DISABLED");

        verify(adminUserService).disableKeycloakUser("1");
    }

    @Test
    @DisplayName("POST /v1/admin/users/{id}/enable enables in Keycloak and reactivates CBS assignments")
    void enableUser_EnablesInKeycloakAndCbs() {
        when(adminUserService.enableKeycloakUser("1")).thenReturn(true);
        when(userRoleAssignmentRepository.findByUserId(1L)).thenReturn(List.of());

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.enableUser("1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("status")).isEqualTo("ACTIVE");

        verify(adminUserService).enableKeycloakUser("1");
    }

    @Test
    @DisplayName("POST /v1/admin/users/{id}/reset-password sends reset via Keycloak")
    void resetPassword_SendsViaKeycloak() {
        when(adminUserService.resetKeycloakPassword("kc-uuid-123", true)).thenReturn(true);

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.resetPassword("kc-uuid-123");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("message")).contains("identity provider");
        assertThat(response.getBody().getData().get("keycloakSent")).isEqualTo("true");
    }

    @Test
    @DisplayName("POST /v1/admin/users/{id}/reset-password degrades when Keycloak unavailable")
    void resetPassword_DegracesGracefully() {
        when(adminUserService.resetKeycloakPassword("1", true)).thenReturn(false);

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.resetPassword("1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("keycloakSent")).isEqualTo("false");
    }

    @Test
    @DisplayName("POST /v1/admin/users/{id}/force-logout terminates Keycloak sessions and CBS sessions")
    void forceLogout_TerminatesBothSessions() {
        when(adminUserService.logoutKeycloakUser("1")).thenReturn(true);
        when(channelSessionRepository.findByCustomerIdAndStatus(1L, "ACTIVE")).thenReturn(List.of());

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.forceLogout("1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("keycloakLogout")).isEqualTo("true");
        assertThat(response.getBody().getData().get("cbsSessionsClosed")).isEqualTo("0");
    }

    @Test
    @DisplayName("POST /v1/admin/users/{id}/unlock unlocks in Keycloak and reactivates CBS")
    void unlockUser_UnlocksInKeycloakAndReactivatesCbs() {
        when(adminUserService.enableKeycloakUser("1")).thenReturn(true);
        when(userRoleAssignmentRepository.findByUserId(1L)).thenReturn(List.of());

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.unlockUser("1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("status")).isEqualTo("ACTIVE");
    }

    // ── Role Endpoints ──────────────────────────────────────────

    @Test
    @DisplayName("GET /v1/admin/roles returns role list")
    void getRoles_ReturnsRoleList() {
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<Map<String, Object>>>> response = controller.getRoles();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    @DisplayName("POST /v1/admin/roles creates a role in security_role table")
    void createRole_PersistsToDb() {
        SecurityRole savedRole = SecurityRole.builder()
                .id(10L).roleCode("CUSTOM_ROLE").roleName("Custom Role")
                .createdAt(Instant.now()).updatedAt(Instant.now()).build();
        when(securityRoleRepository.save(any())).thenReturn(savedRole);

        Map<String, Object> roleData = new LinkedHashMap<>(Map.of("name", "CUSTOM_ROLE", "displayName", "Custom Role"));
        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.createRole(roleData);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData().get("id")).isEqualTo("10");

        verify(securityRoleRepository).save(any(SecurityRole.class));
    }

    // ── Permission Endpoints ────────────────────────────────────

    @Test
    @DisplayName("GET /v1/admin/permissions returns permission list")
    void getPermissions_ReturnsList() {
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<Map<String, Object>>>> response = controller.getPermissions();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    // ── Session Endpoints ───────────────────────────────────────

    @Test
    @DisplayName("DELETE /v1/admin/sessions/{id} terminates Keycloak and CBS sessions")
    void terminateSession_TerminatesBoth() {
        when(adminUserService.terminateKeycloakSession("sess-123")).thenReturn(true);
        when(channelSessionRepository.findBySessionId("sess-123")).thenReturn(Optional.empty());

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.terminateSession("sess-123");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("status")).isEqualTo("TERMINATED");
        assertThat(response.getBody().getData().get("keycloakTerminated")).isEqualTo("true");
    }

    // ── Parameter Endpoints ─────────────────────────────────────

    @Test
    @DisplayName("GET /v1/admin/parameters returns parameters")
    void getParameters_ReturnsList() {
        when(systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc())
                .thenReturn(List.of());
        ResponseEntity<ApiResponse<List<SystemParameter>>> response = controller.getParameters();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("GET /v1/admin/parameters/feature-flags returns boolean params")
    void getFeatureFlags_ReturnsBooleanParams() {
        SystemParameter boolParam = new SystemParameter();
        boolParam.setValueType("BOOLEAN");
        boolParam.setParamKey("ENABLE_SMS");
        when(systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc())
                .thenReturn(List.of(boolParam));

        ResponseEntity<ApiResponse<List<SystemParameter>>> response = controller.getFeatureFlags();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("GET /v1/admin/parameters/system-info returns JVM info")
    void getSystemInfo_ReturnsSystemInfo() {
        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.getSystemInfo();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).containsKeys("javaVersion", "maxMemoryMb", "uptimeSeconds");
    }

    // ── Provider Endpoints ──────────────────────────────────────

    @Test
    @DisplayName("GET /v1/admin/providers returns all providers")
    void getProviders_ReturnsList() {
        when(serviceProviderRepository.findAll()).thenReturn(List.of());
        ResponseEntity<ApiResponse<List<ServiceProvider>>> response = controller.getProviders();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("POST /v1/admin/providers creates a provider")
    void createProvider_ReturnsCreated() {
        ServiceProvider provider = new ServiceProvider();
        provider.setProviderCode("TEST-GW");
        provider.setProviderName("Test Gateway");
        when(serviceProviderRepository.save(any())).thenReturn(provider);

        ResponseEntity<ApiResponse<ServiceProvider>> response = controller.createProvider(provider);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    // ── Dashboard Stats ─────────────────────────────────────────

    @Test
    @DisplayName("GET /v1/admin/dashboard/stats returns aggregated stats")
    void getDashboardStats_ReturnsStats() {
        when(accountRepository.count()).thenReturn(1500L);
        when(customerRepository.count()).thenReturn(800L);
        when(loanAccountRepository.count()).thenReturn(350L);
        when(accountRepository.countByStatus(any())).thenReturn(1200L);
        when(customerRepository.countByStatus(any())).thenReturn(750L);
        when(accountRepository.getAccountSummaryByProduct()).thenReturn(List.of());
        when(serviceProviderRepository.findAll()).thenReturn(List.of());
        when(serviceProviderRepository.findByHealthStatus("UP")).thenReturn(List.of());
        when(billerRepository.findByIsActiveTrueOrderByBillerNameAsc()).thenReturn(List.of());

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.getDashboardStats();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).containsKeys("totalAccounts", "totalCustomers", "totalLoans");
        assertThat(response.getBody().getData().get("totalAccounts")).isEqualTo(1500L);
    }
}
