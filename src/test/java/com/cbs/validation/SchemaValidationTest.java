package com.cbs.validation;

import com.cbs.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import static org.assertj.core.api.Assertions.assertThat;

class SchemaValidationTest extends AbstractIntegrationTest {
    @Autowired private ApplicationContext context;

    @Test
    void contextLoads_allEntitiesValidateAgainstSchema() {
        assertThat(context).isNotNull();
    }
}
