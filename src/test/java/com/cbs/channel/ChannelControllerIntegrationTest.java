package com.cbs.channel;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestSecurityConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ChannelControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

        @Autowired
        private CustomerRepository customerRepository;

        private static final String BASE = "/v1";

    // Shared state across ordered tests
    private static String channelSessionId;
    private static Long servicePointId;
    private static Long ussdMenuId;
    private static String ibSessionId;

    // -----------------------------------------------------------------------
    // OmnichannelController  /v1/channels
    // -----------------------------------------------------------------------

    @Test
    @Order(1)
    @DisplayName("POST /v1/channels/sessions - should create a new channel session")
    void createChannelSession() throws Exception {
        Long customerId = createActiveCustomer("CHANNEL-PRIMARY").getId();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channels/sessions?channel=WEB&customerId=" + customerId, null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("channel").asText()).isEqualTo("WEB");
        assertThat(json.path("data").path("customerId").asLong()).isEqualTo(customerId);
        assertThat(json.path("data").path("status").asText()).isEqualTo("ACTIVE");
        assertThat(json.path("data").path("sessionId").asText()).isNotEmpty();

        channelSessionId = json.path("data").path("sessionId").asText();
    }

    @Test
    @Order(2)
    @DisplayName("GET /v1/channels/sessions - should list active sessions")
    void listChannelSessions() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/channels/sessions", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
    }

    @Test
    @Order(3)
    @DisplayName("GET /v1/channels/sessions/active-counts - should return channel count map")
    void getActiveSessionCounts() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/channels/sessions/active-counts", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isObject()).isTrue();
    }

    @Test
    @Order(4)
    @DisplayName("POST /v1/channels/sessions/{sessionId}/touch - should update last activity")
    void touchChannelSession() throws Exception {
        assertThat(channelSessionId).as("Session must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channels/sessions/" + channelSessionId + "/touch", null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
    }

    @Test
    @Order(5)
    @DisplayName("POST /v1/channels/sessions/{sessionId}/handoff - should handoff to target channel")
    void handoffChannelSession() throws Exception {
        assertThat(channelSessionId).as("Session must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channels/sessions/" + channelSessionId + "/handoff?targetChannel=MOBILE",
                null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("channel").asText()).isEqualTo("MOBILE");
        assertThat(json.path("data").path("handoffFromChannel").asText()).isEqualTo("WEB");
        assertThat(json.path("data").path("parentSessionId").asText()).isEqualTo(channelSessionId);
    }

    @Test
    @Order(6)
    @DisplayName("POST /v1/channels/sessions/{sessionId}/end - should end the session")
    void endChannelSession() throws Exception {
        Long customerId = createActiveCustomer("CHANNEL-END").getId();

        // Create a fresh session to end (original was handed off)
        ResponseEntity<String> createResp = restTemplate.postForEntity(
                BASE + "/channels/sessions?channel=WEB&customerId=" + customerId, null, String.class);
        JsonNode createJson = objectMapper.readTree(createResp.getBody());
        String newSessionId = createJson.path("data").path("sessionId").asText();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channels/sessions/" + newSessionId + "/end", null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
    }

    @Test
    @Order(7)
    @DisplayName("POST /v1/channels/sessions/cleanup - should clean up expired sessions")
    void cleanupExpiredSessions() throws Exception {
        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channels/sessions/cleanup", null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").has("expired")).isTrue();
    }

    @Test
    @Order(8)
    @DisplayName("POST /v1/channels/config - should save channel config")
    void saveChannelConfig() throws Exception {
        Map<String, Object> body = Map.of(
                "channel", "WEB",
                "displayName", "Web Banking",
                "isEnabled", true,
                "sessionTimeoutSecs", 300,
                "maxTransferAmount", 1000000,
                "dailyLimit", 5000000,
                "isActive", true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channels/config", entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("channel").asText()).isEqualTo("WEB");
        assertThat(json.path("data").path("displayName").asText()).isEqualTo("Web Banking");
        assertThat(json.path("data").path("sessionTimeoutSecs").asInt()).isEqualTo(300);

    }

    @Test
    @Order(9)
    @DisplayName("GET /v1/channels/config - should list all channel configs")
    void listChannelConfigs() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/channels/config", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
        assertThat(json.path("data").size()).isGreaterThanOrEqualTo(1);
    }

    // -----------------------------------------------------------------------
    // ServicePointController  /v1/service-points
    // -----------------------------------------------------------------------

    @Test
    @Order(10)
    @DisplayName("POST /v1/service-points - should register a new service point")
    void registerServicePoint() throws Exception {
        Map<String, Object> body = Map.of(
                "servicePointName", "Main Branch Teller 1",
                                "servicePointType", "BRANCH_COUNTER",
                "status", "ONLINE",
                "maxConcurrentCustomers", 1,
                "avgServiceTimeMinutes", 10,
                "staffRequired", true,
                "isAccessible", true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/service-points", entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("servicePointName").asText()).isEqualTo("Main Branch Teller 1");
        assertThat(json.path("data").path("servicePointType").asText()).isEqualTo("BRANCH_COUNTER");
        assertThat(json.path("data").path("status").asText()).isEqualTo("ONLINE");

        servicePointId = json.path("data").path("id").asLong();
    }

    @Test
    @Order(11)
    @DisplayName("GET /v1/service-points - should list all service points")
    void listServicePoints() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/service-points", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
        assertThat(json.path("data").size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @Order(12)
    @DisplayName("GET /v1/service-points/{id} - should return service point by ID")
    void getServicePointById() throws Exception {
        assertThat(servicePointId).as("Service point must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/service-points/" + servicePointId, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("id").asLong()).isEqualTo(servicePointId);
        assertThat(json.path("data").path("servicePointName").asText()).isEqualTo("Main Branch Teller 1");
    }

    @Test
    @Order(13)
    @DisplayName("PUT /v1/service-points/{id} - should update service point")
    void updateServicePoint() throws Exception {
        assertThat(servicePointId).as("Service point must be created first").isNotNull();

        Map<String, Object> body = Map.of(
                "servicePointName", "Main Branch Teller 1 Updated",
                "servicePointType", "BRANCH_COUNTER",
                "status", "MAINTENANCE",
                "maxConcurrentCustomers", 2,
                "avgServiceTimeMinutes", 15,
                "staffRequired", true,
                "isAccessible", true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> response = restTemplate.exchange(
                BASE + "/service-points/" + servicePointId,
                HttpMethod.PUT, entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("servicePointName").asText()).isEqualTo("Main Branch Teller 1 Updated");
        assertThat(json.path("data").path("status").asText()).isEqualTo("MAINTENANCE");
    }

    @Test
    @Order(14)
    @DisplayName("GET /v1/service-points/status - should return status counts")
    void getServicePointStatusCounts() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/service-points/status", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isObject()).isTrue();
    }

    @Test
    @Order(15)
    @DisplayName("POST /v1/service-points/{id}/interaction/start - should start an interaction")
    void startServicePointInteraction() throws Exception {
        assertThat(servicePointId).as("Service point must be created first").isNotNull();

        // Set service point back to ONLINE so interaction can start
        Map<String, Object> updateBody = Map.of(
                "servicePointName", "Main Branch Teller 1 Updated",
                "servicePointType", "BRANCH_COUNTER",
                "status", "ONLINE",
                "maxConcurrentCustomers", 2,
                "avgServiceTimeMinutes", 15,
                "staffRequired", true,
                "isAccessible", true
        );
        HttpHeaders updateHeaders = new HttpHeaders();
        updateHeaders.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> updateEntity = new HttpEntity<>(objectMapper.writeValueAsString(updateBody), updateHeaders);
        restTemplate.exchange(BASE + "/service-points/" + servicePointId,
                HttpMethod.PUT, updateEntity, String.class);

        Map<String, Object> body = Map.of(
                "customerId", 1,
                "interactionType", "ENQUIRY",
                "channelUsed", "BRANCH",
                "staffAssisted", true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/service-points/" + servicePointId + "/interaction/start",
                entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("interactionType").asText()).isEqualTo("ENQUIRY");
        assertThat(json.path("data").path("channelUsed").asText()).isEqualTo("BRANCH");
        assertThat(json.path("data").path("staffAssisted").asBoolean()).isTrue();
    }

    @Test
    @Order(16)
    @DisplayName("POST /v1/service-points/{id}/interaction/end - should end the interaction")
    void endServicePointInteraction() throws Exception {
        assertThat(servicePointId).as("Service point must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/service-points/" + servicePointId
                        + "/interaction/end?outcome=COMPLETED&satisfactionScore=5",
                null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("outcome").asText()).isEqualTo("COMPLETED");
        assertThat(json.path("data").path("customerSatisfactionScore").asInt()).isEqualTo(5);
    }

    @Test
    @Order(17)
    @DisplayName("DELETE /v1/service-points/{id} - should delete the service point")
    void deleteServicePoint() throws Exception {
        assertThat(servicePointId).as("Service point must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.exchange(
                BASE + "/service-points/" + servicePointId,
                HttpMethod.DELETE, null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
    }

    // -----------------------------------------------------------------------
    // ChannelActivityController  /v1/channel-activity
    // -----------------------------------------------------------------------

    @Test
    @Order(18)
    @DisplayName("POST /v1/channel-activity/log - should log a channel activity")
    void logChannelActivity() throws Exception {
        Map<String, Object> body = Map.of(
                "customerId", 1,
                "channel", "WEB",
                "activityType", "LOGIN",
                "resultStatus", "SUCCESS",
                "ipAddress", "192.168.1.100",
                "responseTimeMs", 250
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channel-activity/log", entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("channel").asText()).isEqualTo("WEB");
        assertThat(json.path("data").path("activityType").asText()).isEqualTo("LOGIN");
        assertThat(json.path("data").path("resultStatus").asText()).isEqualTo("SUCCESS");
        assertThat(json.path("data").path("ipAddress").asText()).isEqualTo("192.168.1.100");

    }

    @Test
    @Order(19)
    @DisplayName("GET /v1/channel-activity/log - should list all activity logs")
    void listChannelActivityLogs() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/channel-activity/log", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
        assertThat(json.path("data").size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @Order(20)
    @DisplayName("GET /v1/channel-activity/customer/{id} - should return customer activity")
    void getCustomerActivity() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/channel-activity/customer/1", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
    }

    @Test
    @Order(21)
    @DisplayName("GET /v1/channel-activity/customer/{id}?channel=WEB - should return filtered customer activity")
    void getCustomerActivityFilteredByChannel() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/channel-activity/customer/1?channel=WEB", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();

        // All returned entries should have channel=WEB
        for (JsonNode entry : json.path("data")) {
            assertThat(entry.path("channel").asText()).isEqualTo("WEB");
        }
    }

    @Test
    @Order(22)
    @DisplayName("POST /v1/channel-activity/summarize - should create activity summary")
    void summarizeChannelActivity() throws Exception {
        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/channel-activity/summarize?customerId=1&channel=WEB&periodType=DAILY&periodDate=2026-03-22",
                null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("customerId").asLong()).isEqualTo(1L);
        assertThat(json.path("data").path("channel").asText()).isEqualTo("WEB");
        assertThat(json.path("data").path("periodType").asText()).isEqualTo("DAILY");
    }

    @Test
    @Order(23)
    @DisplayName("GET /v1/channel-activity/summarize - should list activity summaries")
    void listChannelActivitySummaries() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/channel-activity/summarize", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
        assertThat(json.path("data").size()).isGreaterThanOrEqualTo(1);
    }

    // -----------------------------------------------------------------------
    // InternetBankingController  /v1/internet-banking
    // -----------------------------------------------------------------------

    @Test
    @Order(24)
    @DisplayName("GET /v1/internet-banking/login - should return login info")
    void getInternetBankingLoginInfo() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/internet-banking/login", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("status").asText()).isEqualTo("READY");
        assertThat(json.path("data").path("methods").asText()).contains("PASSWORD");
    }

    @Test
    @Order(25)
    @DisplayName("POST /v1/internet-banking/login - should create an IB session")
    void createInternetBankingSession() throws Exception {
        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/internet-banking/login?customerId=1&loginMethod=PASSWORD",
                null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("customerId").asLong()).isEqualTo(1L);
        assertThat(json.path("data").path("loginMethod").asText()).isEqualTo("PASSWORD");
        assertThat(json.path("data").path("sessionStatus").asText()).isEqualTo("ACTIVE");
        assertThat(json.path("data").path("sessionId").asText()).isNotEmpty();

        ibSessionId = json.path("data").path("sessionId").asText();
    }

    @Test
    @Order(26)
    @DisplayName("POST /v1/internet-banking/sessions/{sessionId}/mfa-complete - should complete MFA")
    void completeMfa() throws Exception {
        assertThat(ibSessionId).as("IB session must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/internet-banking/sessions/" + ibSessionId + "/mfa-complete",
                null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("mfaCompleted").asBoolean()).isTrue();
    }

    @Test
    @Order(27)
    @DisplayName("POST /v1/internet-banking/sessions/{sessionId}/touch - should touch IB session")
    void touchInternetBankingSession() throws Exception {
        assertThat(ibSessionId).as("IB session must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/internet-banking/sessions/" + ibSessionId + "/touch",
                null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("sessionId").asText()).isEqualTo(ibSessionId);
    }

    @Test
    @Order(28)
    @DisplayName("POST /v1/internet-banking/sessions/{sessionId}/logout - should log out IB session")
    void logoutInternetBankingSession() throws Exception {
        assertThat(ibSessionId).as("IB session must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/internet-banking/sessions/" + ibSessionId + "/logout",
                null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
    }

    @Test
    @Order(29)
    @DisplayName("GET /v1/internet-banking/sessions/expire-idle - should return idle session count")
    void getExpireIdleCount() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/internet-banking/sessions/expire-idle", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").has("expired")).isTrue();
    }

    @Test
    @Order(30)
    @DisplayName("POST /v1/internet-banking/sessions/expire-idle - should expire idle sessions")
    void expireIdleSessions() throws Exception {
        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/internet-banking/sessions/expire-idle", null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").has("expired")).isTrue();
        assertThat(json.path("data").path("expired").asInt()).isGreaterThanOrEqualTo(0);
    }

    // -----------------------------------------------------------------------
    // UssdController  /v1/ussd
    // -----------------------------------------------------------------------

    @Test
    @Order(31)
    @DisplayName("POST /v1/ussd/menus - should create a USSD menu")
    void createUssdMenu() throws Exception {
        Map<String, Object> body = Map.of(
                "menuCode", "MAIN_MENU",
                "title", "Welcome to CBS Banking",
                "actionType", "MENU",
                "displayOrder", 1,
                "isActive", true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/ussd/menus", entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("menuCode").asText()).isEqualTo("MAIN_MENU");
        assertThat(json.path("data").path("title").asText()).isEqualTo("Welcome to CBS Banking");
        assertThat(json.path("data").path("actionType").asText()).isEqualTo("MENU");
        assertThat(json.path("data").path("isActive").asBoolean()).isTrue();

        ussdMenuId = json.path("data").path("id").asLong();
    }

    @Test
    @Order(32)
    @DisplayName("GET /v1/ussd/menus - should return root USSD menus")
    void getRootUssdMenus() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/ussd/menus", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
        assertThat(json.path("data").size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @Order(33)
    @DisplayName("GET /v1/ussd/menus/all - should return all USSD menus")
    void getAllUssdMenus() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(
                BASE + "/ussd/menus/all", String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").isArray()).isTrue();
        assertThat(json.path("data").size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @Order(34)
    @DisplayName("PUT /v1/ussd/menus/{id} - should update a USSD menu")
    void updateUssdMenu() throws Exception {
        assertThat(ussdMenuId).as("USSD menu must be created first").isNotNull();

        Map<String, Object> body = Map.of(
                "menuCode", "MAIN_MENU",
                "title", "CBS Banking Main Menu",
                "actionType", "MENU",
                "displayOrder", 1,
                "isActive", true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);

        ResponseEntity<String> response = restTemplate.exchange(
                BASE + "/ussd/menus/" + ussdMenuId,
                HttpMethod.PUT, entity, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data").path("title").asText()).isEqualTo("CBS Banking Main Menu");
    }

    @Test
    @Order(35)
    @DisplayName("DELETE /v1/ussd/menus/{id} - should delete a USSD menu")
    void deleteUssdMenu() throws Exception {
        assertThat(ussdMenuId).as("USSD menu must be created first").isNotNull();

        ResponseEntity<String> response = restTemplate.exchange(
                BASE + "/ussd/menus/" + ussdMenuId,
                HttpMethod.DELETE, null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
    }

    @Test
    @Order(36)
    @DisplayName("POST /v1/ussd/request - should process a USSD dial request")
    void processUssdRequest() throws Exception {
        ResponseEntity<String> response = restTemplate.postForEntity(
                BASE + "/ussd/request?msisdn=+2348012345678", null, String.class);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.path("data")).isNotNull();
    }

        private Customer createActiveCustomer(String label) {
                String suffix = label + "-" + Instant.now().toEpochMilli();
                return customerRepository.save(Customer.builder()
                                .cifNumber("CIF-" + suffix)
                                .customerType(CustomerType.INDIVIDUAL)
                                .firstName(label)
                                .lastName("Customer")
                                .email(label.toLowerCase() + "." + Instant.now().toEpochMilli() + "@example.com")
                                .phonePrimary("+234" + String.format("%010d", Math.abs(suffix.hashCode()) % 1_000_000_0000L))
                                .branchCode("BR001")
                                .nationality("NGA")
                                .countryOfResidence("NGA")
                                .createdBy("test")
                                .updatedBy("test")
                                .build());
        }
}
