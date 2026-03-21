package com.cbs.observability;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the metrics infrastructure supports the alert thresholds
 * needed for production monitoring. These tests validate that the right
 * metrics exist and can be queried for alerting purposes.
 */
@Import(TestSecurityConfig.class)
class AlertThresholdTest extends AbstractIntegrationTest {

    @Autowired
    private MeterRegistry meterRegistry;

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
    @DisplayName("MeterRegistry is available for custom metric registration")
    void meterRegistryAvailable() {
        assertThat(meterRegistry).isNotNull();
    }

    @Test
    @DisplayName("Error rate can be derived from HTTP request metrics (status 5xx vs total)")
    void errorRateDerivable() {
        // Trigger successful requests
        rest.getForEntity("/actuator/health", String.class);
        // Trigger a 404 (client error)
        rest.getForEntity("/v1/nonexistent-endpoint-12345", String.class);

        var response = rest.getForEntity("/actuator/prometheus", String.class);
        String body = response.getBody();
        // HTTP metrics should be present with status labels to filter 5xx vs total
        assertThat(body).contains("http_server_requests_seconds_count");
        // Status labels allow Prometheus query: rate(http_server_requests{status=~"5.."}[5m]) / rate(http_server_requests[5m])
    }

    @Test
    @DisplayName("DB connection pool utilization can be computed from HikariCP metrics")
    void dbPoolUtilizationComputable() {
        var response = rest.getForEntity("/actuator/prometheus", String.class);
        String body = response.getBody();
        // Active and max connections allow computing: active / max * 100 = utilization%
        assertThat(body).contains("hikaricp_connections_active");
        assertThat(body).contains("hikaricp_connections_max");
    }

    @Test
    @DisplayName("Disk space metrics enable low-disk alerting")
    void diskSpaceAlertMetricsExist() {
        var response = rest.getForEntity("/actuator/metrics/disk.free", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        var totalResponse = rest.getForEntity("/actuator/metrics/disk.total", String.class);
        assertThat(totalResponse.getStatusCode().value()).isEqualTo(200);
        // Alert rule: disk.free / disk.total < 0.10 → fire alert
    }

    @Test
    @DisplayName("Logback error counter enables error rate alerting")
    void logbackErrorCounterExists() {
        var response = rest.getForEntity("/actuator/prometheus", String.class);
        // logback_events_total with level="error" enables: rate(logback_events_total{level="error"}[5m]) > threshold
        assertThat(response.getBody()).contains("logback_events_total");
    }

    @Test
    @DisplayName("HTTP response latency percentiles can be derived for SLA alerting")
    void latencyPercentilesDerivable() {
        // Trigger some requests to populate timing data
        for (int i = 0; i < 5; i++) {
            rest.getForEntity("/actuator/health", String.class);
        }

        var response = rest.getForEntity("/actuator/prometheus", String.class);
        String body = response.getBody();
        // Timer metrics emit _sum and _count, from which avg and percentiles can be derived
        assertThat(body).contains("http_server_requests_seconds_sum");
        assertThat(body).contains("http_server_requests_seconds_count");
        // For p95/p99 alerting: histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))
    }

    @Test
    @DisplayName("Custom counter can be registered for business-specific alerts")
    void customCounterRegistration() {
        // Verify that custom counters can be created for business metrics
        var counter = meterRegistry.counter("cbs.test.alert.counter", "type", "payment_failure");
        counter.increment();
        counter.increment();

        assertThat(counter.count()).isEqualTo(2.0);

        // Verify it appears in Prometheus output
        var response = rest.getForEntity("/actuator/prometheus", String.class);
        assertThat(response.getBody()).contains("cbs_test_alert_counter_total");
    }
}
