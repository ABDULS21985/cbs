package com.cbs.integration;

import com.cbs.common.exception.BusinessException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import com.cbs.integration.service.EsbService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sun.net.httpserver.HttpServer;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EsbServiceTest {

    @Mock private IntegrationRouteRepository routeRepository;
    @Mock private IntegrationMessageRepository messageRepository;
    @Mock private DeadLetterQueueRepository dlqRepository;
    @InjectMocks private EsbService esbService;

    @Test
    @DisplayName("Message delivered successfully through healthy route")
    void messageDelivered() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/deliver", exchange -> {
            byte[] response = "{\"status\":\"ok\"}".getBytes();
            exchange.sendResponseHeaders(200, response.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(response);
            }
        });
        server.start();

        try {
            IntegrationRoute route = IntegrationRoute.builder().id(1L).routeCode("CBS-TO-SWIFT")
                    .sourceSystem("CBS").targetSystem("SWIFT").protocol("HTTP")
                    .endpointUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/deliver")
                    .healthStatus("HEALTHY").timeoutMs(30000)
                    .retryPolicy(Map.of("max_retries", 3, "backoff_ms", 1000, "backoff_multiplier", 2)).build();

            when(routeRepository.findById(1L)).thenReturn(Optional.of(route));
            when(messageRepository.findByPayloadHash(any())).thenReturn(Optional.empty());
            when(messageRepository.save(any())).thenAnswer(inv -> { IntegrationMessage m = inv.getArgument(0); m.setId(1L); return m; });

            IntegrationMessage result = esbService.sendMessage(1L, "PAYMENT", "application/json", null, "{\"amount\":1000}");

            assertThat(result.getStatus()).isEqualTo("DELIVERED");
            assertThat(result.getProcessingTimeMs()).isNotNull();
            assertThat(result.getMessageId()).startsWith("MSG-");
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("Duplicate message returns existing (idempotent)")
    void duplicateDetection() {
        IntegrationRoute route = IntegrationRoute.builder().id(1L).routeCode("CBS-TO-SWIFT")
                .healthStatus("HEALTHY").build();
        IntegrationMessage existing = IntegrationMessage.builder().id(1L).messageId("MSG-EXISTING")
                .status("DELIVERED").build();

        when(routeRepository.findById(1L)).thenReturn(Optional.of(route));
        when(messageRepository.findByPayloadHash(any())).thenReturn(Optional.of(existing));

        IntegrationMessage result = esbService.sendMessage(1L, "PAYMENT", "application/json", null, "{\"amount\":1000}");
        assertThat(result.getMessageId()).isEqualTo("MSG-EXISTING");
        verify(messageRepository, never()).save(any());
    }

    @Test
    @DisplayName("Failed delivery persists DLQ entry with saved message id")
    void failedDeliveryCreatesDeadLetterEntry() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/deliver", exchange -> {
            byte[] response = "{\"status\":\"error\"}".getBytes();
            exchange.sendResponseHeaders(500, response.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(response);
            }
        });
        server.start();

        try {
            String payload = "{\"amount\":1000}";
            IntegrationRoute route = IntegrationRoute.builder().id(1L).routeCode("CBS-TO-SWIFT")
                    .sourceSystem("CBS").targetSystem("SWIFT").protocol("HTTP")
                    .endpointUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/deliver")
                    .healthStatus("HEALTHY").timeoutMs(30000)
                    .retryPolicy(Map.of("max_retries", 3, "backoff_ms", 1000, "backoff_multiplier", 2)).build();

            when(routeRepository.findById(1L)).thenReturn(Optional.of(route));
            when(messageRepository.findByPayloadHash(any())).thenReturn(Optional.empty());
            when(messageRepository.save(any())).thenAnswer(inv -> {
                IntegrationMessage m = inv.getArgument(0);
                if (m.getId() == null) {
                    m.setId(99L);
                }
                return m;
            });
            when(dlqRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            IntegrationMessage result = esbService.sendMessage(1L, "PAYMENT", "application/json", null, payload);

            assertThat(result.getStatus()).isEqualTo("FAILED");
            assertThat(result.getErrorMessage()).contains("HTTP 500");
            verify(dlqRepository).save(argThat(dlq ->
                    dlq.getMessageId().equals(99L)
                            && dlq.getRouteId().equals(1L)
                            && payload.equals(dlq.getOriginalPayload())
                            && "PENDING".equals(dlq.getStatus())
            ));
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("Retrying a failed DLQ entry requeues it when delivery still fails")
    void retryFailureRequeuesDeadLetter() {
        IntegrationRoute route = IntegrationRoute.builder().id(1L).routeCode("CBS-TO-SWIFT")
                .protocol("JMS").healthStatus("UNKNOWN")
                .retryPolicy(Map.of("max_retries", 3, "backoff_ms", 1000, "backoff_multiplier", 2)).build();
        IntegrationMessage originalMessage = IntegrationMessage.builder().id(5L).messageId("MSG-123")
                .routeId(1L).direction("OUTBOUND").messageType("PAYMENT").contentType("application/json")
                .status("FAILED").build();
        DeadLetterQueue dlq = DeadLetterQueue.builder()
                .id(7L)
                .messageId(5L)
                .routeId(1L)
                .failureReason("Initial failure")
                .originalPayload("{\"amount\":1000}")
                .retryCount(0)
                .maxRetries(3)
                .status("PENDING")
                .createdAt(Instant.now())
                .build();

        when(dlqRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(dlq));
        when(messageRepository.findById(5L)).thenReturn(Optional.of(originalMessage));
        when(routeRepository.findById(1L)).thenReturn(Optional.of(route));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(dlqRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int retried = esbService.retryDeadLetters();

        assertThat(retried).isEqualTo(1);
        assertThat(originalMessage.getStatus()).isEqualTo("DEAD_LETTER");
        assertThat(dlq.getStatus()).isEqualTo("PENDING");
        assertThat(dlq.getRetryCount()).isEqualTo(1);
        assertThat(dlq.getNextRetryAt()).isNotNull();
    }

    @Test
    @DisplayName("Circuit breaker rejects message to DOWN route")
    void circuitBreakerOpen() {
        IntegrationRoute downRoute = IntegrationRoute.builder().id(1L).routeCode("CBS-TO-SWIFT")
                .healthStatus("DOWN").build();
        when(routeRepository.findById(1L)).thenReturn(Optional.of(downRoute));

        assertThatThrownBy(() -> esbService.sendMessage(1L, "PAYMENT", "application/json", null, "{}"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("circuit open");
    }
}
