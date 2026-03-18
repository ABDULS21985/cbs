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
    @DisplayName("POST /v1/payments/transfer - should create internal transfer and return 201")
    void createInternalTransfer_returns201() {
        // First set up: create two customers with accounts
        Long customer1Id = createCustomer("Transfer", "Sender", "transfer.sender@test.com", "+2348099900001");
        Long customer2Id = createCustomer("Transfer", "Receiver", "transfer.receiver@test.com", "+2348099900002");

        Long debitAccountId = createAccountAndGetId(customer1Id, "ACCT-SEND");
        Long creditAccountId = createAccountAndGetId(customer2Id, "ACCT-RECV");

        given()
            .contentType(ContentType.JSON)
            .queryParam("debitAccountId", debitAccountId)
            .queryParam("creditAccountId", creditAccountId)
            .queryParam("amount", "100.00")
            .queryParam("narration", "Test internal transfer")
        .when()
            .post("/v1/payments/transfer")
        .then()
            .statusCode(201)
            .body("success", is(true))
            .body("data.id", notNullValue());
    }

    @Test
    @DisplayName("GET /v1/payments/{id} - should return payment details with 200")
    void getPayment_returns200() {
        // Set up accounts and execute a transfer
        Long customer1Id = createCustomer("Pay", "Getter1", "pay.getter1@test.com", "+2348099900003");
        Long customer2Id = createCustomer("Pay", "Getter2", "pay.getter2@test.com", "+2348099900004");

        Long debitAccountId = createAccountAndGetId(customer1Id, "ACCT-PG1");
        Long creditAccountId = createAccountAndGetId(customer2Id, "ACCT-PG2");

        Long paymentId =
            given()
                .contentType(ContentType.JSON)
                .queryParam("debitAccountId", debitAccountId)
                .queryParam("creditAccountId", creditAccountId)
                .queryParam("amount", "50.00")
                .queryParam("narration", "Payment for retrieval test")
            .when()
                .post("/v1/payments/transfer")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath().getLong("data.id");

        // Retrieve the payment by id
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/v1/payments/{id}", paymentId)
        .then()
            .statusCode(200)
            .body("success", is(true))
            .body("data.id", equalTo(paymentId.intValue()));
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
    void createTransfer_invalidData_returnsError() {
        // Missing all required params: debitAccountId, creditAccountId, amount
        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/v1/payments/transfer")
        .then()
            .statusCode(anyOf(is(400), is(500)));
    }

    // ---- Helper methods ----

    private Long createCustomer(String firstName, String lastName, String email, String phone) {
        return given()
            .contentType(ContentType.JSON)
            .body(String.format("""
                {
                    "customerType": "INDIVIDUAL",
                    "firstName": "%s",
                    "lastName": "%s",
                    "dateOfBirth": "1990-01-01",
                    "nationality": "NGA",
                    "email": "%s",
                    "phonePrimary": "%s",
                    "branchCode": "BR001"
                }
                """, firstName, lastName, email, phone))
        .when()
            .post("/v1/customers")
        .then()
            .statusCode(201)
            .extract()
            .jsonPath().getLong("data.id");
    }

    private Long createAccountAndGetId(Long customerId, String accountName) {
        return given()
            .contentType(ContentType.JSON)
            .body(String.format("""
                {
                    "customerId": %d,
                    "productCode": "SAV001",
                    "accountType": "INDIVIDUAL",
                    "accountName": "%s",
                    "currencyCode": "NGN",
                    "branchCode": "BR001"
                }
                """, customerId, accountName))
        .when()
            .post("/v1/accounts")
        .then()
            .statusCode(201)
            .extract()
            .jsonPath().getLong("data.id");
    }
}
