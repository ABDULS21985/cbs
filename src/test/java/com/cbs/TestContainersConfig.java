package com.cbs;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Shared TestContainers PostgreSQL configuration.
 * <p>
 * When extended by integration tests, this automatically provisions a PostgreSQL
 * container and injects the datasource properties so tests do not require a
 * local PostgreSQL instance on port 5433.
 * <p>
 * The container is started once and shared across all test classes that extend
 * {@link AbstractIntegrationTest}, reducing startup time.
 */
@Testcontainers
public abstract class TestContainersConfig {

    @SuppressWarnings("resource") // Lifecycle managed by TestContainers @Container
    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("cbs")
                    .withUsername("cbs_admin")
                    .withPassword("cbs_password")
                    .withReuse(true);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
        registry.add("spring.flyway.create-schemas", () -> "true");
    }
}
