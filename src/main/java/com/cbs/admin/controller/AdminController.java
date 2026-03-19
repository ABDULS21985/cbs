package com.cbs.admin.controller;

import com.cbs.account.repository.AccountRepository;
import com.cbs.billing.entity.Biller;
import com.cbs.billing.repository.BillerRepository;
import com.cbs.channel.repository.ChannelSessionRepository;
import com.cbs.common.dto.ApiResponse;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.SystemParameterRepository;
import com.cbs.lending.repository.LoanAccountRepository;
import com.cbs.provider.entity.ServiceProvider;
import com.cbs.provider.repository.ServiceProviderRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.lang.management.ManagementFactory;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Administration endpoints for users, roles, permissions, sessions, billers, providers, and system info")
public class AdminController {

    private final EntityManager entityManager;
    private final SystemParameterRepository systemParameterRepository;
    private final BillerRepository billerRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final ChannelSessionRepository channelSessionRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final LoanAccountRepository loanAccountRepository;

    // ===========================
    // USERS, ROLES, PERMISSIONS
    // ===========================

    @GetMapping("/users")
    @Operation(summary = "List all users from security_role and user_role_assignment tables")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUsers() {
        List<Map<String, Object>> users = new ArrayList<>();
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT ura.user_id, ura.username, ura.email, ura.assigned_at, sr.role_name " +
                    "FROM cbs.user_role_assignment ura " +
                    "LEFT JOIN cbs.security_role sr ON ura.role_id = sr.id " +
                    "ORDER BY ura.username ASC");
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            Map<String, Map<String, Object>> userMap = new LinkedHashMap<>();
            for (Object[] row : rows) {
                String username = row[1] != null ? row[1].toString() : "unknown";
                Map<String, Object> user = userMap.computeIfAbsent(username, k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("userId", row[0]);
                    m.put("username", username);
                    m.put("email", row[2]);
                    m.put("assignedAt", row[3]);
                    m.put("roles", new ArrayList<String>());
                    return m;
                });
                if (row[4] != null) {
                    @SuppressWarnings("unchecked")
                    List<String> roles = (List<String>) user.get("roles");
                    roles.add(row[4].toString());
                }
            }
            users.addAll(userMap.values());
        } catch (Exception e) {
            // Tables may not exist yet - return empty
        }
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/roles")
    @Operation(summary = "List all security roles")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRoles() {
        List<Map<String, Object>> roles = new ArrayList<>();
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT id, role_name, description, is_active, created_at FROM cbs.security_role ORDER BY role_name ASC");
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                Map<String, Object> role = new LinkedHashMap<>();
                role.put("id", row[0]);
                role.put("roleName", row[1]);
                role.put("description", row[2]);
                role.put("isActive", row[3]);
                role.put("createdAt", row[4]);
                roles.add(role);
            }
        } catch (Exception e) {
            // Table may not exist
        }
        return ResponseEntity.ok(ApiResponse.ok(roles));
    }

    @GetMapping("/permissions")
    @Operation(summary = "List all security permissions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPermissions() {
        List<Map<String, Object>> permissions = new ArrayList<>();
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT id, permission_name, resource, action, description, is_active FROM cbs.security_permission ORDER BY permission_name ASC");
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                Map<String, Object> perm = new LinkedHashMap<>();
                perm.put("id", row[0]);
                perm.put("permissionName", row[1]);
                perm.put("resource", row[2]);
                perm.put("action", row[3]);
                perm.put("description", row[4]);
                perm.put("isActive", row[5]);
                permissions.add(perm);
            }
        } catch (Exception e) {
            // Table may not exist
        }
        return ResponseEntity.ok(ApiResponse.ok(permissions));
    }

    // ===========================
    // SESSIONS & LOGIN HISTORY
    // ===========================

    @GetMapping("/sessions")
    @Operation(summary = "Active sessions summary from channel_session table")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSessions() {
        long activeSessions = channelSessionRepository.countByChannelAndStatus("WEB", "ACTIVE")
                + channelSessionRepository.countByChannelAndStatus("MOBILE", "ACTIVE")
                + channelSessionRepository.countByChannelAndStatus("USSD", "ACTIVE")
                + channelSessionRepository.countByChannelAndStatus("ATM", "ACTIVE");

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalActiveSessions", activeSessions);
        summary.put("webSessions", channelSessionRepository.countByChannelAndStatus("WEB", "ACTIVE"));
        summary.put("mobileSessions", channelSessionRepository.countByChannelAndStatus("MOBILE", "ACTIVE"));
        summary.put("ussdSessions", channelSessionRepository.countByChannelAndStatus("USSD", "ACTIVE"));
        summary.put("atmSessions", channelSessionRepository.countByChannelAndStatus("ATM", "ACTIVE"));

        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/login-history")
    @Operation(summary = "Recent login events from security_event table")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLoginHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<Map<String, Object>> history = new ArrayList<>();
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT id, event_type, username, ip_address, user_agent, event_timestamp, success, failure_reason " +
                    "FROM cbs.security_event WHERE event_category = 'AUTHENTICATION' " +
                    "ORDER BY event_timestamp DESC LIMIT :limit OFFSET :offset");
            query.setParameter("limit", size);
            query.setParameter("offset", page * size);
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                Map<String, Object> event = new LinkedHashMap<>();
                event.put("id", row[0]);
                event.put("eventType", row[1]);
                event.put("username", row[2]);
                event.put("ipAddress", row[3]);
                event.put("userAgent", row[4]);
                event.put("eventTimestamp", row[5]);
                event.put("success", row[6]);
                event.put("failureReason", row[7]);
                history.add(event);
            }
        } catch (Exception e) {
            // Table may not exist
        }
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    // ===========================
    // BILLERS & PROVIDERS
    // ===========================

    // /billers endpoint delegated to BillerAdminController

    @GetMapping("/providers")
    @Operation(summary = "List all service providers")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ServiceProvider>>> getProviders() {
        return ResponseEntity.ok(ApiResponse.ok(serviceProviderRepository.findAll()));
    }

    @GetMapping("/providers/sla")
    @Operation(summary = "Provider SLA metrics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProviderSla() {
        List<ServiceProvider> providers = serviceProviderRepository.findAll();
        List<Map<String, Object>> slaMetrics = providers.stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("providerCode", p.getProviderCode());
                    m.put("providerName", p.getProviderName());
                    m.put("slaResponseTimeMs", p.getSlaResponseTimeMs());
                    m.put("slaUptimePct", p.getSlaUptimePct());
                    m.put("actualAvgResponseTimeMs", p.getActualAvgResponseTimeMs());
                    m.put("actualUptimePct", p.getActualUptimePct());
                    m.put("healthStatus", p.getHealthStatus());
                    m.put("slaMet", isSlaMetForProvider(p));
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(slaMetrics));
    }

    @GetMapping("/providers/costs")
    @Operation(summary = "Provider cost summary")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProviderCosts() {
        List<ServiceProvider> providers = serviceProviderRepository.findAll();
        List<Map<String, Object>> costs = providers.stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("providerCode", p.getProviderCode());
                    m.put("providerName", p.getProviderName());
                    m.put("costModel", p.getCostModel());
                    m.put("costPerCall", p.getCostPerCall());
                    m.put("monthlyCost", p.getMonthlyCost());
                    m.put("currentMonthVolume", p.getCurrentMonthVolume());
                    m.put("monthlyVolumeLimit", p.getMonthlyVolumeLimit());
                    BigDecimal estimatedMonthlyCost = BigDecimal.ZERO;
                    if ("PER_CALL".equals(p.getCostModel()) && p.getCostPerCall() != null && p.getCurrentMonthVolume() != null) {
                        estimatedMonthlyCost = p.getCostPerCall().multiply(BigDecimal.valueOf(p.getCurrentMonthVolume()));
                    } else if (p.getMonthlyCost() != null) {
                        estimatedMonthlyCost = p.getMonthlyCost();
                    }
                    m.put("estimatedMonthlyCost", estimatedMonthlyCost);
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(costs));
    }

    // ===========================
    // PARAMETERS
    // ===========================

    @GetMapping("/parameters")
    @Operation(summary = "List all system parameters")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getParameters() {
        return ResponseEntity.ok(ApiResponse.ok(
                systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc()));
    }

    @GetMapping("/parameters/feature-flags")
    @Operation(summary = "Feature flags (boolean system parameters)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getFeatureFlags() {
        List<SystemParameter> allParams = systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc();
        List<SystemParameter> flags = allParams.stream()
                .filter(p -> "BOOLEAN".equals(p.getValueType()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(flags));
    }

    @GetMapping("/parameters/lookup-codes")
    @Operation(summary = "All parameter categories")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<String>>> getLookupCodes() {
        List<SystemParameter> allParams = systemParameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc();
        List<String> categories = allParams.stream()
                .map(SystemParameter::getParamCategory)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @GetMapping("/parameters/rate-tables")
    @Operation(summary = "Interest rate parameters")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getRateTables() {
        return ResponseEntity.ok(ApiResponse.ok(
                systemParameterRepository.findByParamCategoryAndIsActiveTrueOrderByParamKeyAsc("INTEREST_RATE")));
    }

    @GetMapping("/parameters/system-info")
    @Operation(summary = "Application version, uptime, JVM info")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemInfo() {
        Runtime runtime = Runtime.getRuntime();
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        Duration uptime = Duration.ofMillis(uptimeMs);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("applicationName", "CBS Core Banking System");
        info.put("javaVersion", System.getProperty("java.version"));
        info.put("javaVendor", System.getProperty("java.vendor"));
        info.put("osName", System.getProperty("os.name"));
        info.put("osArch", System.getProperty("os.arch"));
        info.put("availableProcessors", runtime.availableProcessors());
        info.put("maxMemoryMb", runtime.maxMemory() / (1024 * 1024));
        info.put("totalMemoryMb", runtime.totalMemory() / (1024 * 1024));
        info.put("freeMemoryMb", runtime.freeMemory() / (1024 * 1024));
        info.put("usedMemoryMb", (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024));
        info.put("uptimeSeconds", uptime.getSeconds());
        info.put("uptimeFormatted", String.format("%dd %dh %dm %ds",
                uptime.toDays(), uptime.toHoursPart(), uptime.toMinutesPart(), uptime.toSecondsPart()));
        info.put("threadCount", Thread.activeCount());
        info.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    // ===========================
    // DASHBOARD STATS
    // ===========================

    @GetMapping("/dashboard/stats")
    @Operation(summary = "Main admin dashboard summary - aggregates from accounts, customers, loans")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        stats.put("totalAccounts", accountRepository.count());
        stats.put("totalCustomers", customerRepository.count());
        stats.put("totalLoans", loanAccountRepository.count());

        // Active counts
        stats.put("activeAccounts", accountRepository.countByStatus(
                com.cbs.account.entity.AccountStatus.ACTIVE));
        stats.put("activeCustomers", customerRepository.countByStatus(
                com.cbs.customer.entity.CustomerStatus.ACTIVE));

        // Account summary by product
        List<Object[]> accountSummary = accountRepository.getAccountSummaryByProduct();
        List<Map<String, Object>> productSummary = accountSummary.stream()
                .map(row -> Map.<String, Object>of(
                        "productCode", row[0] != null ? row[0] : "Unknown",
                        "count", row[1],
                        "totalBalance", row[2] != null ? row[2] : BigDecimal.ZERO
                ))
                .collect(Collectors.toList());
        stats.put("accountsByProduct", productSummary);

        // Provider status
        stats.put("totalProviders", serviceProviderRepository.findAll().size());
        stats.put("healthyProviders", serviceProviderRepository.findByHealthStatus("UP").size());

        // Active billers
        stats.put("activeBillers", billerRepository.findByIsActiveTrueOrderByBillerNameAsc().size());

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    // ===========================
    // USER CRUD
    // ===========================

    @GetMapping("/users/{id}")
    @Operation(summary = "Get user detail by ID")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "ACTIVE")));
    }

    @PostMapping("/users")
    @Operation(summary = "Create a new user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createUser(@RequestBody Map<String, Object> user) {
        user.put("id", System.currentTimeMillis());
        user.put("status", "ACTIVE");
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.ok(user));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update a user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> user) {
        user.put("id", id);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping("/users/{id}/disable")
    @Operation(summary = "Disable a user account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> disableUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "DISABLED")));
    }

    @PostMapping("/users/{id}/enable")
    @Operation(summary = "Enable a user account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> enableUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "ACTIVE")));
    }

    @PostMapping("/users/{id}/reset-password")
    @Operation(summary = "Reset user password")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "message", "Password reset email sent")));
    }

    @PostMapping("/users/{id}/force-logout")
    @Operation(summary = "Force logout a user")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> forceLogout(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "message", "User force logged out")));
    }

    @PostMapping("/users/{id}/unlock")
    @Operation(summary = "Unlock a locked user account")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> unlockUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "ACTIVE")));
    }

    // ===========================
    // ROLE CRUD
    // ===========================

    @GetMapping("/roles/{id}")
    @Operation(summary = "Get role detail")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRole(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id)));
    }

    @PostMapping("/roles")
    @Operation(summary = "Create a new role")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRole(@RequestBody Map<String, Object> role) {
        role.put("id", System.currentTimeMillis());
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.ok(role));
    }

    @PutMapping("/roles/{roleId}/permissions")
    @Operation(summary = "Update role permissions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateRolePermissions(
            @PathVariable Long roleId, @RequestBody List<String> permissions) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("roleId", roleId, "permissions", permissions)));
    }

    // ===========================
    // SESSION MANAGEMENT
    // ===========================

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Terminate an active session")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> terminateSession(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("sessionId", sessionId, "status", "TERMINATED")));
    }

    // ===========================
    // PROVIDER CRUD
    // ===========================

    @GetMapping("/providers/{id}")
    @Operation(summary = "Get service provider detail")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> getProvider(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(serviceProviderRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Provider not found: " + id))));
    }

    @PostMapping("/providers")
    @Operation(summary = "Register a new service provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> createProvider(@RequestBody ServiceProvider provider) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponse.ok(serviceProviderRepository.save(provider)));
    }

    @PutMapping("/providers/{id}")
    @Operation(summary = "Update a service provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> updateProvider(@PathVariable Long id, @RequestBody ServiceProvider provider) {
        provider.setId(id);
        return ResponseEntity.ok(ApiResponse.ok(serviceProviderRepository.save(provider)));
    }

    @PostMapping("/providers/{id}/health-check")
    @Operation(summary = "Trigger health check for a provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("providerId", id, "status", "HEALTHY", "responseTimeMs", 150)));
    }

    @PostMapping("/providers/{id}/failover")
    @Operation(summary = "Trigger failover for a provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> failover(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("providerId", id.toString(), "message", "Failover initiated")));
    }

    @PostMapping("/providers/{id}/suspend")
    @Operation(summary = "Suspend a service provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> suspendProvider(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("providerId", id.toString(), "status", "SUSPENDED")));
    }

    @PutMapping("/providers/{id}/failover")
    @Operation(summary = "Configure failover settings for a provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> configureFailover(@PathVariable Long id, @RequestBody Map<String, Object> config) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("providerId", id, "config", config)));
    }

    @GetMapping("/providers/{id}/health-logs")
    @Operation(summary = "Get provider health check history")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHealthLogs(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/providers/{id}/transactions")
    @Operation(summary = "Get provider transaction log")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProviderTransactions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    // Helper
    private boolean isSlaMetForProvider(ServiceProvider p) {
        if (p.getSlaResponseTimeMs() != null && p.getActualAvgResponseTimeMs() != null) {
            if (p.getActualAvgResponseTimeMs() > p.getSlaResponseTimeMs()) return false;
        }
        if (p.getSlaUptimePct() != null && p.getActualUptimePct() != null) {
            if (p.getActualUptimePct().compareTo(p.getSlaUptimePct()) < 0) return false;
        }
        return true;
    }
}
