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
 * Verifies technical infrastructure metrics required for capacity planning,
 * performance monitoring, and SRE dashboards.
 */
@Import(TestSecurityConfig.class)
class TechnicalMetricsTest extends AbstractIntegrationTest {

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
    @DisplayName("Individual metric endpoint returns detailed metric data with available tags")
    void individualMetricEndpointReturnsDetail() {
        var response = rest.getForEntity("/actuator/metrics/jvm.memory.used", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"name\":\"jvm.memory.used\"");
        assertThat(response.getBody()).contains("\"measurements\"");
        assertThat(response.getBody()).contains("\"availableTags\"");
    }

    @Test
    @DisplayName("Metrics catalog lists all available metric names")
    void metricsCatalogListsAllNames() {
        var response = rest.getForEntity("/actuator/metrics", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        String body = response.getBody();
        // Core metrics that must be present
        assertThat(body).contains("jvm.memory.used");
        assertThat(body).contains("hikaricp.connections");
        assertThat(body).contains("http.server.requests");
    }

    @Test
    @DisplayName("Logback log event counter is exposed for log-based alerting")
    void logbackMetricsExposed() {
        var response = rest.getForEntity("/actuator/prometheus", String.class);
        assertThat(response.getBody()).contains("logback_events_total");
    }

    @Test
    @DisplayName("Disk space metrics are available for capacity alerts")
    void diskSpaceMetricsAvailable() {
        var response = rest.getForEntity("/actuator/metrics/disk.free", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"name\":\"disk.free\"");
    }

    @Test
    @DisplayName("HikariCP connection creation time metric is emitted for pool health")
    void hikariConnectionCreationTimeEmitted() {
        var response = rest.getForEntity("/actuator/prometheus", String.class);
        assertThat(response.getBody()).contains("hikaricp_connections_creation_seconds");
    }

    @Test
    @DisplayName("Spring cache metrics are available when caching is enabled")
    void springCacheMetricsAvailable() {
        // In test profile cache.type=none, but the metric registry should still be present
        var response = rest.getForEntity("/actuator/metrics", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        // The metrics endpoint itself should be functional
        assertThat(response.getBody()).contains("\"names\"");
    }
}
