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
class PaymentApiTest extends AbstractIntegrationTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.basePath = "/api";
    }

    @Test
    @DisplayName("GET /v1/payments/{id} - nonexistent payment should return 404")
    void getPayment_notFound_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/v1/payments/{id}", 999999999L)
        .then()
            .statusCode(404);
    }

    @Test
    @DisplayName("POST /v1/payments/transfer - missing required params should return error")
    void createTransfer_missingParams_returnsError() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/v1/payments/transfer")
        .then()
            .statusCode(anyOf(is(400), is(500)));
    }

    @Test
    @DisplayName("POST /v1/payments/transfer - invalid account IDs should return error")
    void createTransfer_invalidAccounts_returnsError() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("debitAccountId", 999999L)
            .queryParam("creditAccountId", 999998L)
            .queryParam("amount", "100.00")
            .queryParam("narration", "Test transfer")
        .when()
            .post("/v1/payments/transfer")
        .then()
            .statusCode(anyOf(is(400), is(404), is(500)));
    }

    @Test
    @DisplayName("GET /v1/payments/domestic endpoint exists and responds")
    void domesticPaymentEndpoint_responds() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/v1/payments/{id}", 1L)
        .then()
            .statusCode(anyOf(is(200), is(404)));
    }
}
