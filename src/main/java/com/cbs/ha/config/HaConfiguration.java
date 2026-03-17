package com.cbs.ha.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;
import lombok.Setter;

/**
 * High Availability & Disaster Recovery configuration (Cap 83).
 *
 * Supports:
 * - Active-Active or Active-Passive clustering
 * - Read replicas for reporting queries
 * - Redis session clustering for stateless horizontal scaling
 * - Circuit breaker for downstream service resilience
 * - Automated failover with configurable RPO/RTO targets
 */
@Configuration
@ConfigurationProperties(prefix = "cbs.ha")
@Getter @Setter
public class HaConfiguration {

    /** Cluster mode: ACTIVE_ACTIVE or ACTIVE_PASSIVE */
    private String clusterMode = "ACTIVE_ACTIVE";

    /** Recovery Point Objective in seconds (target: < 60s) */
    private int rpoSeconds = 60;

    /** Recovery Time Objective in seconds (target: < 900s / 15 min) */
    private int rtoSeconds = 900;

    /** Enable geo-replication across data centres */
    private boolean geoReplicationEnabled = false;

    /** Read replica for reporting/analytics queries */
    private ReadReplica readReplica = new ReadReplica();

    /** Redis cluster for session management */
    private RedisCluster redisCluster = new RedisCluster();

    /** Circuit breaker defaults */
    private CircuitBreaker circuitBreaker = new CircuitBreaker();

    /** Health check interval for failover detection */
    private int healthCheckIntervalSeconds = 10;

    /** Number of consecutive failures before failover */
    private int failoverThreshold = 3;

    @Getter @Setter
    public static class ReadReplica {
        private boolean enabled = false;
        private String url;
        private String username;
        private String password;
    }

    @Getter @Setter
    public static class RedisCluster {
        private boolean enabled = true;
        private String nodes = "localhost:6379";
        private int sessionTimeoutSeconds = 1800;
        private int connectionPoolSize = 20;
    }

    @Getter @Setter
    public static class CircuitBreaker {
        private int failureRateThreshold = 50;
        private int slowCallRateThreshold = 80;
        private int slowCallDurationMs = 5000;
        private int waitDurationInOpenStateSeconds = 30;
        private int slidingWindowSize = 10;
    }
}
