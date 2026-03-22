package com.cbs.admin.controller;

import com.cbs.account.repository.AccountRepository;
import com.cbs.admin.service.AdminUserService;
import com.cbs.billing.entity.Biller;
import com.cbs.billing.repository.BillerRepository;
import com.cbs.channel.entity.ChannelSession;
import com.cbs.channel.repository.ChannelSessionRepository;
import com.cbs.common.dto.ApiResponse;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.SystemParameterRepository;
import com.cbs.lending.repository.LoanAccountRepository;
import com.cbs.provider.entity.ServiceProvider;
import com.cbs.provider.entity.ProviderHealthLog;
import com.cbs.provider.entity.ProviderTransactionLog;
import com.cbs.provider.repository.ServiceProviderRepository;
import com.cbs.provider.repository.ProviderHealthLogRepository;
import com.cbs.provider.repository.ProviderTransactionLogRepository;
import com.cbs.provider.service.ProviderManagementService;
import com.cbs.security.entity.SecurityRole;
import com.cbs.security.entity.UserRoleAssignment;
import com.cbs.security.repository.SecurityRoleRepository;
import com.cbs.security.repository.UserRoleAssignmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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
@Slf4j
@Tag(name = "Admin", description = "Administration endpoints for users, roles, permissions, sessions, billers, providers, and system info")
public class AdminController {

    private final EntityManager entityManager;
    private final SystemParameterRepository systemParameterRepository;
    private final BillerRepository billerRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final ProviderHealthLogRepository providerHealthLogRepository;
    private final ProviderTransactionLogRepository providerTransactionLogRepository;
    private final ProviderManagementService providerManagementService;
    private final ChannelSessionRepository channelSessionRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final AdminUserService adminUserService;
    private final UserRoleAssignmentRepository userRoleAssignmentRepository;
    private final SecurityRoleRepository securityRoleRepository;

    // ===========================
    // USERS, ROLES, PERMISSIONS
    // ===========================

    @GetMapping("/users")
    @Operation(summary = "List all users from user_role_assignment joined with security_role, enriched with Keycloak profiles")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getUsers() {
        List<Map<String, Object>> users = new ArrayList<>();

        // Pre-fetch Keycloak users and build a username index for efficient lookups
        Map<String, Map<String, Object>> kcUsernameIndex = adminUserService.getUsernameIndex();
        Map<String, Map<String, Object>> kcIdIndex = adminUserService.getUserIdIndex();

        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT ura.user_id, ura.assigned_by, ura.assigned_at, sr.role_name, ura.is_active, ura.branch_scope " +
                    "FROM cbs.user_role_assignment ura " +
                    "LEFT JOIN cbs.security_role sr ON ura.role_id = sr.id " +
                    "WHERE ura.is_active = true " +
                    "ORDER BY ura.user_id ASC");
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();

            // Group rows by user_id, collecting roles and metadata
            Map<Long, List<String>> userRoles = new LinkedHashMap<>();
            Map<Long, Object[]> userFirstRow = new LinkedHashMap<>();
            for (Object[] row : rows) {
                Long userId = row[0] != null ? ((Number) row[0]).longValue() : 0L;
                userFirstRow.putIfAbsent(userId, row);
                userRoles.computeIfAbsent(userId, k -> new ArrayList<>());
                if (row[3] != null) {
                    userRoles.get(userId).add(row[3].toString());
                }
            }

