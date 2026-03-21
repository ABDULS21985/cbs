package com.cbs.account;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestDataFactory;
import com.cbs.TestSecurityConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for the Account REST API ({@code /v1/accounts}).
 * <p>
 * Tests run against a real Spring context with an actual database, exercising
 * the full request pipeline: controller, service, repository, and validation.
 * Security is bypassed via {@link TestSecurityConfig}.
 */
@Import(TestSecurityConfig.class)
@TestMethodOrder(OrderAnnotation.class)
class AccountApiTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static int counter = 0;

    // Shared state across ordered tests
    private static Long customerId;
    private static Long secondCustomerId;
    private static String accountNumber;
    private static String secondAccountNumber;
    private static Long accountId;
    private static Long secondAccountId;
    private static Long holdId;

    // ========================================================================
    // Helpers
    // ========================================================================

    private String uniqueEmail(String localPart) {
        return localPart + "+" + System.currentTimeMillis() + "-" + (++counter) + "@example.com";
    }

    private String uniquePhone() {
        return "+234" + Long.toString(System.currentTimeMillis() % 1_000_000_0000L)
                + String.format("%02d", ++counter % 100);
    }

    private ResponseEntity<String> postJson(String path, String payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.postForEntity(path, new HttpEntity<>(payload, headers), String.class);
    }

    private ResponseEntity<String> patchJson(String path, String payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(path, HttpMethod.PATCH, new HttpEntity<>(payload, headers), String.class);
    }

    private JsonNode parse(ResponseEntity<String> response) throws Exception {
        return objectMapper.readTree(response.getBody());
    }

    // ========================================================================
    // 0. Setup: Create customers used by subsequent account tests
    // ========================================================================

    @Nested
    @DisplayName("0 - Setup: Create test customers")
    @TestMethodOrder(OrderAnnotation.class)
    class SetupTests {

        @Test
        @Order(1)
        @DisplayName("Create primary test customer")
        void createPrimaryCustomer() throws Exception {
            ResponseEntity<String> response = postJson("/v1/customers", String.format("""
                    {
                        "customerType": "INDIVIDUAL",
                        "firstName": "Amina",
                        "lastName": "Bakare",
                        "dateOfBirth": "1990-06-15",
                        "gender": "FEMALE",
                        "nationality": "NGA",
                        "email": "%s",
                        "phonePrimary": "%s",
                        "branchCode": "BR001"
                    }
                    """, uniqueEmail("amina.bakare"), uniquePhone()));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            customerId = body.path("data").path("id").asLong();
            assertThat(customerId).isPositive();
        }

        @Test
        @Order(2)
        @DisplayName("Create secondary test customer for transfers and joint accounts")
        void createSecondaryCustomer() throws Exception {
            ResponseEntity<String> response = postJson("/v1/customers", String.format("""
                    {
                        "customerType": "INDIVIDUAL",
                        "firstName": "David",
                        "lastName": "Okafor",
                        "dateOfBirth": "1985-11-02",
                        "gender": "MALE",
                        "nationality": "NGA",
                        "email": "%s",
                        "phonePrimary": "%s",
                        "branchCode": "BR001"
                    }
                    """, uniqueEmail("david.okafor"), uniquePhone()));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            secondCustomerId = parse(response).path("data").path("id").asLong();
            assertThat(secondCustomerId).isPositive();
        }
    }

    // ========================================================================
    // 1. Account Opening
    // ========================================================================

    @Nested
    @DisplayName("1 - Account Opening (POST /v1/accounts)")
    @TestMethodOrder(OrderAnnotation.class)
    class AccountOpeningTests {

        @Test
        @Order(10)
        @DisplayName("Should open a savings account with initial deposit and return 201")
        void openSavingsAccount_success() throws Exception {
            assertThat(customerId).as("Customer must be created first").isNotNull();

            ResponseEntity<String> response = postJson("/v1/accounts", String.format("""
                    {
                        "customerId": %d,
                        "productCode": "SA-STD",
                        "accountType": "INDIVIDUAL",
                        "accountName": "Amina Savings",
                        "currencyCode": "NGN",
                        "initialDeposit": 50000.00,
                        "branchCode": "BR001"
                    }
                    """, customerId));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();

            JsonNode data = body.path("data");
            accountNumber = data.path("accountNumber").asText();
            accountId = data.path("id").asLong();

            assertThat(accountNumber).isNotBlank();
            assertThat(accountId).isPositive();
            assertThat(data.path("status").asText()).isIn("ACTIVE", "PENDING_ACTIVATION");
        }

        @Test
        @Order(11)
        @DisplayName("Should open a second account for transfer tests")
        void openSecondAccount_success() throws Exception {
            assertThat(secondCustomerId).as("Second customer must be created first").isNotNull();

            ResponseEntity<String> response = postJson("/v1/accounts", String.format("""
                    {
                        "customerId": %d,
                        "productCode": "SA-STD",
                        "accountType": "INDIVIDUAL",
                        "accountName": "David Savings",
                        "currencyCode": "NGN",
                        "initialDeposit": 100000.00,
                        "branchCode": "BR001"
                    }
                    """, secondCustomerId));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode data = parse(response).path("data");
            secondAccountNumber = data.path("accountNumber").asText();
            secondAccountId = data.path("id").asLong();

            assertThat(secondAccountNumber).isNotBlank();
            assertThat(secondAccountId).isPositive();
        }

        @Test
        @Order(12)
        @DisplayName("Should return 400 when required fields are missing")
        void openAccount_missingRequiredFields_returns400() throws Exception {
            ResponseEntity<String> response = postJson("/v1/accounts", """
                    {
                        "accountName": "Missing Fields"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isEqualTo(400);
        }

        @Test
        @Order(13)
        @DisplayName("Should return error for non-existent customer")
        void openAccount_nonExistentCustomer_returnsError() throws Exception {
            ResponseEntity<String> response = postJson("/v1/accounts", """
                    {
                        "customerId": 999999999,
                        "productCode": "SA-STD",
                        "accountType": "INDIVIDUAL",
                        "branchCode": "BR001"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isIn(400, 404);
        }

        @Test
        @Order(14)
        @DisplayName("Should return error for non-existent product code")
        void openAccount_nonExistentProduct_returnsError() throws Exception {
            assertThat(customerId).isNotNull();

            ResponseEntity<String> response = postJson("/v1/accounts", String.format("""
                    {
                        "customerId": %d,
                        "productCode": "NONEXISTENT-PROD",
                        "accountType": "INDIVIDUAL",
                        "branchCode": "BR001"
                    }
                    """, customerId));

            assertThat(response.getStatusCode().value()).isIn(400, 404);
        }
    }

    // ========================================================================
    // 2. Get Account
    // ========================================================================

    @Nested
    @DisplayName("2 - Get Account (GET /v1/accounts/{accountNumber})")
    @TestMethodOrder(OrderAnnotation.class)
    class GetAccountTests {

        @Test
        @Order(20)
        @DisplayName("Should return account details for existing account")
        void getAccount_success() throws Exception {
            assertThat(accountNumber).as("Account must be opened first").isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();

            JsonNode data = body.path("data");
            assertThat(data.path("accountNumber").asText()).isEqualTo(accountNumber);
            assertThat(data.path("customerId").asLong()).isEqualTo(customerId);
            assertThat(data.path("currencyCode").asText()).isEqualTo("NGN");
        }

        @Test
        @Order(21)
        @DisplayName("Should return 404 for non-existent account number")
        void getAccount_notFound_returns404() {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}", String.class, "0000000000");

            assertThat(response.getStatusCode().value()).isEqualTo(404);
        }
    }

    // ========================================================================
    // 3. List / Search Accounts
    // ========================================================================

    @Nested
    @DisplayName("3 - List / Search Accounts (GET /v1/accounts)")
    @TestMethodOrder(OrderAnnotation.class)
    class SearchAccountTests {

        @Test
        @Order(30)
        @DisplayName("Should list accounts without filters and return paged results")
        void listAccounts_noFilters_returnsResults() throws Exception {
            assertThat(accountNumber).as("Account must be opened first").isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts?page=0&size=10", String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
            assertThat(body.path("data").size()).isGreaterThanOrEqualTo(1);
        }

        @Test
        @Order(31)
        @DisplayName("Should filter accounts by status")
        void listAccounts_filterByStatus_returnsFiltered() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts?status=ACTIVE&page=0&size=10", String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
        }

        @Test
        @Order(32)
        @DisplayName("Should filter accounts by branch code")
        void listAccounts_filterByBranch_returnsFiltered() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts?branchCode=BR001&page=0&size=10", String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }
    }

    // ========================================================================
    // 4. Change Account Status
    // ========================================================================

    @Nested
    @DisplayName("4 - Change Account Status (PATCH /v1/accounts/{accountNumber}/status)")
    @TestMethodOrder(OrderAnnotation.class)
    class ChangeStatusTests {

        @Test
        @Order(40)
        @DisplayName("Should freeze an active account")
        void freezeAccount_success() throws Exception {
            assertThat(accountNumber).as("Account must be opened first").isNotNull();

            ResponseEntity<String> response = restTemplate.exchange(
                    "/v1/accounts/{accountNumber}/status?newStatus=FROZEN&reason=Compliance+review",
                    HttpMethod.PATCH, HttpEntity.EMPTY, String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").path("status").asText()).isEqualTo("FROZEN");
        }

        @Test
        @Order(41)
        @DisplayName("Should re-activate a frozen account")
        void reactivateAccount_success() throws Exception {
            ResponseEntity<String> response = restTemplate.exchange(
                    "/v1/accounts/{accountNumber}/status?newStatus=ACTIVE&reason=Compliance+cleared",
                    HttpMethod.PATCH, HttpEntity.EMPTY, String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").path("status").asText()).isEqualTo("ACTIVE");
        }

        @Test
        @Order(42)
        @DisplayName("Should reject closing an active account with balance (if applicable)")
        void closeAccountWithBalance_mayReturnError() throws Exception {
            // Attempt to close the account that has an opening deposit
            ResponseEntity<String> response = restTemplate.exchange(
                    "/v1/accounts/{accountNumber}/status?newStatus=CLOSED&reason=Customer+request",
                    HttpMethod.PATCH, HttpEntity.EMPTY, String.class, accountNumber);

            // The system may reject this (400) if the account has a non-zero balance,
            // or allow it (200) depending on business rules
            assertThat(response.getStatusCode().value()).isIn(200, 400);

            // If it was closed, re-activate for subsequent tests
            if (response.getStatusCode().value() == 200) {
                restTemplate.exchange(
                        "/v1/accounts/{accountNumber}/status?newStatus=ACTIVE&reason=Test+reactivation",
                        HttpMethod.PATCH, HttpEntity.EMPTY, String.class, accountNumber);
            }
        }
    }

    // ========================================================================
    // 5. Signatories
    // ========================================================================

    @Nested
    @DisplayName("5 - Signatories (POST /v1/accounts/{accountNumber}/signatories)")
    @TestMethodOrder(OrderAnnotation.class)
    class SignatoryTests {

        @Test
        @Order(50)
        @DisplayName("Should add a signatory to an account")
        void addSignatory_success() throws Exception {
            assertThat(accountNumber).isNotNull();
            assertThat(secondCustomerId).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/" + accountNumber + "/signatories",
                    String.format("""
                            {
                                "customerId": %d,
                                "role": "JOINT_HOLDER"
                            }
                            """, secondCustomerId));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("message").asText()).contains("Signatory added");
        }

        @Test
        @Order(51)
        @DisplayName("Should list signatories for an account")
        void getSignatories_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/signatories", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
        }
    }

    // ========================================================================
    // 6. Transaction Limits
    // ========================================================================

    @Nested
    @DisplayName("6 - Transaction Limits (PATCH /v1/accounts/{accountNumber}/limits)")
    @TestMethodOrder(OrderAnnotation.class)
    class LimitTests {

        @Test
        @Order(60)
        @DisplayName("Should update transaction limit for an account")
        void changeTransactionLimit_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = patchJson(
                    "/v1/accounts/" + accountNumber + "/limits",
                    """
                    {
                        "limitType": "DAILY_DEBIT",
                        "newValue": 500000.00,
                        "reason": "Increased limit per customer request"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("message").asText()).contains("limit");
        }

        @Test
        @Order(61)
        @DisplayName("Should retrieve account limits")
        void getAccountLimits_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/limits", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
        }
    }

    // ========================================================================
    // 7. Holds
    // ========================================================================

    @Nested
    @DisplayName("7 - Holds (POST /v1/accounts/{accountNumber}/holds)")
    @TestMethodOrder(OrderAnnotation.class)
    class HoldTests {

        @Test
        @Order(70)
        @DisplayName("Should place a hold on an account")
        void placeHold_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/" + accountNumber + "/holds",
                    """
                    {
                        "amount": 5000.00,
                        "reason": "Pending cheque clearance",
                        "reference": "CHQ-001",
                        "holdType": "LIEN"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("message").asText()).contains("Hold placed");

            JsonNode data = body.path("data");
            if (!data.isMissingNode() && data.has("id")) {
                holdId = data.path("id").asLong();
            }
        }

        @Test
        @Order(71)
        @DisplayName("Should list holds on an account")
        void getHolds_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/holds", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
            assertThat(body.path("data").size()).isGreaterThanOrEqualTo(1);

            // Capture holdId from the list if not already captured
            if (holdId == null && body.path("data").size() > 0) {
                holdId = body.path("data").get(0).path("id").asLong();
            }
        }

        @Test
        @Order(72)
        @DisplayName("Should release a hold on an account")
        void releaseHold_success() throws Exception {
            assertThat(holdId).as("Hold must be placed first").isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/" + accountNumber + "/holds/" + holdId + "/release",
                    """
                    {
                        "reason": "Cheque cleared"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("message").asText()).contains("released");
        }
    }

    // ========================================================================
    // 8. Debit / Credit Transactions
    // ========================================================================

    @Nested
    @DisplayName("8 - Transactions (POST /v1/accounts/transactions/debit and credit)")
    @TestMethodOrder(OrderAnnotation.class)
    class TransactionTests {

        @Test
        @Order(80)
        @DisplayName("Should post a credit transaction")
        void postCredit_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = postJson("/v1/accounts/transactions/credit", String.format("""
                    {
                        "accountNumber": "%s",
                        "transactionType": "CREDIT",
                        "amount": 25000.00,
                        "narration": "Cash deposit at branch",
                        "channel": "BRANCH"
                    }
                    """, accountNumber));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();

            JsonNode data = body.path("data");
            assertThat(data.path("amount").decimalValue()).isPositive();
        }

        @Test
        @Order(81)
        @DisplayName("Should post a debit transaction")
        void postDebit_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = postJson("/v1/accounts/transactions/debit", String.format("""
                    {
                        "accountNumber": "%s",
                        "transactionType": "DEBIT",
                        "amount": 5000.00,
                        "narration": "ATM withdrawal",
                        "channel": "ATM"
                    }
                    """, accountNumber));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }

        @Test
        @Order(82)
        @DisplayName("Should return error when debiting more than available balance")
        void postDebit_insufficientFunds_returnsError() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = postJson("/v1/accounts/transactions/debit", String.format("""
                    {
                        "accountNumber": "%s",
                        "transactionType": "DEBIT",
                        "amount": 99999999.00,
                        "narration": "Oversized withdrawal",
                        "channel": "BRANCH"
                    }
                    """, accountNumber));

            assertThat(response.getStatusCode().value()).isIn(400, 422);
        }

        @Test
        @Order(83)
        @DisplayName("Should return 400 for transaction with missing required fields")
        void postCredit_missingFields_returns400() throws Exception {
            ResponseEntity<String> response = postJson("/v1/accounts/transactions/credit", """
                    {
                        "amount": 100.00
                    }
                    """);

            assertThat(response.getStatusCode().value()).isEqualTo(400);
        }

        @Test
        @Order(84)
        @DisplayName("Should retrieve transaction history for an account")
        void getTransactionHistory_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/transactions?page=0&size=10",
                    String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
            assertThat(body.path("data").size()).isGreaterThanOrEqualTo(1);
        }
    }

    // ========================================================================
    // 9. Transfer Between Accounts
    // ========================================================================

    @Nested
    @DisplayName("9 - Transfer (POST /v1/accounts/transactions/transfer)")
    @TestMethodOrder(OrderAnnotation.class)
    class TransferTests {

        @Test
        @Order(90)
        @DisplayName("Should transfer between two accounts")
        void transfer_success() throws Exception {
            assertThat(accountNumber).isNotNull();
            assertThat(secondAccountNumber).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/transactions/transfer"
                            + "?fromAccount=" + secondAccountNumber
                            + "&toAccount=" + accountNumber
                            + "&amount=10000.00"
                            + "&narration=Rent+payment"
                            + "&channel=INTERNET",
                    "");

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }

        @Test
        @Order(91)
        @DisplayName("Should reject transfer with insufficient funds")
        void transfer_insufficientFunds_returnsError() throws Exception {
            ResponseEntity<String> response = postJson(
                    "/v1/accounts/transactions/transfer"
                            + "?fromAccount=" + accountNumber
                            + "&toAccount=" + secondAccountNumber
                            + "&amount=99999999.00"
                            + "&narration=Too+much"
                            + "&channel=INTERNET",
                    "");

            assertThat(response.getStatusCode().value()).isIn(400, 422);
        }

        @Test
        @Order(92)
        @DisplayName("Should reject transfer to the same account")
        void transfer_sameAccount_returnsError() throws Exception {
            ResponseEntity<String> response = postJson(
                    "/v1/accounts/transactions/transfer"
                            + "?fromAccount=" + accountNumber
                            + "&toAccount=" + accountNumber
                            + "&amount=100.00"
                            + "&narration=Self+transfer"
                            + "&channel=INTERNET",
                    "");

            assertThat(response.getStatusCode().value()).isIn(400, 422);
        }
    }

    // ========================================================================
    // 10. Interest Accrual
    // ========================================================================

    @Nested
    @DisplayName("10 - Interest Accrual (POST /v1/accounts/{id}/interest/accrue)")
    @TestMethodOrder(OrderAnnotation.class)
    class InterestTests {

        @Test
        @Order(100)
        @DisplayName("Should accrue interest for a savings account")
        void accrueInterest_success() throws Exception {
            assertThat(accountId).as("Account must be opened first").isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/" + accountId + "/interest/accrue", "");

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").has("accruedAmount")).isTrue();
        }

        @Test
        @Order(101)
        @DisplayName("Should return interest history for an account")
        void getInterestHistory_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/interest-history", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
        }
    }

    // ========================================================================
    // 11. Product Catalog
    // ========================================================================

    @Nested
    @DisplayName("11 - Product Catalog (GET /v1/accounts/products)")
    @TestMethodOrder(OrderAnnotation.class)
    class ProductCatalogTests {

        @Test
        @Order(110)
        @DisplayName("Should list all active products")
        void listProducts_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/products", String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
            assertThat(body.path("data").size()).isGreaterThanOrEqualTo(1);
        }

        @Test
        @Order(111)
        @DisplayName("Should get products by category")
        void getProductsByCategory_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/products/category/SAVINGS", String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
        }

        @Test
        @Order(112)
        @DisplayName("Should get a single product by code")
        void getProductByCode_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/products/{code}", String.class, "SA-STD");

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").path("code").asText()).isEqualTo("SA-STD");
        }
    }

    // ========================================================================
    // 12. Account Summary
    // ========================================================================

    @Nested
    @DisplayName("12 - Account Summary (GET /v1/accounts/summary)")
    @TestMethodOrder(OrderAnnotation.class)
    class AccountSummaryTests {

        @Test
        @Order(120)
        @DisplayName("Should return account summary stats")
        void getAccountSummary_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/summary", String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();

            JsonNode data = body.path("data");
            assertThat(data.has("totalAccounts")).isTrue();
            assertThat(data.has("totalBalance")).isTrue();
            assertThat(data.path("totalAccounts").asLong()).isGreaterThanOrEqualTo(1);
        }

        @Test
        @Order(121)
        @DisplayName("Should return compliance check overview")
        void getComplianceOverview_success() throws Exception {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/compliance-check", String.class);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();

            JsonNode data = body.path("data");
            assertThat(data.has("frozenAccounts")).isTrue();
            assertThat(data.has("totalRestricted")).isTrue();
        }
    }

    // ========================================================================
    // 13. Maintenance History
    // ========================================================================

    @Nested
    @DisplayName("13 - Maintenance History (GET /v1/accounts/{accountNumber}/maintenance-history)")
    @TestMethodOrder(OrderAnnotation.class)
    class MaintenanceHistoryTests {

        @Test
        @Order(130)
        @DisplayName("Should return maintenance audit trail for an account")
        void getMaintenanceHistory_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/maintenance-history", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
        }
    }

    // ========================================================================
    // 14. Linked Products
    // ========================================================================

    @Nested
    @DisplayName("14 - Linked Products (GET /v1/accounts/{accountNumber}/linked-products)")
    @TestMethodOrder(OrderAnnotation.class)
    class LinkedProductTests {

        @Test
        @Order(140)
        @DisplayName("Should return linked products for an account")
        void getLinkedProducts_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/linked-products", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }
    }
}
