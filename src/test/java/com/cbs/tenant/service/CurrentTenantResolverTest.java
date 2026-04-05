package com.cbs.tenant.service;

import com.cbs.tenant.entity.Tenant;
import com.cbs.tenant.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentTenantResolverTest {

    @Mock
    private TenantRepository tenantRepository;

    @InjectMocks
    private CurrentTenantResolver resolver;

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolveTenantId_usesActiveTenantFromHeaderCode() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Tenant-Code", "TENANT-A");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        when(tenantRepository.findByTenantCode("TENANT-A"))
                .thenReturn(Optional.of(activeTenant(11L, "TENANT-A")));

        Optional<Long> resolved = resolver.resolveTenantId();

        assertTrue(resolved.isPresent());
        assertEquals(11L, resolved.orElseThrow());
    }

    @Test
    void resolveTenantId_fallsBackToJwtNestedTenantCode() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("tenant", Map.of("tenantCode", "TENANT-B"))
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, List.of())
        );

        when(tenantRepository.findByTenantCode("TENANT-B"))
                .thenReturn(Optional.of(activeTenant(22L, "TENANT-B")));

        Optional<Long> resolved = resolver.resolveTenantId();

        assertTrue(resolved.isPresent());
        assertEquals(22L, resolved.orElseThrow());
    }

    @Test
    void resolveTenantId_fallsBackToSingleActiveTenant() {
        when(tenantRepository.findByIsActiveTrueOrderByTenantNameAsc())
                .thenReturn(List.of(activeTenant(33L, "ONLY")));

        Optional<Long> resolved = resolver.resolveTenantId();

        assertTrue(resolved.isPresent());
        assertEquals(33L, resolved.orElseThrow());
    }

    @Test
    void resolveTenantId_ignoresInactiveHeaderTenantAndUsesRequestParameter() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Tenant-Code", "INACTIVE");
        request.setParameter("tenantCode", "ACTIVE");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        when(tenantRepository.findByTenantCode("INACTIVE"))
                .thenReturn(Optional.of(inactiveTenant(44L, "INACTIVE")));
        when(tenantRepository.findByTenantCode("ACTIVE"))
                .thenReturn(Optional.of(activeTenant(55L, "ACTIVE")));

        Optional<Long> resolved = resolver.resolveTenantId();

        assertTrue(resolved.isPresent());
        assertEquals(55L, resolved.orElseThrow());
    }

    private Tenant activeTenant(Long id, String code) {
        return Tenant.builder()
                .id(id)
                .tenantCode(code)
                .tenantName(code)
                .tenantType("BANK")
                .isActive(true)
                .build();
    }

    private Tenant inactiveTenant(Long id, String code) {
        return Tenant.builder()
                .id(id)
                .tenantCode(code)
                .tenantName(code)
                .tenantType("BANK")
                .isActive(false)
                .build();
    }
}