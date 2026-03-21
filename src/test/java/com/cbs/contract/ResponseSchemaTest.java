package com.cbs.contract;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestSecurityConfig.class)
class ResponseSchemaTest extends AbstractIntegrationTest {

    private static int counter = 0;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void allEndpointsReturnApiResponseWrapper() throws Exception {
        long customerId = createCustomer("wrapper");

        ResponseEntity<String> response = restTemplate.getForEntity("/v1/customers/" + customerId, String.class);
        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(json.path("success").asBoolean()).isTrue();
        assertThat(json.has("data")).isTrue();
        assertThat(json.has("timestamp")).isTrue();
    }

    @Test
    void errorResponsesHaveConsistentStructure() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity("/v1/customers/999999999", String.class);
        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(json.path("success").asBoolean()).isFalse();
        assertThat(json.has("message")).isTrue();
        assertThat(json.has("timestamp")).isTrue();
    }

    @Test
    void validationErrorsReturnFieldDetails() throws Exception {
        ResponseEntity<String> response = postJson("/v1/customers", """
                {
                  "customerType": "INDIVIDUAL",
                  "firstName": "Schema",
                  "lastName": "Validation",
                  "dateOfBirth": "1990-01-01",
                  "email": "bad-email",
                  "phonePrimary": "abc"
                }
                """);

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(json.path("success").asBoolean()).isFalse();
        assertThat(json.path("errors").has("email")).isTrue();
        assertThat(json.path("errors").has("phonePrimary")).isTrue();
    }

    private long createCustomer(String label) throws Exception {
        ResponseEntity<String> response = postJson("/v1/customers", """
                {
                  "customerType": "INDIVIDUAL",
                  "firstName": "Response",
                  "lastName": "Schema",
                  "dateOfBirth": "1990-01-01",
                  "nationality": "NGA",
                  "email": "%s",
                  "phonePrimary": "%s",
                  "branchCode": "BR001"
                }
                """.formatted(uniqueEmail(label), uniquePhone()));
        return objectMapper.readTree(response.getBody()).path("data").path("id").asLong();
    }

    private ResponseEntity<String> postJson(String path, String payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(payload, headers), String.class);
    }

    private String uniqueEmail(String label) {
        return label + "+" + System.currentTimeMillis() + "-" + (++counter) + "@example.com";
    }

    private String uniquePhone() {
        return "+234" + Long.toString(System.currentTimeMillis() % 1_000_000_0000L) + String.format("%02d", ++counter % 100);
    }
}
