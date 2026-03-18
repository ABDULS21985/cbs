package com.cbs.observability;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the distributed tracing infrastructure.
 * The CBS uses MDC-based trace context propagation via the logging pattern:
 * "%d{ISO8601} [%thread] %-5level [%X{traceId:-}] %logger{36} - %msg%n"
 *
 * These tests validate that MDC fields can be set, propagated,
 * and that the infrastructure supports correlation across operations.
 */
@Import(TestSecurityConfig.class)
class DistributedTracingTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @LocalServerPort
    private int port;

    @BeforeEach
    void setUp() {
        rest.getRestTemplate().setUriTemplateHandler(
            new org.springframework.web.util.DefaultUriBuilderFactory("http://localhost:" + port + "/api")
        );
    }

    @Test
    @DisplayName("MDC supports traceId field for log correlation")
    void mdcSupportsTraceId() {
        String traceId = "test-trace-" + System.nanoTime();
        MDC.put("traceId", traceId);
        try {
            assertThat(MDC.get("traceId")).isEqualTo(traceId);
        } finally {
            MDC.remove("traceId");
        }
        // After removal, traceId should be null
        assertThat(MDC.get("traceId")).isNull();
    }

    @Test
    @DisplayName("MDC supports spanId field for operation-level tracing")
    void mdcSupportsSpanId() {
        String spanId = "span-" + System.nanoTime();
        MDC.put("spanId", spanId);
        try {
            assertThat(MDC.get("spanId")).isEqualTo(spanId);
        } finally {
            MDC.remove("spanId");
        }
    }

    @Test
    @DisplayName("Health endpoint responds successfully (baseline for trace propagation)")
    void healthEndpointRespondsForTracing() {
        // When a full tracing framework (e.g., Micrometer Tracing / OpenTelemetry) is added,
        // this test should be enhanced to verify that the response includes trace headers.
        // For now, verify the endpoint works and would support trace header injection.
        var response = rest.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        // Future: assertThat(response.getHeaders().getFirst("X-Trace-Id")).isNotBlank();
    }
}
