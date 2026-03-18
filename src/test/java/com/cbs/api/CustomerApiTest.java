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
class CustomerApiTest extends AbstractIntegrationTest {

    @LocalServerPort
    private int port;
    private static int counter = 0;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.basePath = "/api";
    }

    private String uniqueEmail(String localPart) {
        return localPart + "+" + System.currentTimeMillis() + "-" + (++counter) + "@example.com";
    }

    private String uniquePhone() {
        return "+234" + Long.toString(System.currentTimeMillis() % 1_000_000_0000L) + String.format("%02d", ++counter % 100);
    }

    @Test
    @DisplayName("POST /v1/customers - should create customer and return 201 with success=true and non-null id")
    void createCustomer_returns201() {
        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
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
                """, uniqueEmail("john.doe"), uniquePhone()))
        .when()
            .post("/v1/customers")
        .then()
            .statusCode(201)
            .body("success", is(true))
            .body("data.id", notNullValue())
            .body("message", equalTo("Customer created successfully"));
    }

    @Test
    @DisplayName("GET /v1/customers/{id} - nonexistent customer should return 404")
    void getCustomer_notFound_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/v1/customers/{customerId}", 999999999L)
        .then()
            .statusCode(404);
    }

    @Test
    @DisplayName("POST /v1/accounts - should open account and return 201")
    void createAccount_returns201() {
        // First create a customer to get a valid customerId
        Long customerId =
            given()
                .contentType(ContentType.JSON)
                .body(String.format("""
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
                    """, uniqueEmail("alice.smith"), uniquePhone()))
            .when()
                .post("/v1/customers")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath().getLong("data.id");

        // Open an account for that customer
        given()
            .contentType(ContentType.JSON)
            .body(String.format("""
                {
                    "customerId": %d,
                    "productCode": "SA-STD",
                    "accountType": "INDIVIDUAL",
                    "accountName": "Alice Savings",
                    "currencyCode": "NGN",
                    "branchCode": "BR001"
                }
                """, customerId))
        .when()
            .post("/v1/accounts")
        .then()
            .statusCode(201)
            .body("success", is(true))
            .body("data.id", notNullValue());
    }

    @Test
    @DisplayName("GET /v1/accounts/customer/{customerId} - should return 200 with list of accounts")
    void getCustomerAccounts_returns200() {
        // Create a customer
        Long customerId =
            given()
                .contentType(ContentType.JSON)
                .body(String.format("""
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
                    """, uniqueEmail("bob.jones"), uniquePhone()))
            .when()
                .post("/v1/customers")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath().getLong("data.id");

        // Get accounts for that customer (may be empty list, but should return 200)
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/v1/accounts/customer/{customerId}", customerId)
        .then()
            .statusCode(200)
            .body("success", is(true))
            .body("data", instanceOf(java.util.List.class));
    }

    @Test
    @DisplayName("POST /v1/customers - missing required customerType should return 400")
    void createCustomer_missingRequiredFields_returnsError() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "firstName": "NoType",
                    "lastName": "User"
                }
                """)
        .when()
            .post("/v1/customers")
        .then()
            .statusCode(400);
    }
}
