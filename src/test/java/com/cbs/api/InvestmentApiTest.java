package com.cbs.api;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@Import(TestSecurityConfig.class)
class InvestmentApiTest extends AbstractIntegrationTest {

    @LocalServerPort
    private int port;

    private static int counter = 0;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.basePath = "/api";
    }

    private String uniqueCode() {
        return "PTF-" + System.currentTimeMillis() + "-" + (++counter);
    }

    @Test
    @DisplayName("POST /v1/investment-portfolios - should create portfolio and return 201")
    void createPortfolio_returns201() {
        String code = uniqueCode();

        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
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
                """, code))
        .when()
            .post("/v1/investment-portfolios")
        .then()
            .statusCode(201)
            .body("success", is(true))
            .body("data.id", notNullValue())
            .body("data.portfolioCode", equalTo(code));
    }

    @Test
    @DisplayName("POST /v1/investment-portfolios/{code}/holdings - should add holding and return 201")
    void addHolding_returns201() {
        String code = uniqueCode();

        // Create the portfolio first
        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
                {
                    "portfolioCode": "%s",
                    "portfolioName": "Holding Test Portfolio",
                    "customerId": 1,
                    "portfolioType": "BALANCED",
                    "riskProfile": "MODERATE",
                    "currency": "USD",
                    "initialInvestment": 100000.00
                }
                """, code))
        .when()
            .post("/v1/investment-portfolios")
        .then()
            .statusCode(201);

        // Add a holding
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "instrumentCode": "AAPL",
                    "instrumentName": "Apple Inc.",
                    "assetClass": "EQUITY",
                    "quantity": 100,
                    "avgCostPrice": 175.50,
                    "currentPrice": 180.00,
                    "currency": "USD"
                }
                """)
        .when()
            .post("/v1/investment-portfolios/{code}/holdings", code)
        .then()
            .statusCode(201)
            .body("success", is(true))
            .body("data.id", notNullValue())
            .body("data.instrumentCode", equalTo("AAPL"));
    }

    @Test
    @DisplayName("POST /v1/investment-portfolios/{code}/valuate - should valuate portfolio and return 200")
    void valuatePortfolio_returns200() {
        String code = uniqueCode();

        // Create portfolio
        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
                {
                    "portfolioCode": "%s",
                    "portfolioName": "Valuation Test Portfolio",
                    "customerId": 1,
                    "portfolioType": "GROWTH",
                    "riskProfile": "AGGRESSIVE",
                    "currency": "USD",
                    "initialInvestment": 200000.00
                }
                """, code))
        .when()
            .post("/v1/investment-portfolios")
        .then()
            .statusCode(201);

        // Valuate portfolio
        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/v1/investment-portfolios/{code}/valuate", code)
        .then()
            .statusCode(200)
            .body("success", is(true))
            .body("data.portfolioCode", equalTo(code));
    }

    @Test
    @DisplayName("GET /v1/investment-portfolios/{code} - should return portfolio by code with 200")
    void getPortfolioByCode_returns200() {
        String code = uniqueCode();

        // Create portfolio
        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
                {
                    "portfolioCode": "%s",
                    "portfolioName": "Retrieval Test Portfolio",
                    "customerId": 1,
                    "portfolioType": "INCOME",
                    "riskProfile": "CONSERVATIVE",
                    "currency": "USD",
                    "initialInvestment": 75000.00
                }
                """, code))
        .when()
            .post("/v1/investment-portfolios")
        .then()
            .statusCode(201);

        // Get portfolio by code
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/v1/investment-portfolios/{code}", code)
        .then()
            .statusCode(200)
            .body("success", is(true))
            .body("data.portfolioCode", equalTo(code))
            .body("data.portfolioName", equalTo("Retrieval Test Portfolio"));
    }
}
