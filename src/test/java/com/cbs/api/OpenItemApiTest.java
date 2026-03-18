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
class OpenItemApiTest extends AbstractIntegrationTest {

    @LocalServerPort
    private int port;

    private static int counter = 0;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.basePath = "/api";
    }

    private String uniqueCode() {
        return "OI-" + System.currentTimeMillis() + "-" + (++counter);
    }

    @Test
    @DisplayName("POST /v1/open-items - should create open item and return 201")
    void createOpenItem_returns201() {
        String code = uniqueCode();

        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
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
                """, code))
        .when()
            .post("/v1/open-items")
        .then()
            .statusCode(201)
            .body("success", is(true))
            .body("data.id", notNullValue())
            .body("data.itemCode", equalTo(code))
            .body("data.status", equalTo("OPEN"));
    }

    @Test
    @DisplayName("POST /v1/open-items/{code}/resolve - should resolve item and return 200")
    void resolveOpenItem_returns200() {
        String code = uniqueCode();

        // Create the open item first
        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
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
                """, code))
        .when()
            .post("/v1/open-items")
        .then()
            .statusCode(201);

        // Resolve the open item
        given()
            .contentType(ContentType.JSON)
            .queryParam("action", "WRITE_OFF")
            .queryParam("notes", "Resolved during integration testing")
        .when()
            .post("/v1/open-items/{code}/resolve", code)
        .then()
            .statusCode(200)
            .body("success", is(true))
            .body("data.itemCode", equalTo(code))
            .body("data.resolutionAction", equalTo("WRITE_OFF"));
    }

    @Test
    @DisplayName("GET /v1/open-items/open - should return list of open items with 200")
    void getOpenItems_returns200() {
        // Ensure at least one open item exists
        String code = uniqueCode();

        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
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
                """, code))
        .when()
            .post("/v1/open-items")
        .then()
            .statusCode(201);

        // Get all open items
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/v1/open-items/open")
        .then()
            .statusCode(200)
            .body("success", is(true))
            .body("data", instanceOf(java.util.List.class))
            .body("data.size()", greaterThanOrEqualTo(1));
    }
}
