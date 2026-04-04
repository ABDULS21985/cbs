package com.cbs.tenant.service;

import com.cbs.tenant.entity.Tenant;
import com.cbs.tenant.repository.TenantRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CurrentTenantResolver {

    private static final Logger log = LoggerFactory.getLogger(CurrentTenantResolver.class);

    private final TenantRepository tenantRepository;

    public Optional<Long> resolveTenantId() {
        Optional<Long> fromHeader = resolveFromRequestHeader();
        if (fromHeader.isPresent()) {
            return fromHeader;
        }

        return resolveFromAuthentication();
    }

    public Long getCurrentTenantIdOrDefault(Long defaultTenantId) {
        return resolveTenantId().orElse(defaultTenantId);
    }

    public Long getCurrentTenantId() {
        return getCurrentTenantIdOrDefault(null);
    }

    private Optional<Long> resolveFromRequestHeader() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return Optional.empty();
        }

        HttpServletRequest request = attributes.getRequest();
        String tenantIdHeader = firstNonBlank(
                request.getHeader("X-Tenant-Id"),
                request.getHeader("x-tenant-id")
        );
        if (StringUtils.hasText(tenantIdHeader)) {
            try {
                return Optional.of(Long.parseLong(tenantIdHeader));
            } catch (NumberFormatException ex) {
                log.warn("Ignoring invalid X-Tenant-Id header value '{}'", tenantIdHeader);
            }
        }

        String tenantCodeHeader = firstNonBlank(
                request.getHeader("X-Tenant-Code"),
                request.getHeader("x-tenant-code")
        );
        if (!StringUtils.hasText(tenantCodeHeader)) {
            return Optional.empty();
        }

        return tenantRepository.findByTenantCode(tenantCodeHeader.trim())
                .map(Tenant::getId);
    }

    private Optional<Long> resolveFromAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof Jwt jwt)) {
            return Optional.empty();
        }

        Optional<Long> tenantId = firstNumericClaim(jwt, "tenant_id", "tenantId");
        if (tenantId.isPresent()) {
            return tenantId;
        }

        return firstTextClaim(jwt, "tenant_code", "tenantCode")
                .flatMap(tenantRepository::findByTenantCode)
                .map(Tenant::getId);
    }

    private Optional<Long> firstNumericClaim(Jwt jwt, String... claimNames) {
        for (String claimName : claimNames) {
            Object raw = jwt.getClaim(claimName);
            if (raw instanceof Number number) {
                return Optional.of(number.longValue());
            }
            if (raw instanceof String text && StringUtils.hasText(text)) {
                try {
                    return Optional.of(Long.parseLong(text));
                } catch (NumberFormatException ex) {
                    log.warn("Ignoring invalid tenant claim {}='{}'", claimName, text);
                }
            }
        }
        return Optional.empty();
    }

    private Optional<String> firstTextClaim(Jwt jwt, String... claimNames) {
        for (String claimName : claimNames) {
            String value = jwt.getClaimAsString(claimName);
            if (StringUtils.hasText(value)) {
                return Optional.of(value.trim());
            }
        }
        return Optional.empty();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
