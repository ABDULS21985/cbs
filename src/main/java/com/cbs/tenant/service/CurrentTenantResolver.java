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

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CurrentTenantResolver {

    private static final Logger log = LoggerFactory.getLogger(CurrentTenantResolver.class);

    private final TenantRepository tenantRepository;

    public Optional<Long> resolveTenantId() {
        return resolveFromRequestHeader()
                .or(this::resolveFromRequestParameterOrAttribute)
                .or(this::resolveFromAuthentication)
                .or(this::resolveSingleActiveTenant);
    }

    public Long getCurrentTenantIdOrDefault(Long defaultTenantId) {
        return resolveTenantId().orElse(defaultTenantId);
    }

    public Long getCurrentTenantId() {
        return getCurrentTenantIdOrDefault(null);
    }

    private Optional<Long> resolveFromRequestHeader() {
        Optional<HttpServletRequest> request = currentRequest();
        if (request.isEmpty()) {
            return Optional.empty();
        }

        String tenantIdHeader = firstNonBlank(
                request.get().getHeader("X-Tenant-Id"),
                request.get().getHeader("x-tenant-id")
        );
        Optional<Long> tenantId = resolveActiveTenantId(tenantIdHeader, "X-Tenant-Id");
        if (tenantId.isPresent()) {
            return tenantId;
        }

        String tenantCodeHeader = firstNonBlank(
                request.get().getHeader("X-Tenant-Code"),
                request.get().getHeader("x-tenant-code"),
                request.get().getHeader("X-Tenant"),
                request.get().getHeader("x-tenant")
        );
        return resolveActiveTenantCode(tenantCodeHeader, "tenant header");
    }

    private Optional<Long> resolveFromRequestParameterOrAttribute() {
        Optional<HttpServletRequest> request = currentRequest();
        if (request.isEmpty()) {
            return Optional.empty();
        }

        String tenantId = firstNonBlank(
                request.get().getParameter("tenantId"),
                request.get().getParameter("tenant_id"),
                stringAttribute(request.get(), "tenantId"),
                stringAttribute(request.get(), "tenant_id")
        );
        Optional<Long> resolvedTenantId = resolveActiveTenantId(tenantId, "request tenantId");
        if (resolvedTenantId.isPresent()) {
            return resolvedTenantId;
        }

        String tenantCode = firstNonBlank(
                request.get().getParameter("tenantCode"),
                request.get().getParameter("tenant_code"),
                request.get().getParameter("tenant"),
                stringAttribute(request.get(), "tenantCode"),
                stringAttribute(request.get(), "tenant_code"),
                stringAttribute(request.get(), "tenant")
        );
        return resolveActiveTenantCode(tenantCode, "request tenantCode");
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
            return tenantId.flatMap(id -> tenantRepository.findById(id)
                    .filter(Tenant::getIsActive)
                    .map(Tenant::getId));
        }

        return firstTextClaim(jwt, "tenant_code", "tenantCode", "tenant")
                .flatMap(code -> resolveActiveTenantCode(code, "JWT claim"));
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
            Object claim = jwt.getClaim(claimName);
            if (claim instanceof String text && StringUtils.hasText(text)) {
                return Optional.of(text.trim());
            }
            if (claim instanceof Map<?, ?> map) {
                String nested = firstNonBlank(
                        map.get("tenantCode") != null ? String.valueOf(map.get("tenantCode")) : null,
                        map.get("tenant_code") != null ? String.valueOf(map.get("tenant_code")) : null
                );
                if (StringUtils.hasText(nested)) {
                    return Optional.of(nested.trim());
                }
            }
            String value = jwt.getClaimAsString(claimName);
            if (StringUtils.hasText(value)) {
                return Optional.of(value.trim());
            }
        }
        return Optional.empty();
    }

    private Optional<Long> resolveSingleActiveTenant() {
        List<Tenant> activeTenants = tenantRepository.findByIsActiveTrueOrderByTenantNameAsc();
        if (activeTenants.size() == 1) {
            return Optional.of(activeTenants.getFirst().getId());
        }
        return Optional.empty();
    }

    private Optional<Long> resolveActiveTenantId(String rawTenantId, String source) {
        if (!StringUtils.hasText(rawTenantId)) {
            return Optional.empty();
        }
        try {
            Long parsedTenantId = Long.parseLong(rawTenantId.trim());
            return tenantRepository.findById(parsedTenantId)
                    .filter(Tenant::getIsActive)
                    .map(Tenant::getId)
                    .or(() -> {
                        log.warn("Ignoring inactive or unknown tenant id '{}' from {}", rawTenantId, source);
                        return Optional.empty();
                    });
        } catch (NumberFormatException ex) {
            log.warn("Ignoring invalid tenant id '{}' from {}", rawTenantId, source);
            return Optional.empty();
        }
    }

    private Optional<Long> resolveActiveTenantCode(String rawTenantCode, String source) {
        if (!StringUtils.hasText(rawTenantCode)) {
            return Optional.empty();
        }
        return tenantRepository.findByTenantCode(rawTenantCode.trim())
                .filter(Tenant::getIsActive)
                .map(Tenant::getId)
                .or(() -> {
                    log.warn("Ignoring inactive or unknown tenant code '{}' from {}", rawTenantCode, source);
                    return Optional.empty();
                });
    }

    private Optional<HttpServletRequest> currentRequest() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes == null ? Optional.empty() : Optional.of(attributes.getRequest());
    }

    private String stringAttribute(HttpServletRequest request, String attributeName) {
        Object value = request.getAttribute(attributeName);
        return value == null ? null : String.valueOf(value);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
