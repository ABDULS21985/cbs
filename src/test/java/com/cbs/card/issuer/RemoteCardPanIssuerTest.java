package com.cbs.card.issuer;

import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.CardType;
import com.cbs.common.exception.BusinessException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RemoteCardPanIssuerTest {

    @Test
    @DisplayName("issuePan maps a typed remote issuer response into CardPanIssueResult")
    void issuePan_Success() throws Exception {
        AtomicReference<String> authHeader = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/cards/pan", exchange -> respond(exchange,
                200,
                """
                        {
                          "cardNumber":"4111111111111111",
                          "issuerReference":"ISS-REF-001",
                          "issuerName":"HSM_GATEWAY"
                        }
                        """,
                authHeader,
                requestBody));
        server.start();
        try {
            RemoteCardPanIssuer issuer = new RemoteCardPanIssuer(
                    "http://localhost:" + server.getAddress().getPort() + "/cards/pan",
                    "secret-token",
                    "BANK01",
                    10
            );

            CardPanIssueResult result = issuer.issuePan(new CardPanIssueCommand(
                    "CRD-0001",
                    10L,
                    20L,
                    CardType.DEBIT,
                    CardScheme.VISA,
                    "CLASSIC",
                    "AMINA BELLO",
                    "BR001",
                    "USD",
                    LocalDate.of(2029, 12, 31)
            ));

            assertThat(result.pan()).isEqualTo("4111111111111111");
            assertThat(result.providerReference()).isEqualTo("ISS-REF-001");
            assertThat(result.providerName()).isEqualTo("HSM_GATEWAY");
            assertThat(authHeader.get()).isEqualTo("Bearer secret-token");
            assertThat(requestBody.get()).contains("\"cardReference\":\"CRD-0001\"");
            assertThat(requestBody.get()).contains("\"institutionId\":\"BANK01\"");
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("issuePan rejects a remote response that contains an invalid PAN")
    void issuePan_InvalidPan() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/cards/pan", exchange -> respond(exchange,
                200,
                """
                        {
                          "pan":"1234567890123456"
                        }
                        """,
                null,
                null));
        server.start();
        try {
            RemoteCardPanIssuer issuer = new RemoteCardPanIssuer(
                    "http://localhost:" + server.getAddress().getPort() + "/cards/pan",
                    null,
                    "BANK01",
                    10
            );

            assertThatThrownBy(() -> issuer.issuePan(new CardPanIssueCommand(
                    "CRD-0002",
                    10L,
                    20L,
                    CardType.DEBIT,
                    CardScheme.VISA,
                    "CLASSIC",
                    "AMINA BELLO",
                    "BR001",
                    "USD",
                    LocalDate.of(2029, 12, 31)
            )))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("invalid PAN");
        } finally {
            server.stop(0);
        }
    }

    private void respond(HttpExchange exchange,
                         int status,
                         String body,
                         AtomicReference<String> authHeader,
                         AtomicReference<String> requestBody) throws IOException {
        try (exchange) {
            if (authHeader != null) {
                authHeader.set(exchange.getRequestHeaders().getFirst("Authorization"));
            }
            if (requestBody != null) {
                requestBody.set(new String(exchange.getRequestBody().readAllBytes()));
            } else {
                exchange.getRequestBody().readAllBytes();
            }
            exchange.getResponseHeaders().set(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
            byte[] bytes = body.getBytes();
            exchange.sendResponseHeaders(status, bytes.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(bytes);
            }
        }
    }
}