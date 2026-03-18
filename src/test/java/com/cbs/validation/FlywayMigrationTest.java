package com.cbs.validation;

import com.cbs.AbstractIntegrationTest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayMigrationTest extends AbstractIntegrationTest {

    @Autowired
    private Flyway flyway;

    @Test
    void allMigrationsApplyCleanly() {
        var info = flyway.info();
        assertThat(info.applied()).isNotEmpty();
        assertThat(info.pending()).isEmpty();
        for (var migration : info.applied()) {
            assertThat(migration.getState().isApplied()).isTrue();
            assertThat(migration.getState().isFailed()).isFalse();
        }
    }

    @Test
    void noChecksumMismatches() {
        var result = flyway.validateWithResult();
        assertThat(result.validationSuccessful)
                .as("Flyway validation: " + result.getAllErrorMessages())
                .isTrue();
    }
}
