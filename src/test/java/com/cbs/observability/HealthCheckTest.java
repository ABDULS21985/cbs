package com.cbs.observability;

import com.cbs.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import com.cbs.TestSecurityConfig;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestSecurityConfig.class)
class HealthCheckTest extends AbstractIntegrationTest {

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
    @DisplayName("Liveness endpoint returns UP")
    void livenessEndpointReturnsUp() {
        var response = rest.getForEntity("/actuator/health/liveness", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Readiness endpoint returns UP")
    void readinessEndpointReturnsUp() {
        var response = rest.getForEntity("/actuator/health/readiness", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Health endpoint includes database status")
    void healthIncludesDatabaseStatus() {
        var response = rest.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"db\"");
    }

    @Test
    @DisplayName("Health endpoint includes disk space status")
    void healthIncludesDiskSpaceStatus() {
        var response = rest.getForEntity("/actuator/health", String.class);
        assertThat(response.getBody()).contains("\"diskSpace\"");
    }

    @Test
    @DisplayName("Health endpoint returns overall status UP when all components healthy")
    void healthReturnsOverallStatusUp() {
        var response = rest.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        // The top-level status should be UP when database and disk are healthy
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("Metrics endpoint is accessible")
    void metricsEndpointAccessible() {
        var response = rest.getForEntity("/actuator/metrics", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"names\"");
    }

    @Test
    @DisplayName("Prometheus endpoint is accessible and returns metrics in Prometheus format")
    void prometheusEndpointAccessible() {
        var response = rest.getForEntity("/actuator/prometheus", String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        // Prometheus format contains metric names with # HELP and # TYPE headers
        assertThat(response.getBody()).contains("# HELP");
        assertThat(response.getBody()).contains("# TYPE");
    }
}
