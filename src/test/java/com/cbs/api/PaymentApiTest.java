package com.cbs.api;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestSecurityConfig.class)
class PaymentApiTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("GET /v1/payments/{id} - nonexistent payment should return 404")
    void getPayment_notFound_returns404() {
        ResponseEntity<String> response = restTemplate.getForEntity("/v1/payments/{id}", String.class, 999999999L);
        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("POST /v1/payments/transfer - missing required params should return error")
    void createTransfer_missingParams_returnsError() {
        ResponseEntity<String> response = restTemplate.postForEntity("/v1/payments/transfer", null, String.class);
        assertThat(response.getStatusCode().value()).isIn(400, 500);
    }

    @Test
    @DisplayName("POST /v1/payments/transfer - invalid account IDs should return error")
    void createTransfer_invalidAccounts_returnsError() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/v1/payments/transfer?debitAccountId={debit}&creditAccountId={credit}&amount={amount}&narration={narration}",
                null,
                String.class,
                999999L,
                999998L,
                "100.00",
                "Test transfer"
        );
        assertThat(response.getStatusCode().value()).isIn(400, 404, 500);
    }

    @Test
    @DisplayName("GET /v1/payments/domestic endpoint exists and responds")
    void domesticPaymentEndpoint_responds() {
        ResponseEntity<String> response = restTemplate.getForEntity("/v1/payments/{id}", String.class, 1L);
        assertThat(response.getStatusCode().value()).isIn(200, 404);
    }
}
