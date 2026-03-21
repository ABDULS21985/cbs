package com.cbs.portal.service;

import com.cbs.common.exception.BusinessException;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Keycloak Admin REST API client for identity operations that cannot be
 * performed by the user token alone (password resets, session termination).
 *
 * <p>Uses the Keycloak Admin REST API with service account client credentials.
 * Configure via {@code cbs.keycloak.admin.*} properties in application.yml.</p>
 *
 * <p>When {@code cbs.keycloak.admin.server-url} is not configured, all operations
 * throw SERVICE_UNAVAILABLE so the portal degrades gracefully.</p>
 */
@Service
@Slf4j
public class KeycloakAdminService {

    private final KeycloakAdminProperties properties;
    private final RestTemplate restTemplate;

    public KeycloakAdminService(KeycloakAdminProperties properties) {
        this.properties = properties;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Changes the password for a Keycloak user identified by their username.
     *
     * <p>Flow: obtain admin token → search users by username → reset password.</p>
     */
    public void changePassword(String username, String currentPassword, String newPassword) {
        ensureConfigured();

        String adminToken = getAdminToken();
        String userId = findKeycloakUserId(adminToken, username);

        // Keycloak Admin REST API: PUT /admin/realms/{realm}/users/{userId}/reset-password
        String url = properties.getServerUrl() + "/admin/realms/" + properties.getRealm()
                + "/users/" + userId + "/reset-password";

        Map<String, Object> credential = Map.of(
                "type", "password",
                "value", newPassword,
                "temporary", false
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(credential, headers), Void.class);
            log.info("Password changed via Keycloak for user={}", username);
        } catch (HttpClientErrorException e) {
            log.error("Keycloak password change failed for user={}: {} {}", username, e.getStatusCode(), e.getResponseBodyAsString());
            if (e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                throw new BusinessException("Password does not meet security policy requirements",
                        HttpStatus.BAD_REQUEST, "PASSWORD_POLICY_VIOLATION");
            }
            throw new BusinessException("Failed to change password via identity provider",
                    HttpStatus.INTERNAL_SERVER_ERROR, "KEYCLOAK_ERROR");
        }
    }

    /**
     * Terminates a Keycloak session by session ID.
     *
     * <p>Keycloak Admin REST API: DELETE /admin/realms/{realm}/sessions/{sessionId}</p>
     */
    public void terminateSession(String sessionId) {
        ensureConfigured();

        String adminToken = getAdminToken();

        String url = properties.getServerUrl() + "/admin/realms/" + properties.getRealm()
                + "/sessions/" + sessionId;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        try {
            restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
            log.info("Session terminated via Keycloak: sessionId={}", sessionId);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                log.warn("Keycloak session not found (may have already expired): sessionId={}", sessionId);
                return; // Session already gone — treat as success
            }
            log.error("Keycloak session termination failed: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException("Failed to terminate session via identity provider",
                    HttpStatus.INTERNAL_SERVER_ERROR, "KEYCLOAK_ERROR");
        }
    }

    /**
     * Lists active Keycloak sessions for a user.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserSessions(String username) {
        ensureConfigured();

        String adminToken = getAdminToken();
        String userId = findKeycloakUserId(adminToken, username);

        String url = properties.getServerUrl() + "/admin/realms/" + properties.getRealm()
                + "/users/" + userId + "/sessions";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        try {
            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(headers), List.class);
            return response.getBody() != null ? response.getBody() : List.of();
        } catch (Exception e) {
            log.error("Failed to get Keycloak sessions for user={}: {}", username, e.getMessage());
            return List.of();
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────

    private void ensureConfigured() {
        if (!StringUtils.hasText(properties.getServerUrl())) {
            throw new BusinessException(
                    "Identity provider (Keycloak) admin client is not configured. "
                            + "Set cbs.keycloak.admin.server-url in application.yml.",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "IDENTITY_PROVIDER_NOT_CONFIGURED");
        }
    }

    /**
     * Obtains an admin access token using client credentials grant.
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

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl,
                    new HttpEntity<>(form, headers), Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("access_token")) {
                throw new BusinessException("Failed to obtain admin token from identity provider",
                        HttpStatus.INTERNAL_SERVER_ERROR, "KEYCLOAK_TOKEN_ERROR");
            }
            return (String) body.get("access_token");
        } catch (HttpClientErrorException e) {
            log.error("Failed to obtain Keycloak admin token: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException("Failed to authenticate with identity provider",
                    HttpStatus.INTERNAL_SERVER_ERROR, "KEYCLOAK_AUTH_ERROR");
        }
    }

    /**
     * Searches for a Keycloak user by username and returns their Keycloak user ID.
     */
    @SuppressWarnings("unchecked")
    private String findKeycloakUserId(String adminToken, String username) {
        String url = properties.getServerUrl() + "/admin/realms/" + properties.getRealm()
                + "/users?username=" + username + "&exact=true";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET,
                new HttpEntity<>(headers), List.class);

        List<Map<String, Object>> users = response.getBody();
        if (users == null || users.isEmpty()) {
            throw new BusinessException("User not found in identity provider: " + username,
                    HttpStatus.NOT_FOUND, "KEYCLOAK_USER_NOT_FOUND");
        }

        return (String) users.get(0).get("id");
    }

    // ── Configuration properties ──────────────────────────────────────────

    @Configuration
    @ConfigurationProperties(prefix = "cbs.keycloak.admin")
    @Getter
    @Setter
    public static class KeycloakAdminProperties {
        /** Keycloak server URL, e.g. https://keycloak.example.com */
        private String serverUrl = "";
        /** Keycloak realm name */
        private String realm = "cbs";
        /** Service account client ID with admin privileges */
        private String clientId = "cbs-admin-cli";
        /** Service account client secret */
        private String clientSecret = "";
    }
}
