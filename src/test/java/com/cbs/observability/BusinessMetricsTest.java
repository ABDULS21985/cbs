package com.cbs.observability;

import com.cbs.AbstractIntegrationTest;
import com.cbs.TestSecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the CBS emits the correct business and infrastructure metrics
 * via the Micrometer/Prometheus endpoint. These metrics are critical for
 * dashboarding, alerting, and capacity planning.
 */
@Import(TestSecurityConfig.class)
class BusinessMetricsTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @LocalServerPort
    private int port;

    private String prometheusBody;

    @BeforeEach
    void setUp() {
        rest.getRestTemplate().setUriTemplateHandler(
            new org.springframework.web.util.DefaultUriBuilderFactory("http://localhost:" + port + "/api")
        );
        // Trigger at least one HTTP request to populate metrics
        rest.getForEntity("/actuator/health", String.class);
        var response = rest.getForEntity("/actuator/prometheus", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        prometheusBody = response.getBody();
    }

    // --- HTTP Server Metrics ---

    @Test
    @DisplayName("HTTP server request count metric is emitted")
    void httpServerRequestCountEmitted() {
        assertThat(prometheusBody).contains("http_server_requests_seconds_count");
    }

    @Test
    @DisplayName("HTTP server request duration metric is emitted")
    void httpServerRequestDurationEmitted() {
        assertThat(prometheusBody).contains("http_server_requests_seconds_sum");
    }

    @Test
    @DisplayName("HTTP server request metrics include URI and status labels")
    void httpServerRequestMetricsHaveLabels() {
        // Prometheus metrics should include uri and status labels for filtering
        assertThat(prometheusBody).contains("uri=");
        assertThat(prometheusBody).contains("status=");
    }

    // --- JVM Metrics ---

    @Test
    @DisplayName("JVM memory used metric is emitted")
    void jvmMemoryUsedEmitted() {
        assertThat(prometheusBody).contains("jvm_memory_used_bytes");
    }

    @Test
    @DisplayName("JVM memory max metric is emitted")
    void jvmMemoryMaxEmitted() {
        assertThat(prometheusBody).contains("jvm_memory_max_bytes");
    }

    @Test
    @DisplayName("JVM GC pause metric is emitted")
    void jvmGcPauseEmitted() {
        assertThat(prometheusBody).contains("jvm_gc_pause_seconds");
    }

    @Test
    @DisplayName("JVM thread count metric is emitted")
    void jvmThreadCountEmitted() {
        assertThat(prometheusBody).contains("jvm_threads_live_threads");
    }

    // --- HikariCP Connection Pool Metrics ---

    @Test
    @DisplayName("HikariCP active connections metric is emitted")
    void hikariActiveConnectionsEmitted() {
        assertThat(prometheusBody).contains("hikaricp_connections_active");
    }

    @Test
    @DisplayName("HikariCP idle connections metric is emitted")
    void hikariIdleConnectionsEmitted() {
        assertThat(prometheusBody).contains("hikaricp_connections_idle");
    }

    @Test
    @DisplayName("HikariCP max connections metric is emitted")
    void hikariMaxConnectionsEmitted() {
        assertThat(prometheusBody).contains("hikaricp_connections_max");
    }

    @Test
    @DisplayName("HikariCP pending connections metric is emitted")
    void hikariPendingConnectionsEmitted() {
        assertThat(prometheusBody).contains("hikaricp_connections_pending");
    }

    // --- System Metrics ---

    @Test
    @DisplayName("Process CPU usage metric is emitted")
    void processCpuUsageEmitted() {
        assertThat(prometheusBody).contains("process_cpu_usage");
    }

    @Test
    @DisplayName("System uptime metric is emitted")
    void systemUptimeEmitted() {
        assertThat(prometheusBody).contains("process_uptime_seconds");
    }
}
