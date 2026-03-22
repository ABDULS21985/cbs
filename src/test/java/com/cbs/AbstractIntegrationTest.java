package com.cbs;

import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Base class for integration tests.
 * <p>
 * Extends {@link TestContainersConfig} to automatically provision a PostgreSQL
 * container via TestContainers. Tests no longer require a local PostgreSQL
 * instance on port 5433 — the container is started once and reused across
 * all test classes.
 * <p>
 * If you prefer to use a local database instead, set the environment variable
 * {@code CBS_TEST_LOCAL_DB=true} and ensure PostgreSQL is running on port 5433.
 * The {@code application-test.yml} datasource properties will take precedence
 * when no {@link org.springframework.test.context.DynamicPropertySource} is active.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest extends TestContainersConfig {
}
