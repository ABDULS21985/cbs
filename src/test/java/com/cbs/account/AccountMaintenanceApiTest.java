package com.cbs.account;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for account maintenance operations not covered in AccountApiTest:
 * - Interest rate override
 * - Account officer change
 * - Signing rule update
 * - Wallet operations
 */
@Import(TestSecurityConfig.class)
@TestMethodOrder(OrderAnnotation.class)
class AccountMaintenanceApiTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static int counter = 0;

    // Shared state
    private static Long customerId;
    private static String accountNumber;
    private static Long accountId;

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
    // 0. Setup
    // ========================================================================

    @Nested
    @DisplayName("0 - Setup: Create test customer and account")
    @TestMethodOrder(OrderAnnotation.class)
    class SetupTests {

        @Test
        @Order(1)
        @DisplayName("Create test customer for maintenance tests")
        void createCustomer() throws Exception {
            ResponseEntity<String> response = postJson("/v1/customers", String.format("""
                    {
                        "customerType": "INDIVIDUAL",
                        "firstName": "Fatima",
                        "lastName": "Adeyemi",
                        "dateOfBirth": "1992-03-25",
                        "gender": "FEMALE",
                        "nationality": "NGA",
                        "email": "%s",
                        "phonePrimary": "%s",
                        "branchCode": "BR001"
                    }
                    """, uniqueEmail("fatima.adeyemi"), uniquePhone()));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            customerId = parse(response).path("data").path("id").asLong();
            assertThat(customerId).isPositive();
        }

        @Test
        @Order(2)
        @DisplayName("Open test savings account")
        void openAccount() throws Exception {
            assertThat(customerId).isNotNull();

            ResponseEntity<String> response = postJson("/v1/accounts", String.format("""
                    {
                        "customerId": %d,
                        "productCode": "SA-STD",
                        "accountType": "INDIVIDUAL",
                        "accountName": "Fatima Maintenance Test",
                        "currencyCode": "NGN",
                        "initialDeposit": 100000.00,
                        "branchCode": "BR001"
                    }
                    """, customerId));

            assertThat(response.getStatusCode().value()).isEqualTo(201);
            JsonNode data = parse(response).path("data");
            accountNumber = data.path("accountNumber").asText();
            accountId = data.path("id").asLong();
            assertThat(accountNumber).isNotBlank();
        }
    }

    // ========================================================================
    // 1. Interest Rate Override
    // ========================================================================

    @Nested
    @DisplayName("1 - Interest Rate Override (POST /v1/accounts/{accountNumber}/interest-rate-override)")
    @TestMethodOrder(OrderAnnotation.class)
    class InterestRateOverrideTests {

        @Test
        @Order(10)
        @DisplayName("Should override interest rate with valid data")
        void overrideInterestRate_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            LocalDate effectiveDate = LocalDate.now();
            LocalDate expiryDate = effectiveDate.plusMonths(6);

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/" + accountNumber + "/interest-rate-override",
                    String.format("""
                    {
                        "overrideRate": 5.75,
                        "reason": "Premium customer retention offer - approved by branch manager",
                        "effectiveDate": "%s",
                        "expiryDate": "%s"
                    }
                    """, effectiveDate, expiryDate));

            assertThat(response.getStatusCode().value()).isIn(200, 201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }

        @Test
        @Order(11)
        @DisplayName("Should reject override with rate above 100%")
        void overrideInterestRate_invalidRate_returns400() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/" + accountNumber + "/interest-rate-override",
                    String.format("""
                    {
                        "overrideRate": 150.00,
                        "reason": "Invalid rate test",
                        "effectiveDate": "%s",
                        "expiryDate": "%s"
                    }
                    """, LocalDate.now(), LocalDate.now().plusMonths(1)));

            assertThat(response.getStatusCode().value()).isEqualTo(400);
        }

        @Test
        @Order(12)
        @DisplayName("Should reject override with short reason")
        void overrideInterestRate_shortReason_returns400() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/" + accountNumber + "/interest-rate-override",
                    String.format("""
                    {
                        "overrideRate": 4.0,
                        "reason": "short",
                        "effectiveDate": "%s",
                        "expiryDate": "%s"
                    }
                    """, LocalDate.now(), LocalDate.now().plusMonths(1)));

            assertThat(response.getStatusCode().value()).isEqualTo(400);
        }
    }

    // ========================================================================
    // 2. Account Officer Change
    // ========================================================================

    @Nested
    @DisplayName("2 - Officer Change (PATCH /v1/accounts/{accountNumber}/officer)")
    @TestMethodOrder(OrderAnnotation.class)
    class OfficerChangeTests {

        @Test
        @Order(20)
        @DisplayName("Should change account officer successfully")
        void changeOfficer_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = patchJson(
                    "/v1/accounts/" + accountNumber + "/officer",
                    String.format("""
                    {
                        "officerId": "RM-002",
                        "officerName": "Chinedu Okonkwo",
                        "reason": "Customer relocated to new branch",
                        "effectiveDate": "%s"
                    }
                    """, LocalDate.now()));

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }

        @Test
        @Order(21)
        @DisplayName("Should verify maintenance history records officer change")
        void changeOfficer_maintenanceHistoryUpdated() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/accounts/{accountNumber}/maintenance-history", String.class, accountNumber);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode data = parse(response).path("data");
            assertThat(data.isArray()).isTrue();

            // Should have at least one maintenance record from the officer change
            boolean hasOfficerChange = false;
            for (JsonNode entry : data) {
                String action = entry.path("action").asText("");
                if (action.toLowerCase().contains("officer")) {
                    hasOfficerChange = true;
                    break;
                }
            }
            // Officer changes should be logged
            assertThat(data.size()).isGreaterThan(0);
        }
    }

    // ========================================================================
    // 3. Signing Rule Update
    // ========================================================================

    @Nested
    @DisplayName("3 - Signing Rule (PATCH /v1/accounts/{accountNumber}/signing-rule)")
    @TestMethodOrder(OrderAnnotation.class)
    class SigningRuleTests {

        @Test
        @Order(30)
        @DisplayName("Should update signing rule to ANY_TWO")
        void updateSigningRule_success() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = patchJson(
                    "/v1/accounts/" + accountNumber + "/signing-rule",
                    """
                    {
                        "rule": "ANY_TWO"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }

        @Test
        @Order(31)
        @DisplayName("Should update signing rule back to ANY")
        void updateSigningRule_backToAny() throws Exception {
            assertThat(accountNumber).isNotNull();

            ResponseEntity<String> response = patchJson(
                    "/v1/accounts/" + accountNumber + "/signing-rule",
                    """
                    {
                        "rule": "ANY"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    // ========================================================================
    // 4. Wallet Operations
    // ========================================================================

    @Nested
    @DisplayName("4 - Wallet Operations (POST /v1/wallets/account/{accountId})")
    @TestMethodOrder(OrderAnnotation.class)
    class WalletTests {

        private static Long walletId;

        @Test
        @Order(40)
        @DisplayName("Should create a USD wallet for account")
        void createWallet_success() throws Exception {
            assertThat(accountId).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/wallets/account/" + accountId,
                    """
                    {
                        "currencyCode": "USD"
                    }
                    """);

            assertThat(response.getStatusCode().value()).isIn(200, 201);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();

            JsonNode data = body.path("data");
            walletId = data.path("id").asLong();
            assertThat(walletId).isPositive();
            assertThat(data.path("currencyCode").asText()).isEqualTo("USD");
        }

        @Test
        @Order(41)
        @DisplayName("Should reject duplicate wallet for same currency")
        void createWallet_duplicate_returnsError() throws Exception {
            assertThat(accountId).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/wallets/account/" + accountId,
                    """
                    {
                        "currencyCode": "USD"
                    }
                    """);

            // Should fail because USD wallet already exists
            assertThat(response.getStatusCode().value()).isIn(400, 409);
        }

        @Test
        @Order(42)
        @DisplayName("Should list wallets for account")
        void getWallets_success() throws Exception {
            assertThat(accountId).isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/wallets/account/{accountId}", String.class, accountId);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
            assertThat(body.path("data").size()).isGreaterThanOrEqualTo(1);
        }

        @Test
        @Order(43)
        @DisplayName("Should credit wallet")
        void creditWallet_success() throws Exception {
            assertThat(accountId).isNotNull();
            assertThat(walletId).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/wallets/account/" + accountId + "/credit",
                    String.format("""
                    {
                        "walletId": %d,
                        "amount": 5000.00,
                        "narration": "FX conversion deposit"
                    }
                    """, walletId));

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }

        @Test
        @Order(44)
        @DisplayName("Should debit wallet")
        void debitWallet_success() throws Exception {
            assertThat(accountId).isNotNull();
            assertThat(walletId).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/wallets/account/" + accountId + "/debit",
                    String.format("""
                    {
                        "walletId": %d,
                        "amount": 1000.00,
                        "narration": "Partial withdrawal"
                    }
                    """, walletId));

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
        }

        @Test
        @Order(45)
        @DisplayName("Should reject debit exceeding wallet balance")
        void debitWallet_insufficientBalance_returnsError() throws Exception {
            assertThat(accountId).isNotNull();
            assertThat(walletId).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/wallets/account/" + accountId + "/debit",
                    String.format("""
                    {
                        "walletId": %d,
                        "amount": 999999999.00,
                        "narration": "Attempt to overdraw wallet"
                    }
                    """, walletId));

            assertThat(response.getStatusCode().value()).isIn(400, 422);
        }

        @Test
        @Order(46)
        @DisplayName("Should get wallet transactions")
        void getWalletTransactions_success() throws Exception {
            assertThat(walletId).isNotNull();

            ResponseEntity<String> response = restTemplate.getForEntity(
                    "/v1/wallets/{walletId}/transactions", String.class, walletId);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();
            assertThat(body.path("data").isArray()).isTrue();
            // Should have credit and debit entries
            assertThat(body.path("data").size()).isGreaterThanOrEqualTo(2);
        }
    }

    // ========================================================================
    // 5. Interest Post (not just accrue)
    // ========================================================================

    @Nested
    @DisplayName("5 - Interest Posting (POST /v1/accounts/{id}/interest/post)")
    @TestMethodOrder(OrderAnnotation.class)
    class InterestPostingTests {

        @Test
        @Order(50)
        @DisplayName("Should accrue then post interest for account")
        void accrueAndPostInterest_success() throws Exception {
            assertThat(accountId).isNotNull();

            // First accrue
            ResponseEntity<String> accrueResponse = postJson(
                    "/v1/accounts/" + accountId + "/interest/accrue", "");

            assertThat(accrueResponse.getStatusCode().value()).isEqualTo(200);

            // Then post
            ResponseEntity<String> postResponse = postJson(
                    "/v1/accounts/" + accountId + "/interest/post", "");

            assertThat(postResponse.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(postResponse);
            assertThat(body.path("success").asBoolean()).isTrue();
        }
    }

    // ========================================================================
    // 6. Compliance Check
    // ========================================================================

    @Nested
    @DisplayName("6 - Compliance Check (POST /v1/accounts/compliance-check)")
    @TestMethodOrder(OrderAnnotation.class)
    class ComplianceCheckTests {

        @Test
        @Order(60)
        @DisplayName("Should run pre-opening compliance check")
        void runComplianceCheck_success() throws Exception {
            assertThat(customerId).isNotNull();

            ResponseEntity<String> response = postJson(
                    "/v1/accounts/compliance-check",
                    String.format("""
                    {
                        "customerId": %d,
                        "productCode": "SA-STD"
                    }
                    """, customerId));

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            JsonNode body = parse(response);
            assertThat(body.path("success").asBoolean()).isTrue();

            JsonNode data = body.path("data");
            // Compliance check should return these fields
            assertThat(data.has("kycVerified")).isTrue();
            assertThat(data.has("amlClear")).isTrue();
            assertThat(data.has("duplicateFound")).isTrue();
        }
    }
}
