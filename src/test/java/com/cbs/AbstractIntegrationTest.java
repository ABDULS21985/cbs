package com.cbs;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Use the existing PostgreSQL container (cbs-postgres on port 5432)
        registry.add("spring.datasource.url", () -> "jdbc:postgresql://localhost:5432/cbs");
        registry.add("spring.datasource.username", () -> "cbs_admin");
        registry.add("spring.datasource.password", () -> "cbs_password");
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.flyway.enabled", () -> "false"); // migrations already applied
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri",
                () -> "http://localhost:8180/realms/cbs");
    }
}
