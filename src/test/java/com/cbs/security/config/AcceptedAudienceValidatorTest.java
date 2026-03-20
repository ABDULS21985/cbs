package com.cbs.security.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AcceptedAudienceValidatorTest {

    private final AcceptedAudienceValidator validator = new AcceptedAudienceValidator(List.of("cbs-app", "cbs-api"));

    @Test
    void acceptsConfiguredAudience() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("aud", List.of("cbs-api"))
                .build();

        assertThat(validator.validate(jwt).hasErrors()).isFalse();
    }

    @Test
    void acceptsMatchingAuthorizedPartyForKeycloakTokens() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("aud", List.of("account"))
                .claim("azp", "cbs-app")
                .build();

        assertThat(validator.validate(jwt).hasErrors()).isFalse();
    }

    @Test
    void rejectsUnexpectedAudience() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("aud", List.of("account"))
                .claim("azp", "other-client")
                .build();

        assertThat(validator.validate(jwt).hasErrors()).isTrue();
    }
}
