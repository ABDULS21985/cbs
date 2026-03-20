package com.cbs.security.config;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

final class AcceptedAudienceValidator implements OAuth2TokenValidator<Jwt> {

    private final Set<String> acceptedAudiences;

    AcceptedAudienceValidator(Collection<String> acceptedAudiences) {
        this.acceptedAudiences = acceptedAudiences.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        boolean matchesAudience = token.getAudience().stream().anyMatch(acceptedAudiences::contains);
        String authorizedParty = token.getClaimAsString("azp");
        boolean matchesAuthorizedParty = StringUtils.hasText(authorizedParty) && acceptedAudiences.contains(authorizedParty);

        if (matchesAudience || matchesAuthorizedParty) {
            return OAuth2TokenValidatorResult.success();
        }

        OAuth2Error error = new OAuth2Error(
                OAuth2ErrorCodes.INVALID_TOKEN,
                "Token audience is not accepted by this API.",
                null
        );
        return OAuth2TokenValidatorResult.failure(error);
    }
}
