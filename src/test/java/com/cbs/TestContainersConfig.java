package com.cbs;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Shared TestContainers PostgreSQL configuration.
 * <p>
 * When extended by integration tests, this automatically provisions a PostgreSQL
 * container and injects the datasource properties so tests do not require a
 * local PostgreSQL instance on port 5433.
 * <p>
 * The container is started once for the full JVM run and shared across all
 * test classes that extend {@link AbstractIntegrationTest}. This avoids stale
 * datasource URLs when Spring reuses an application context across test
 * classes.
 */
public abstract class TestContainersConfig {

    private static final boolean USE_LOCAL_DB =
            Boolean.parseBoolean(System.getenv().getOrDefault("CBS_TEST_LOCAL_DB", "false"));

    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES;

    static {
        if (USE_LOCAL_DB) {
            POSTGRES = null;
        } else {
            POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("cbs")
                    .withUsername("cbs_admin")
                    .withPassword("cbs_password");
            POSTGRES.start();
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (USE_LOCAL_DB) {
            return;
        }

        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
        registry.add("spring.flyway.schemas", () -> "cbs");
        registry.add("spring.flyway.default-schema", () -> "cbs");
        registry.add("spring.flyway.create-schemas", () -> "true");
    }
}
