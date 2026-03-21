package com.cbs.admin.service;

import com.cbs.portal.service.KeycloakAdminService.KeycloakAdminProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service that resolves user profile data from Keycloak Admin REST API
 * and merges it with CBS role assignment data.
 *
 * <p>Uses the same configuration properties ({@code cbs.keycloak.admin.*}) as
 * {@link com.cbs.portal.service.KeycloakAdminService}. When Keycloak is not
 * configured, all methods degrade gracefully by returning synthetic placeholder data.</p>
 *
 * <p>User list results are cached briefly (60 seconds) to avoid excessive API calls.</p>
 */
@Service
@Slf4j
public class AdminUserService {

    private final KeycloakAdminProperties properties;
    private final RestTemplate restTemplate;

    /** Simple in-memory cache for the Keycloak user list. */
    private volatile List<Map<String, Object>> cachedUsers = null;
    private volatile long cacheTimestamp = 0L;
    private static final long CACHE_TTL_MS = 60_000; // 60 seconds

    /** Cache for individual user lookups by Keycloak user ID. */
    private final ConcurrentHashMap<String, Map<String, Object>> userByIdCache = new ConcurrentHashMap<>();

    public AdminUserService(KeycloakAdminProperties properties) {
        this.properties = properties;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Returns true if Keycloak admin is configured and available.
     */
    public boolean isKeycloakConfigured() {
        return StringUtils.hasText(properties.getServerUrl());
    }

    /**
     * Fetches all users from Keycloak (up to 500). Results are cached for 60 seconds.
     *
     * @return list of Keycloak user representations, or empty list if not configured
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getKeycloakUsers() {
        if (!isKeycloakConfigured()) {
            return List.of();
        }

        // Check cache
        long now = System.currentTimeMillis();
        if (cachedUsers != null && (now - cacheTimestamp) < CACHE_TTL_MS) {
            return cachedUsers;
        }

        try {
            String adminToken = getAdminToken();
            String url = properties.getServerUrl() + "/admin/realms/" + properties.getRealm()
                    + "/users?max=500";

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);

            ResponseEntity<List> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), List.class);

            List<Map<String, Object>> users = response.getBody() != null
                    ? response.getBody() : List.of();

            // Update cache
            cachedUsers = users;
            cacheTimestamp = System.currentTimeMillis();

            // Also populate individual user cache
            userByIdCache.clear();
            for (Map<String, Object> user : users) {
                String id = (String) user.get("id");
                if (id != null) {
                    userByIdCache.put(id, user);
                }
            }

            log.debug("Fetched {} users from Keycloak", users.size());
            return users;
        } catch (Exception e) {
            log.warn("Failed to fetch users from Keycloak: {}", e.getMessage());
            return cachedUsers != null ? cachedUsers : List.of();
        }
    }

    /**
     * Fetches a single user from Keycloak by their Keycloak user ID (UUID).
     *
     * @param userId the Keycloak user UUID
     * @return the Keycloak user representation, or null if not found
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getKeycloakUser(String userId) {
        if (!isKeycloakConfigured() || userId == null) {
            return null;
        }

        // Check individual cache first
        Map<String, Object> cached = userByIdCache.get(userId);
        if (cached != null) {
            return cached;
        }

        try {
            String adminToken = getAdminToken();
            String url = properties.getServerUrl() + "/admin/realms/" + properties.getRealm()
                    + "/users/" + userId;

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

            Map<String, Object> user = response.getBody();
            if (user != null) {
                userByIdCache.put(userId, user);
            }
            return user;
        } catch (Exception e) {
            log.warn("Failed to fetch Keycloak user {}: {}", userId, e.getMessage());
            return null;
        }
    }

    /**
     * Fetches active sessions from all users in the realm.
     *
     * @return list of Keycloak session representations
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRealmSessions() {
        if (!isKeycloakConfigured()) {
            return List.of();
        }

        try {
            String adminToken = getAdminToken();
            // Get client sessions for the realm — list all client session stats first
            String url = properties.getServerUrl() + "/admin/realms/" + properties.getRealm()
                    + "/client-session-stats";

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(adminToken);

            ResponseEntity<List> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), List.class);

            return response.getBody() != null ? response.getBody() : List.of();
        } catch (Exception e) {
            log.warn("Failed to fetch realm sessions from Keycloak: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Builds a username-to-Keycloak-user lookup map from the cached user list.
     * Keys are lowercased usernames.
     */
    public Map<String, Map<String, Object>> getUsernameIndex() {
        List<Map<String, Object>> kcUsers = getKeycloakUsers();
        Map<String, Map<String, Object>> index = new HashMap<>();
        for (Map<String, Object> kcUser : kcUsers) {
            String username = (String) kcUser.get("username");
            if (username != null) {
                index.put(username.toLowerCase(), kcUser);
            }
        }
        return index;
    }

    /**
     * Builds a Keycloak user ID to user lookup map.
     */
    public Map<String, Map<String, Object>> getUserIdIndex() {
        List<Map<String, Object>> kcUsers = getKeycloakUsers();
        Map<String, Map<String, Object>> index = new HashMap<>();
        for (Map<String, Object> kcUser : kcUsers) {
            String id = (String) kcUser.get("id");
            if (id != null) {
                index.put(id, kcUser);
            }
        }
        return index;
    }

    /**
     * Merges a CBS role-assignment row with Keycloak profile data to produce
     * the CbsUser shape the frontend expects.
     *
     * @param userId       the CBS user_id from user_role_assignment
     * @param kcUser       the Keycloak user representation (may be null)
     * @param roles        assigned role names
     * @param branchScope  branch scope from role assignment
     * @param isActive     whether the role assignment is active
     * @param assignedAt   when the role was assigned
     * @return a map in CbsUser shape
     */
    public Map<String, Object> buildCbsUser(Long userId, Map<String, Object> kcUser,
                                             List<String> roles, String branchScope,
                                             boolean isActive, String assignedAt) {
        Map<String, Object> user = new LinkedHashMap<>();

        if (kcUser != null) {
            // Use real Keycloak profile data
            String kcId = (String) kcUser.get("id");
            String username = (String) kcUser.get("username");
            String firstName = kcUser.get("firstName") != null ? kcUser.get("firstName").toString() : "";
            String lastName = kcUser.get("lastName") != null ? kcUser.get("lastName").toString() : "";
            String fullName = (firstName + " " + lastName).trim();
            if (fullName.isEmpty()) {
                fullName = username != null ? username : "User " + userId;
            }
            String email = (String) kcUser.get("email");
            Boolean enabled = (Boolean) kcUser.get("enabled");
            Boolean emailVerified = (Boolean) kcUser.get("emailVerified");
            Object createdTimestamp = kcUser.get("createdTimestamp");

            user.put("id", kcId != null ? kcId : userId.toString());
            user.put("username", username != null ? username : "user-" + userId);
            user.put("fullName", fullName);
            user.put("email", email);
            user.put("phone", extractAttribute(kcUser, "phone"));
            user.put("roles", roles != null ? roles : new ArrayList<>());
            user.put("branchId", branchScope != null ? branchScope : extractAttributeOrDefault(kcUser, "branchId", "HQ"));
            user.put("branchName", extractAttributeOrDefault(kcUser, "branchName", branchScope != null ? branchScope : "Head Office"));
            user.put("department", extractAttributeOrDefault(kcUser, "department", "Operations"));
            user.put("reportingTo", extractAttribute(kcUser, "reportingTo"));
            user.put("status", deriveStatus(enabled, isActive));
            user.put("lastLogin", extractAttribute(kcUser, "lastLogin"));
            user.put("createdAt", createdTimestamp != null
                    ? Instant.ofEpochMilli(((Number) createdTimestamp).longValue()).toString()
                    : assignedAt);
            user.put("mfaEnabled", extractBooleanAttribute(kcUser, "mfaEnabled"));
            user.put("emailVerified", emailVerified);
            user.put("ipRestriction", extractAttribute(kcUser, "ipRestriction"));
            user.put("loginHoursFrom", extractAttribute(kcUser, "loginHoursFrom"));
            user.put("loginHoursTo", extractAttribute(kcUser, "loginHoursTo"));
        } else {
            // Fallback: synthetic data when Keycloak is not available
            user.put("id", userId.toString());
            user.put("username", "user-" + userId);
            user.put("fullName", "User " + userId);
            user.put("email", "user-" + userId + "@cbs.local");
            user.put("phone", null);
            user.put("roles", roles != null ? roles : new ArrayList<>());
            user.put("branchId", branchScope != null ? branchScope : "HQ");
            user.put("branchName", branchScope != null ? branchScope : "Head Office");
            user.put("department", "Operations");
            user.put("reportingTo", null);
            user.put("status", isActive ? "ACTIVE" : "DISABLED");
            user.put("lastLogin", null);
            user.put("createdAt", assignedAt);
            user.put("mfaEnabled", false);
            user.put("ipRestriction", null);
            user.put("loginHoursFrom", null);
            user.put("loginHoursTo", null);
        }

        return user;
    }

    /**
     * Resolves a session's customer ID to a display name using the Keycloak user index.
     * Falls back to "user-{customerId}" when not found.
     */
    public String resolveSessionUsername(Long customerId, Map<String, Map<String, Object>> usernameIndex) {
        if (customerId == null) return "unknown";

        // Try matching by a "user-{id}" pattern or iterate to find by custom attribute
        String syntheticUsername = "user-" + customerId;
        Map<String, Object> kcUser = usernameIndex.get(syntheticUsername.toLowerCase());
        if (kcUser != null) {
            return kcUser.get("username") != null ? kcUser.get("username").toString() : syntheticUsername;
        }

        // Try looking up in all users by checking for a matching custom attribute (e.g., cbsUserId)
        for (Map<String, Object> user : usernameIndex.values()) {
            String cbsId = extractAttribute(user, "cbsUserId");
            if (cbsId != null && cbsId.equals(customerId.toString())) {
                return user.get("username") != null ? user.get("username").toString() : syntheticUsername;
            }
        }

        return syntheticUsername;
    }

    /**
     * Resolves a customer ID to a full name from Keycloak.
     */
    public String resolveSessionFullName(Long customerId, Map<String, Map<String, Object>> usernameIndex) {
        if (customerId == null) return "Unknown";

        String syntheticUsername = "user-" + customerId;
        Map<String, Object> kcUser = usernameIndex.get(syntheticUsername.toLowerCase());
        if (kcUser != null) {
            return buildFullName(kcUser);
        }

        for (Map<String, Object> user : usernameIndex.values()) {
            String cbsId = extractAttribute(user, "cbsUserId");
            if (cbsId != null && cbsId.equals(customerId.toString())) {
                return buildFullName(user);
            }
        }

        return "User " + customerId;
    }

    // ── Internal helpers ──────────────────────────────────────────────────

    private String buildFullName(Map<String, Object> kcUser) {
        String firstName = kcUser.get("firstName") != null ? kcUser.get("firstName").toString() : "";
        String lastName = kcUser.get("lastName") != null ? kcUser.get("lastName").toString() : "";
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isEmpty()
                ? (kcUser.get("username") != null ? kcUser.get("username").toString() : "Unknown")
                : fullName;
    }

    private String deriveStatus(Boolean kcEnabled, boolean roleActive) {
        if (kcEnabled != null && !kcEnabled) return "DISABLED";
        return roleActive ? "ACTIVE" : "DISABLED";
    }

    /**
     * Extracts a custom attribute value from Keycloak user's {@code attributes} map.
     * Keycloak stores custom attributes as {@code Map<String, List<String>>}.
     */
    @SuppressWarnings("unchecked")
    private String extractAttribute(Map<String, Object> kcUser, String attributeName) {
        if (kcUser == null) return null;
        Map<String, List<String>> attributes = (Map<String, List<String>>) kcUser.get("attributes");
        if (attributes == null) return null;
        List<String> values = attributes.get(attributeName);
        return (values != null && !values.isEmpty()) ? values.get(0) : null;
    }

    private String extractAttributeOrDefault(Map<String, Object> kcUser, String attributeName, String defaultValue) {
        String value = extractAttribute(kcUser, attributeName);
        return value != null ? value : defaultValue;
    }

    private boolean extractBooleanAttribute(Map<String, Object> kcUser, String attributeName) {
        String value = extractAttribute(kcUser, attributeName);
        return "true".equalsIgnoreCase(value);
    }

    /**
     * Obtains an admin access token using client credentials grant.
     * Follows the same pattern as {@link com.cbs.portal.service.KeycloakAdminService}.
     */
    @SuppressWarnings("unchecked")
    private String getAdminToken() {
        String tokenUrl = properties.getServerUrl() + "/realms/" + properties.getRealm()
                + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());

        ResponseEntity<Map> response = restTemplate.postForEntity(
                tokenUrl, new HttpEntity<>(form, headers), Map.class);

        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("access_token")) {
            throw new IllegalStateException("Failed to obtain admin token from Keycloak");
        }
        return (String) body.get("access_token");
    }
}
