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
class InvestmentApiTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static int counter = 0;

    private String uniqueCode() {
        return "PTF-" + System.currentTimeMillis() + "-" + (++counter);
    }

    @Test
    @DisplayName("POST /v1/investment-portfolios - should create portfolio and return 201")
    void createPortfolio_returns201() throws Exception {
        String code = uniqueCode();
        ResponseEntity<String> response = postJson("/v1/investment-portfolios", String.format("""
                {
                    "portfolioCode": "%s",
                    "portfolioName": "Test Growth Portfolio",
                    "customerId": 1,
                    "portfolioType": "GROWTH",
                    "riskProfile": "MODERATE",
                    "investmentObjective": "CAPITAL_GROWTH",
                    "currency": "USD",
                    "initialInvestment": 50000.00,
                    "managementFeePct": 1.50,
                    "performanceFeePct": 10.00,
                    "benchmarkCode": "SP500",
                    "portfolioManagerId": "PM-001"
                }
                """, code));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("id").isMissingNode()).isFalse();
        assertThat(body.path("data").path("portfolioCode").asText()).isEqualTo(code);
    }

    @Test
    @DisplayName("POST /v1/investment-portfolios/{code}/holdings - should add holding and return 201")
    void addHolding_returns201() throws Exception {
        String code = uniqueCode();
        assertThat(postJson("/v1/investment-portfolios", String.format("""
                {
                    "portfolioCode": "%s",
                    "portfolioName": "Holding Test Portfolio",
                    "customerId": 1,
                    "portfolioType": "BALANCED",
                    "riskProfile": "MODERATE",
                    "currency": "USD",
                    "initialInvestment": 100000.00
                }
                """, code)).getStatusCode().value()).isEqualTo(201);

        ResponseEntity<String> response = postJson("/v1/investment-portfolios/{code}/holdings", """
                {
                    "instrumentCode": "AAPL",
                    "instrumentName": "Apple Inc.",
                    "assetClass": "EQUITY",
                    "quantity": 100,
                    "avgCostPrice": 175.50,
                    "currentPrice": 180.00,
                    "currency": "USD"
                }
                """, code);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("id").isMissingNode()).isFalse();
        assertThat(body.path("data").path("instrumentCode").asText()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("POST /v1/investment-portfolios/{code}/valuate - should valuate portfolio and return 200")
    void valuatePortfolio_returns200() throws Exception {
        String code = uniqueCode();
        assertThat(postJson("/v1/investment-portfolios", String.format("""
                {
                    "portfolioCode": "%s",
                    "portfolioName": "Valuation Test Portfolio",
                    "customerId": 1,
                    "portfolioType": "GROWTH",
                    "riskProfile": "AGGRESSIVE",
                    "currency": "USD",
                    "initialInvestment": 200000.00
                }
                """, code)).getStatusCode().value()).isEqualTo(201);

        ResponseEntity<String> response = restTemplate.postForEntity("/v1/investment-portfolios/{code}/valuate", null, String.class, code);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(objectMapper.readTree(response.getBody()).path("data").path("portfolioCode").asText()).isEqualTo(code);
    }

    @Test
    @DisplayName("GET /v1/investment-portfolios/{code} - should return portfolio by code with 200")
    void getPortfolioByCode_returns200() throws Exception {
        String code = uniqueCode();
        assertThat(postJson("/v1/investment-portfolios", String.format("""
                {
                    "portfolioCode": "%s",
                    "portfolioName": "Retrieval Test Portfolio",
                    "customerId": 1,
                    "portfolioType": "INCOME",
                    "riskProfile": "CONSERVATIVE",
                    "currency": "USD",
                    "initialInvestment": 75000.00
                }
                """, code)).getStatusCode().value()).isEqualTo(201);

        ResponseEntity<String> response = restTemplate.getForEntity("/v1/investment-portfolios/{code}", String.class, code);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("portfolioCode").asText()).isEqualTo(code);
        assertThat(body.path("data").path("portfolioName").asText()).isEqualTo("Retrieval Test Portfolio");
    }

    private ResponseEntity<String> postJson(String path, String payload, Object... uriVars) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.postForEntity(path, new HttpEntity<>(payload, headers), String.class, uriVars);
    }
}
