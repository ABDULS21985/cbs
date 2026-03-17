package com.cbs.common.audit;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class SecurityAuditorAware implements AuditorAware<String> {

    private static final String SYSTEM_USER = "SYSTEM";

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.of(SYSTEM_USER);
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String subject = jwt.getClaimAsString("preferred_username");
            return Optional.ofNullable(subject != null ? subject : jwt.getSubject());
        }
        if (principal instanceof String name) {
            return Optional.of(name);
        }
        return Optional.of(SYSTEM_USER);
    }
}
