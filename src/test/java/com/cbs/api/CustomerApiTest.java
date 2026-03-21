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
class CustomerApiTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static int counter = 0;

    private String uniqueEmail(String localPart) {
        return localPart + "+" + System.currentTimeMillis() + "-" + (++counter) + "@example.com";
    }

    private String uniquePhone() {
        return "+234" + Long.toString(System.currentTimeMillis() % 1_000_000_0000L) + String.format("%02d", ++counter % 100);
    }

    @Test
    @DisplayName("POST /v1/customers - should create customer and return 201 with success=true and non-null id")
    void createCustomer_returns201() throws Exception {
        ResponseEntity<String> response = postJson("/v1/customers", String.format("""
                {
                    "customerType": "INDIVIDUAL",
                    "firstName": "John",
                    "lastName": "Doe",
                    "dateOfBirth": "1990-05-15",
                    "gender": "MALE",
                    "nationality": "NGA",
                    "email": "%s",
                    "phonePrimary": "%s",
                    "branchCode": "BR001"
                }
                """, uniqueEmail("john.doe"), uniquePhone()));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("id").isMissingNode()).isFalse();
        assertThat(body.path("message").asText()).isEqualTo("Customer created successfully");
    }

    @Test
    @DisplayName("GET /v1/customers/{id} - nonexistent customer should return 404")
    void getCustomer_notFound_returns404() {
        ResponseEntity<String> response = restTemplate.getForEntity("/v1/customers/{customerId}", String.class, 999999999L);
        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("POST /v1/accounts - should open account and return 201")
    void createAccount_returns201() throws Exception {
        ResponseEntity<String> customerResponse = postJson("/v1/customers", String.format("""
                {
                    "customerType": "INDIVIDUAL",
                    "firstName": "Alice",
                    "lastName": "Smith",
                    "dateOfBirth": "1985-03-20",
                    "nationality": "NGA",
                    "email": "%s",
                    "phonePrimary": "%s",
                    "branchCode": "BR001"
                }
                """, uniqueEmail("alice.smith"), uniquePhone()));

        assertThat(customerResponse.getStatusCode().value()).isEqualTo(201);
        Long customerId = objectMapper.readTree(customerResponse.getBody()).path("data").path("id").asLong();

        ResponseEntity<String> accountResponse = postJson("/v1/accounts", String.format("""
                {
                    "customerId": %d,
                    "productCode": "SA-STD",
                    "accountType": "INDIVIDUAL",
                    "accountName": "Alice Savings",
                    "currencyCode": "NGN",
                    "branchCode": "BR001"
                }
                """, customerId));

        assertThat(accountResponse.getStatusCode().value()).isEqualTo(201);
        JsonNode body = objectMapper.readTree(accountResponse.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("id").isMissingNode()).isFalse();
    }

    @Test
    @DisplayName("GET /v1/accounts/customer/{id} - should return 200 with list of accounts")
    void getCustomerAccounts_returns200() throws Exception {
        ResponseEntity<String> customerResponse = postJson("/v1/customers", String.format("""
                {
                    "customerType": "INDIVIDUAL",
                    "firstName": "Bob",
                    "lastName": "Jones",
                    "dateOfBirth": "1980-01-10",
                    "nationality": "NGA",
                    "email": "%s",
                    "phonePrimary": "%s",
                    "branchCode": "BR001"
                }
                """, uniqueEmail("bob.jones"), uniquePhone()));

        assertThat(customerResponse.getStatusCode().value()).isEqualTo(201);
        Long customerId = objectMapper.readTree(customerResponse.getBody()).path("data").path("id").asLong();

        ResponseEntity<String> response = restTemplate.getForEntity("/v1/accounts/customer/{customerId}", String.class, customerId);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").isArray()).isTrue();
    }

    @Test
    @DisplayName("POST /v1/customers - missing required customerType should return 400")
    void createCustomer_missingRequiredFields_returnsError() {
        ResponseEntity<String> response = postJson("/v1/customers", """
                {
                    "firstName": "NoType",
                    "lastName": "User"
                }
                """);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    private ResponseEntity<String> postJson(String path, String payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.postForEntity(path, new HttpEntity<>(payload, headers), String.class);
    }
}
