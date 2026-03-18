package com.cbs.contract;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestSecurityConfig.class)
class OpenApiSchemaTest extends AbstractIntegrationTest {

    private static final Set<String> HTTP_METHODS = Set.of("get", "post", "put", "patch", "delete");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void openApiSpecIsAccessible() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity("/v3/api-docs", String.class);

        assertThat(response.getStatusCode().value()).isEqualTo(200);

        JsonNode spec = objectMapper.readTree(response.getBody());
        assertThat(spec.path("openapi").asText()).startsWith("3.");
        assertThat(spec.path("paths").isObject()).isTrue();
        assertThat(spec.path("paths").size()).isPositive();
    }

    @Test
    void allCriticalEndpointsDocumented() throws Exception {
        JsonNode paths = fetchSpec().path("paths");
        String serializedPaths = paths.toString();

        assertThat(serializedPaths).contains("/v1/customers");
        assertThat(serializedPaths).contains("/v1/accounts");
        assertThat(serializedPaths).contains("/v1/payments");
        assertThat(serializedPaths).contains("/v1/loans");
        assertThat(serializedPaths).contains("/v1/cards");
        assertThat(serializedPaths).contains("/v1/deposits/fixed");
        assertThat(serializedPaths).contains("/v1/trade-finance/lc");
        assertThat(serializedPaths).contains("/v1/investment-portfolios");
    }

    @Test
    void allEndpointsHaveTagsAndNoBlankDescriptions() throws Exception {
        JsonNode paths = fetchSpec().path("paths");

        paths.fields().forEachRemaining(pathEntry -> {
            JsonNode pathItem = pathEntry.getValue();
            HTTP_METHODS.stream()
                    .filter(pathItem::has)
                    .forEach(method -> {
                        JsonNode operation = pathItem.path(method);
                        assertThat(operation.path("tags").isArray()).isTrue();
                        assertThat(operation.path("tags").size()).isPositive();
                        if (operation.has("description")) {
                            assertThat(operation.path("description").asText()).isNotBlank();
                        }
                    });
        });
    }

    private JsonNode fetchSpec() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity("/v3/api-docs", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        return objectMapper.readTree(response.getBody());
    }
}
