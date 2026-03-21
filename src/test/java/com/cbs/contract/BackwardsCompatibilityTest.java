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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestSecurityConfig.class)
class BackwardsCompatibilityTest extends AbstractIntegrationTest {

    private static int counter = 0;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void v1CustomerCreationAcceptsLegacyPhoneNumberField() throws Exception {
        ResponseEntity<String> response = postJson("/v1/customers", """
                {
                  "customerType": "INDIVIDUAL",
                  "firstName": "Legacy",
                  "lastName": "Mobile",
                  "dateOfBirth": "1990-01-01",
                  "email": "%s",
                  "phoneNumber": "%s",
                  "branchCode": "BR001"
                }
                """.formatted(uniqueEmail("legacy.mobile"), uniquePhone()));

        JsonNode json = objectMapper.readTree(response.getBody());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(json.path("data").has("phoneNumber")).isTrue();
        assertThat(json.path("data").path("phoneNumber").asText()).startsWith("+234");
    }

    @Test
    void v1AccountBalanceResponseIncludesLegacyAliases() throws Exception {
        JsonNode account = openAccountForCompatibility();
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/v1/accounts/" + account.path("accountNumber").asText(), String.class);

        JsonNode data = objectMapper.readTree(response.getBody()).path("data");

        assertThat(data.has("availableBalance")).isTrue();
        assertThat(data.has("ledgerBalance")).isTrue();
        assertThat(data.has("currency")).isTrue();
    }

    @Test
    void removedFieldsAreNeverDroppedFromAccountResponse() throws Exception {
        JsonNode account = openAccountForCompatibility();
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/v1/accounts/" + account.path("accountNumber").asText(), String.class);

        String body = response.getBody();
        for (String field : List.of("id", "accountNumber", "accountType", "status",
                "currency", "availableBalance", "ledgerBalance", "customerId")) {
            assertThat(body).contains("\"" + field + "\"");
        }
    }

    @Test
    void canonicalAndLegacyBalanceFieldsCoexist() throws Exception {
        JsonNode account = openAccountForCompatibility();
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/v1/accounts/" + account.path("accountNumber").asText(), String.class);

        JsonNode data = objectMapper.readTree(response.getBody()).path("data");

        assertThat(data.has("bookBalance")).isTrue();
        assertThat(data.has("ledgerBalance")).isTrue();
        assertThat(data.has("currencyCode")).isTrue();
        assertThat(data.has("currency")).isTrue();
    }

    @Test
    void legacyTradeFinanceAliasRemainsDocumented() {
        String spec = restTemplate.getForObject("/v3/api-docs", String.class);
        assertThat(spec).contains("/v1/trade-finance/lc");
    }

    private JsonNode openAccountForCompatibility() throws Exception {
        long customerId = createLegacyCustomer();
        ResponseEntity<String> response = postJson("/v1/accounts", """
                {
                  "customerId": %d,
                  "productCode": "SA-STD",
                  "accountType": "INDIVIDUAL",
                  "accountName": "Compatibility Savings",
                  "currencyCode": "NGN",
                  "branchCode": "BR001",
                  "initialDeposit": 1000.00
                }
                """.formatted(customerId));
        return objectMapper.readTree(response.getBody()).path("data");
    }

    private long createLegacyCustomer() throws Exception {
        ResponseEntity<String> response = postJson("/v1/customers", """
                {
                  "customerType": "INDIVIDUAL",
                  "firstName": "Compat",
                  "lastName": "User",
                  "dateOfBirth": "1990-01-01",
                  "email": "%s",
                  "phoneNumber": "%s",
                  "branchCode": "BR001"
                }
                """.formatted(uniqueEmail("compat.user"), uniquePhone()));
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