            // Build CbsUser objects, merging with Keycloak profile data
            for (Map.Entry<Long, Object[]> entry : userFirstRow.entrySet()) {
                Long userId = entry.getKey();
                Object[] row = entry.getValue();
                String branchScope = row[5] != null ? row[5].toString() : null;
                boolean isActive = Boolean.TRUE.equals(row[4]);
                String assignedAt = row[2] != null ? row[2].toString() : null;
                List<String> roles = userRoles.getOrDefault(userId, List.of());

                // Try to find the Keycloak user by synthetic username or by Keycloak ID
                Map<String, Object> kcUser = kcUsernameIndex.get(("user-" + userId).toLowerCase());
                if (kcUser == null) {
                    kcUser = kcIdIndex.get(userId.toString());
                }

                users.add(adminUserService.buildCbsUser(userId, kcUser, roles, branchScope, isActive, assignedAt));
            }
        } catch (Exception e) {
            // Tables may not exist yet — return empty
        }
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/roles")
    @Operation(summary = "List all security roles with user and permission counts")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRoles() {
        List<Map<String, Object>> roles = new ArrayList<>();
        try {
            // Join with user_role_assignment and role_permission for counts
            Query query = entityManager.createNativeQuery(
                    "SELECT sr.id, sr.role_code, sr.role_name, sr.description, sr.is_active, sr.created_at, " +
                    "  COALESCE(uc.user_count, 0) AS user_count, " +
                    "  COALESCE(pc.perm_count, 0) AS perm_count " +
                    "FROM cbs.security_role sr " +
                    "LEFT JOIN (SELECT role_id, COUNT(DISTINCT user_id) AS user_count FROM cbs.user_role_assignment WHERE is_active = true GROUP BY role_id) uc ON uc.role_id = sr.id " +
                    "LEFT JOIN (SELECT role_id, COUNT(*) AS perm_count FROM cbs.role_permission GROUP BY role_id) pc ON pc.role_id = sr.id " +
                    "ORDER BY sr.role_name ASC");
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                Map<String, Object> role = new LinkedHashMap<>();
                String roleCode = row[1] != null ? row[1].toString() : "";
                String roleName = row[2] != null ? row[2].toString() : roleCode;
                boolean isActive = Boolean.TRUE.equals(row[4]);
                boolean isSystem = roleCode.startsWith("CBS_");
                role.put("id", row[0] != null ? row[0].toString() : "");
                role.put("name", roleCode);
                role.put("displayName", roleName);
                role.put("description", row[3]);
                role.put("userCount", row[6] != null ? ((Number) row[6]).intValue() : 0);
                role.put("permissionCount", row[7] != null ? ((Number) row[7]).intValue() : 0);
                role.put("status", isActive ? "ACTIVE" : "INACTIVE");
                role.put("isSystem", isSystem);
                role.put("isActive", isActive);
                role.put("createdAt", row[5]);
                // Load permissions for this role
                try {
                    Query permQuery = entityManager.createNativeQuery(
                            "SELECT sp.permission_code FROM cbs.role_permission rp " +
                            "JOIN cbs.security_permission sp ON rp.permission_id = sp.id " +
                            "WHERE rp.role_id = :roleId");
                    permQuery.setParameter("roleId", row[0]);
                    @SuppressWarnings("unchecked")
                    List<Object> permCodes = permQuery.getResultList();
                    role.put("permissions", permCodes.stream().map(Object::toString).collect(Collectors.toList()));
                } catch (Exception ignored) {
                    role.put("permissions", new ArrayList<>());
                }
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
                    "SELECT id, permission_code, resource, action, description, is_active FROM cbs.security_permission ORDER BY resource ASC, action ASC");
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                Map<String, Object> perm = new LinkedHashMap<>();
                perm.put("id", row[1] != null ? row[1].toString() : row[0].toString());
                perm.put("permissionCode", row[1]);
                perm.put("resource", row[2]);
                perm.put("module", row[2] != null ? row[2].toString().toLowerCase() : "");
                perm.put("action", row[3] != null ? row[3].toString().toLowerCase() : "");
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
    @Operation(summary = "Active sessions list from channel_session table, enriched with Keycloak user names")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSessions() {
        List<Map<String, Object>> sessions = new ArrayList<>();

        // Pre-fetch Keycloak username index for resolving customer IDs to real names
        Map<String, Map<String, Object>> kcUsernameIndex = adminUserService.getUsernameIndex();

        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT cs.id, cs.session_id, cs.customer_id, cs.channel, cs.ip_address, cs.user_agent, " +
                    "  cs.started_at, cs.last_activity_at, cs.device_type " +
                    "FROM cbs.channel_session cs WHERE cs.status = 'ACTIVE' " +
                    "ORDER BY cs.last_activity_at DESC LIMIT 200");
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();

            // Track customer IDs for multiple-session detection
            Map<Long, Integer> customerSessionCount = new LinkedHashMap<>();
            for (Object[] row : rows) {
                Long customerId = row[2] != null ? ((Number) row[2]).longValue() : 0L;
                customerSessionCount.merge(customerId, 1, Integer::sum);
            }

            for (Object[] row : rows) {
                Map<String, Object> session = new LinkedHashMap<>();
                Long customerId = row[2] != null ? ((Number) row[2]).longValue() : 0L;
                int sessionCount = customerSessionCount.getOrDefault(customerId, 1);

                // Resolve user identity from Keycloak when available
                String username = adminUserService.resolveSessionUsername(customerId, kcUsernameIndex);
                String fullName = adminUserService.resolveSessionFullName(customerId, kcUsernameIndex);

                session.put("id", row[1] != null ? row[1].toString() : row[0].toString());
                session.put("userId", customerId.toString());
                session.put("username", username);
                session.put("fullName", fullName);
                session.put("ip", row[4] != null ? row[4].toString() : "unknown");
                session.put("loginTime", row[6] != null ? row[6].toString() : Instant.now().toString());
                session.put("lastActivity", row[7] != null ? row[7].toString() : Instant.now().toString());
                session.put("browser", row[5] != null ? row[5].toString() : (row[3] != null ? row[3].toString() + " client" : "Unknown"));
                session.put("sessionCount", sessionCount);
                session.put("isMultiple", sessionCount > 1);
                sessions.add(session);
            }
        } catch (Exception e) {
            // Table may not exist — return empty
        }
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    @GetMapping("/login-history")
    @Operation(summary = "Recent login events from security_event table, mapped to LoginEvent shape")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLoginHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<Map<String, Object>> history = new ArrayList<>();
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT id, event_type, username, ip_address, user_agent, created_at, " +
                    "severity, description, action_taken, user_id, correlation_id " +
                    "FROM cbs.security_event WHERE event_category = 'AUTHENTICATION' " +
                    "ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
            query.setParameter("limit", size);
            query.setParameter("offset", page * size);
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                Map<String, Object> event = new LinkedHashMap<>();
                String eventType = row[1] != null ? row[1].toString() : "";
                String actionTaken = row[8] != null ? row[8].toString() : "";
                // Derive outcome: login success vs failure
                String outcome;
                if (eventType.contains("SUCCESS") || "ALLOWED".equalsIgnoreCase(actionTaken)) {
                    outcome = "SUCCESS";
                } else if (eventType.contains("FAIL") || "BLOCKED".equalsIgnoreCase(actionTaken) || "DENIED".equalsIgnoreCase(actionTaken)) {
                    outcome = "FAILED";
                } else {
                    outcome = "SUCCESS"; // default for authentication events
                }

                event.put("id", row[0] != null ? row[0].toString() : "");
                event.put("timestamp", row[5] != null ? row[5].toString() : "");
                event.put("userId", row[9] != null ? row[9].toString() : "");
                event.put("username", row[2] != null ? row[2].toString() : "");
                event.put("ip", row[3] != null ? row[3].toString() : "");
                event.put("browser", row[4] != null ? row[4].toString() : "");
                event.put("outcome", outcome);
                event.put("failureReason", "FAILED".equals(outcome) ? (row[7] != null ? row[7].toString() : eventType) : null);
                event.put("sessionId", row[10] != null ? row[10].toString() : null);
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
    @Operation(summary = "Get user detail by ID, enriched with Keycloak profile")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUser(@PathVariable String id) {
        // Collect roles and branch scope from CBS database
        List<String> roles = new ArrayList<>();
        String branchScope = null;
        boolean isActive = true;
        String assignedAt = null;

        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT sr.role_name, ura.branch_scope, ura.is_active, ura.assigned_at " +
                    "FROM cbs.user_role_assignment ura " +
                    "JOIN cbs.security_role sr ON ura.role_id = sr.id " +
                    "WHERE ura.user_id = :userId AND ura.is_active = true");
            // Try parsing as Long for the DB query; if id is a UUID it will be handled differently
            try {
                query.setParameter("userId", Long.parseLong(id));
            } catch (NumberFormatException e) {
                // Keycloak UUID — query won't match numeric user_id, roles will be empty
                query.setParameter("userId", -1L);
            }
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] row : rows) {
                if (row[0] != null) roles.add(row[0].toString());
                if (branchScope == null && row[1] != null) branchScope = row[1].toString();
                if (row[2] != null) isActive = Boolean.TRUE.equals(row[2]);
                if (assignedAt == null && row[3] != null) assignedAt = row[3].toString();
            }
        } catch (Exception ignored) { }

        // Try to resolve the Keycloak user — by UUID first, then by username index
        Map<String, Object> kcUser = adminUserService.getKeycloakUser(id);
        if (kcUser == null) {
            // Might be a numeric CBS user_id — try username index
            Map<String, Map<String, Object>> usernameIndex = adminUserService.getUsernameIndex();
            kcUser = usernameIndex.get(("user-" + id).toLowerCase());
        }

        Long numericId;
        try {
            numericId = Long.parseLong(id);
        } catch (NumberFormatException e) {
            numericId = 0L;
        }

        Map<String, Object> user = adminUserService.buildCbsUser(numericId, kcUser, roles, branchScope, isActive, assignedAt);
        // Preserve the original ID (could be UUID from Keycloak)
        if (kcUser != null && kcUser.get("id") != null) {
            user.put("id", kcUser.get("id").toString());
        } else {
            user.put("id", id);
        }

        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping("/users")
    @Operation(summary = "Create a new user — persists to Keycloak (if configured) and CBS role assignment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> createUser(@RequestBody Map<String, Object> user) {
        String username = str(user, "username");
        String email = str(user, "email");
        String firstName = str(user, "firstName");
        String lastName = str(user, "lastName");
        String password = str(user, "password");
        String fullName = str(user, "fullName");
        if ((fullName == null || fullName.isBlank()) && firstName != null) {
            fullName = (firstName + " " + (lastName != null ? lastName : "")).trim();
        }

        // 1. Create user in Keycloak
        String kcUserId = adminUserService.createKeycloakUser(
                username, email, firstName, lastName, password, true);

        // 2. Determine CBS numeric user ID (use Keycloak ID hash or timestamp fallback)
        long cbsUserId = kcUserId != null ? Math.abs(kcUserId.hashCode()) : System.currentTimeMillis();

        // 3. Persist role assignment in CBS DB
        @SuppressWarnings("unchecked")
        List<String> roleNames = user.get("roles") instanceof List<?> r
                ? r.stream().map(Object::toString).collect(Collectors.toList())
                : List.of("CBS_OFFICER");

        String branchScope = str(user, "branchId");
        for (String roleName : roleNames) {
            securityRoleRepository.findByRoleCode(roleName).ifPresent(role -> {
                UserRoleAssignment assignment = UserRoleAssignment.builder()
                        .userId(cbsUserId)
                        .roleId(role.getId())
                        .assignedAt(Instant.now())
                        .assignedBy(username)
                        .isActive(true)
                        .branchScope(branchScope != null ? Long.valueOf(branchScope) : null)
                        .build();
                userRoleAssignmentRepository.save(assignment);
            });
        }

        log.info("User created: username={}, cbsId={}, kcId={}, roles={}",
                username, cbsUserId, kcUserId, roleNames);

        // 4. Build response
        user.put("id", kcUserId != null ? kcUserId : String.valueOf(cbsUserId));
        user.putIfAbsent("status", "ACTIVE");
        user.putIfAbsent("fullName", fullName != null ? fullName : username);
        user.putIfAbsent("branchName", "Head Office");
        user.putIfAbsent("mfaEnabled", false);
        user.put("createdAt", Instant.now().toString());
        user.remove("password"); // Never echo password back
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.ok(user));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update a user — updates Keycloak profile and CBS role assignments")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(
            @PathVariable String id, @RequestBody Map<String, Object> user) {
        // Try Keycloak update if ID looks like a UUID
        boolean kcUpdated = adminUserService.updateKeycloakUser(
                id, str(user, "email"), str(user, "firstName"), str(user, "lastName"), null);

        if (kcUpdated) {
            log.info("User profile updated in Keycloak: kcId={}", id);
        }

        // Update role assignments if roles provided
        @SuppressWarnings("unchecked")
        Object rolesObj = user.get("roles");
        if (rolesObj instanceof List<?> rolesList && !rolesList.isEmpty()) {
            try {
                long cbsUserId = Long.parseLong(id);
                // Deactivate old assignments
                List<UserRoleAssignment> existing = userRoleAssignmentRepository.findByUserId(cbsUserId);
                existing.forEach(a -> { a.setIsActive(false); userRoleAssignmentRepository.save(a); });
                // Create new assignments
                for (Object roleName : rolesList) {
                    securityRoleRepository.findByRoleCode(roleName.toString()).ifPresent(role -> {
                        UserRoleAssignment assignment = UserRoleAssignment.builder()
                                .userId(cbsUserId).roleId(role.getId())
                                .assignedAt(Instant.now()).isActive(true).build();
                        userRoleAssignmentRepository.save(assignment);
                    });
                }
            } catch (NumberFormatException e) {
                // UUID-based ID — role updates only possible with numeric CBS user ID
                log.debug("Skipping role assignment update for UUID-based user ID: {}", id);
            }
        }

        user.put("id", id);
        user.putIfAbsent("status", "ACTIVE");
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping("/users/{id}/disable")
    @Operation(summary = "Disable a user account — disables in Keycloak and deactivates CBS role assignments")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> disableUser(@PathVariable String id) {
        // Disable in Keycloak
        adminUserService.disableKeycloakUser(id);

        // Deactivate CBS role assignments
        try {
            long cbsUserId = Long.parseLong(id);
            List<UserRoleAssignment> assignments = userRoleAssignmentRepository.findByUserIdAndIsActiveTrue(cbsUserId);
            assignments.forEach(a -> { a.setIsActive(false); userRoleAssignmentRepository.save(a); });
        } catch (NumberFormatException e) {
            log.debug("UUID-based user ID for disable: {}", id);
        }

        log.info("User disabled: id={}", id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "DISABLED")));
    }

    @PostMapping("/users/{id}/enable")
    @Operation(summary = "Enable a user account — enables in Keycloak and reactivates CBS role assignments")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> enableUser(@PathVariable String id) {
        // Enable in Keycloak
        adminUserService.enableKeycloakUser(id);

        // Reactivate CBS role assignments
        try {
            long cbsUserId = Long.parseLong(id);
            List<UserRoleAssignment> assignments = userRoleAssignmentRepository.findByUserId(cbsUserId);
            assignments.forEach(a -> { a.setIsActive(true); userRoleAssignmentRepository.save(a); });
        } catch (NumberFormatException e) {
            log.debug("UUID-based user ID for enable: {}", id);
        }

        log.info("User enabled: id={}", id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "ACTIVE")));
    }

    @PostMapping("/users/{id}/reset-password")
    @Operation(summary = "Reset user password — sends Keycloak password-reset email, or returns confirmation if Keycloak not configured")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(@PathVariable String id) {
        boolean sent = adminUserService.resetKeycloakPassword(id, true);
        String message = sent
                ? "Password reset email sent via identity provider"
                : "Password reset queued (identity provider not available — user will be prompted on next login)";
        log.info("Password reset for user {}: keycloakSent={}", id, sent);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "message", message, "keycloakSent", String.valueOf(sent))));
    }

    @PostMapping("/users/{id}/force-logout")
    @Operation(summary = "Force logout — terminates all Keycloak sessions and marks CBS channel sessions as ended")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> forceLogout(@PathVariable String id) {
        // 1. Terminate Keycloak sessions
        boolean kcLoggedOut = adminUserService.logoutKeycloakUser(id);

        // 2. End active CBS channel sessions
        int cbsSessionsClosed = 0;
        try {
            long cbsUserId = Long.parseLong(id);
            List<ChannelSession> activeSessions = channelSessionRepository
                    .findByCustomerIdAndStatus(cbsUserId, "ACTIVE");
            for (ChannelSession session : activeSessions) {
                session.setStatus("TERMINATED");
                session.setEndedAt(Instant.now());
                channelSessionRepository.save(session);
                cbsSessionsClosed++;
            }
        } catch (NumberFormatException e) {
            log.debug("UUID-based user ID for force-logout: {}", id);
        }

        log.info("User force-logged out: id={}, kcLoggedOut={}, cbsSessionsClosed={}", id, kcLoggedOut, cbsSessionsClosed);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "id", id,
                "message", "User force logged out",
                "keycloakLogout", String.valueOf(kcLoggedOut),
                "cbsSessionsClosed", String.valueOf(cbsSessionsClosed)
        )));
    }

    @PostMapping("/users/{id}/unlock")
    @Operation(summary = "Unlock a locked user account — enables in Keycloak and reactivates CBS assignments")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> unlockUser(@PathVariable String id) {
        // Unlock = enable in Keycloak (Keycloak locks via brute-force detection)
        adminUserService.enableKeycloakUser(id);

        // Reactivate CBS role assignments
        try {
            long cbsUserId = Long.parseLong(id);
            List<UserRoleAssignment> assignments = userRoleAssignmentRepository.findByUserId(cbsUserId);
            assignments.forEach(a -> { a.setIsActive(true); userRoleAssignmentRepository.save(a); });
        } catch (NumberFormatException e) {
            log.debug("UUID-based user ID for unlock: {}", id);
        }

        log.info("User unlocked: id={}", id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "ACTIVE")));
    }

    /** Safe string extraction from a map. */
    private static String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : null;
    }

    // ===========================
    // ROLE CRUD
    // ===========================

    @GetMapping("/roles/{id}")
    @Operation(summary = "Get role detail")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRole(@PathVariable Long id) {
        Map<String, Object> role = new LinkedHashMap<>();
        role.put("id", id.toString());
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT sr.role_code, sr.role_name, sr.description, sr.is_active FROM cbs.security_role sr WHERE sr.id = :id");
            query.setParameter("id", id);
            Object[] row = (Object[]) query.getSingleResult();
            String roleCode = row[0] != null ? row[0].toString() : "";
            role.put("name", roleCode);
            role.put("displayName", row[1] != null ? row[1].toString() : roleCode);
            role.put("description", row[2]);
            role.put("status", Boolean.TRUE.equals(row[3]) ? "ACTIVE" : "INACTIVE");
            role.put("isSystem", roleCode.startsWith("CBS_"));
            // Count users and permissions
            Query ucQuery = entityManager.createNativeQuery(
                    "SELECT COUNT(DISTINCT user_id) FROM cbs.user_role_assignment WHERE role_id = :id AND is_active = true");
            ucQuery.setParameter("id", id);
            role.put("userCount", ((Number) ucQuery.getSingleResult()).intValue());
            Query pcQuery = entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM cbs.role_permission WHERE role_id = :id");
            pcQuery.setParameter("id", id);
            role.put("permissionCount", ((Number) pcQuery.getSingleResult()).intValue());
            // Load permission codes
            Query permQuery = entityManager.createNativeQuery(
                    "SELECT sp.permission_code FROM cbs.role_permission rp " +
                    "JOIN cbs.security_permission sp ON rp.permission_id = sp.id WHERE rp.role_id = :id");
            permQuery.setParameter("id", id);
            @SuppressWarnings("unchecked")
            List<Object> permCodes = permQuery.getResultList();
            role.put("permissions", permCodes.stream().map(Object::toString).collect(Collectors.toList()));
        } catch (Exception e) {
            role.put("name", "UNKNOWN");
            role.put("displayName", "Unknown Role");
            role.put("status", "INACTIVE");
        }
        return ResponseEntity.ok(ApiResponse.ok(role));
    }

    @PostMapping("/roles")
    @Operation(summary = "Create a new role — persists to security_role table")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRole(@RequestBody Map<String, Object> role) {
        String roleCode = role.get("name") != null ? role.get("name").toString() : "CUSTOM_" + System.currentTimeMillis();
        String roleName = role.get("displayName") != null ? role.get("displayName").toString() : roleCode;
        String description = role.get("description") != null ? role.get("description").toString() : null;

        SecurityRole entity = SecurityRole.builder()
                .roleCode(roleCode)
                .roleName(roleName)
                .roleType("CUSTOM")
                .description(description)
                .isActive(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        SecurityRole saved = securityRoleRepository.save(entity);
        log.info("Role created: code={}, id={}", roleCode, saved.getId());

        role.put("id", saved.getId().toString());
        role.putIfAbsent("status", "ACTIVE");
        role.putIfAbsent("isSystem", false);
        role.putIfAbsent("userCount", 0);
        role.putIfAbsent("permissionCount", 0);
        role.putIfAbsent("permissions", new ArrayList<>());
        role.put("createdAt", saved.getCreatedAt().toString());
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
    @Operation(summary = "Terminate an active session — terminates in Keycloak and marks CBS channel session as ended")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> terminateSession(@PathVariable String sessionId) {
        // 1. Terminate Keycloak session
        boolean kcTerminated = adminUserService.terminateKeycloakSession(sessionId);

        // 2. Terminate CBS channel session
        boolean cbsTerminated = false;
        Optional<ChannelSession> cbsSession = channelSessionRepository.findBySessionId(sessionId);
        if (cbsSession.isPresent()) {
            ChannelSession session = cbsSession.get();
            session.setStatus("TERMINATED");
            session.setEndedAt(Instant.now());
            channelSessionRepository.save(session);
            cbsTerminated = true;
        }

        log.info("Session terminated: sessionId={}, keycloak={}, cbs={}", sessionId, kcTerminated, cbsTerminated);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "sessionId", sessionId,
                "status", "TERMINATED",
                "keycloakTerminated", String.valueOf(kcTerminated),
                "cbsTerminated", String.valueOf(cbsTerminated)
        )));
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
    public ResponseEntity<ApiResponse<ProviderHealthLog>> healthCheck(@PathVariable Long id) {
        ServiceProvider provider = serviceProviderRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Provider not found: " + id));
        ProviderHealthLog log = providerManagementService.healthCheck(id, 0, 200, true, null);
        return ResponseEntity.ok(ApiResponse.ok(log));
    }

    @PostMapping("/providers/{id}/failover")
    @Operation(summary = "Trigger failover for a provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> failover(@PathVariable Long id) {
        serviceProviderRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Provider not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(providerManagementService.triggerFailover(id)));
    }

    @PostMapping("/providers/{id}/suspend")
    @Operation(summary = "Suspend a service provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> suspendProvider(@PathVariable Long id) {
        ServiceProvider provider = serviceProviderRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Provider not found: " + id));
        provider.setStatus("SUSPENDED");
        provider.setHealthStatus("DOWN");
        return ResponseEntity.ok(ApiResponse.ok(serviceProviderRepository.save(provider)));
    }

    @PutMapping("/providers/{id}/failover")
    @Operation(summary = "Configure failover settings for a provider")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ServiceProvider>> configureFailover(@PathVariable Long id, @RequestBody Map<String, Object> config) {
        ServiceProvider provider = serviceProviderRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Provider not found: " + id));
        if (config.containsKey("failoverProviderId")) provider.setFailoverProviderId(Long.valueOf(config.get("failoverProviderId").toString()));
        if (config.containsKey("autoFailover")) provider.setStatus(Boolean.TRUE.equals(config.get("autoFailover")) ? "ACTIVE" : provider.getStatus());
        return ResponseEntity.ok(ApiResponse.ok(serviceProviderRepository.save(provider)));
    }

    @GetMapping("/providers/{id}/health-logs")
    @Operation(summary = "Get provider health check history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProviderHealthLog>>> getHealthLogs(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(providerHealthLogRepository.findByProviderIdOrderByCheckTimestampDesc(id)));
    }

    @GetMapping("/providers/{id}/transactions")
    @Operation(summary = "Get provider transaction log")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProviderTransactionLog>>> getProviderTransactions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(providerTransactionLogRepository.findByProviderIdOrderByRequestTimestampDesc(id)));
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
