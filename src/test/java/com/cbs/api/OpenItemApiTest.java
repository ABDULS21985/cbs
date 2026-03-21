package com.cbs.api;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestSecurityConfig.class)
class OpenItemApiTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static int counter = 0;

    private String uniqueCode() {
        return "OI-" + System.currentTimeMillis() + "-" + (++counter);
    }

    @Test
    @DisplayName("POST /v1/open-items - should create open item and return 201")
    void createOpenItem_returns201() throws Exception {
        String code = uniqueCode();
        ResponseEntity<String> response = postJson("/v1/open-items", String.format("""
                {
                    "itemCode": "%s",
                    "itemType": "SUSPENSE_ENTRY",
                    "itemCategory": "RECONCILIATION",
                    "description": "Unmatched inward SWIFT credit - test item",
                    "referenceNumber": "REF-2026-001",
                    "currency": "USD",
                    "amount": 15000.00,
                    "valueDate": "2026-03-18",
                    "priority": "HIGH"
                }
                """, code));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("itemCode").asText()).isEqualTo(code);
        assertThat(body.path("data").path("status").asText()).isEqualTo("OPEN");
    }

    @Test
    @DisplayName("POST /v1/open-items/{code}/resolve - should resolve item and return 200")
    void resolveOpenItem_returns200() throws Exception {
        String code = uniqueCode();
        assertThat(postJson("/v1/open-items", String.format("""
                {
                    "itemCode": "%s",
                    "itemType": "UNMATCHED_TXN",
                    "itemCategory": "CLEARING",
                    "description": "Unmatched clearing entry for resolution test",
                    "referenceNumber": "REF-2026-002",
                    "currency": "USD",
                    "amount": 5000.00,
                    "valueDate": "2026-03-18",
                    "priority": "MEDIUM"
                }
                """, code)).getStatusCode().value()).isEqualTo(201);

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/v1/open-items/{code}/resolve?action=WRITE_OFF&notes={notes}",
                null,
                String.class,
                code,
                "Resolved during integration testing"
        );

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("itemCode").asText()).isEqualTo(code);
        assertThat(body.path("data").path("resolutionAction").asText()).isEqualTo("WRITE_OFF");
    }

    @Test
    @DisplayName("GET /v1/open-items/open - should return list of open items with 200")
    void getOpenItems_returns200() throws Exception {
        String code = uniqueCode();
        assertThat(postJson("/v1/open-items", String.format("""
                {
                    "itemCode": "%s",
                    "itemType": "SUSPENSE_ENTRY",
                    "itemCategory": "NOSTRO",
                    "description": "Nostro break item for list test",
                    "referenceNumber": "REF-2026-003",
                    "currency": "USD",
                    "amount": 2500.00,
                    "valueDate": "2026-03-18",
                    "priority": "LOW"
                }
                """, code)).getStatusCode().value()).isEqualTo(201);

        ResponseEntity<String> response = restTemplate.getForEntity("/v1/open-items/open", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").isArray()).isTrue();
        assertThat(body.path("data").size()).isGreaterThanOrEqualTo(1);
    }

    private ResponseEntity<String> postJson(String path, String payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.postForEntity(path, new HttpEntity<>(payload, headers), String.class);
    }
}
