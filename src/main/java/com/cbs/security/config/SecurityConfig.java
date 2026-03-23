package com.cbs.security.config;

import com.cbs.common.config.CbsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.security.oauth2.server.resource.autoconfigure.OAuth2ResourceServerProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

@Configuration
@Profile("!loadtest")
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SecurityConfig.class);

    private final CbsProperties cbsProperties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, OAuth2ResourceServerProperties properties) throws Exception {
        boolean devMode = !StringUtils.hasText(properties.getJwt().getIssuerUri());
        if (devMode) {
            log.warn("=== CBS SECURITY: Dev mode active (CBS_OAUTH2_ISSUER_URI not set). "
                    + "A mock admin user is injected so @PreAuthorize annotations are still enforced. "
                    + "Set CBS_OAUTH2_ISSUER_URI to enable production security. ===");
        }
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    cbsProperties.getSecurity().getPublicPaths().forEach(path -> auth.requestMatchers(path).permitAll());
                    auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                    if (devMode) {
                        // In dev mode, still require authentication but inject a mock user
                        // so @PreAuthorize annotations are evaluated properly
                        auth.anyRequest().authenticated();
                    } else {
                        auth.anyRequest().authenticated();
                    }
                });
        if (devMode) {
            // Inject mock authentication filter before all requests so @PreAuthorize works
            http.addFilterBefore(new DevModeAuthenticationFilter(),
                    org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        } else {
            // Configure OAuth2 resource server first, then add dev-token filter before it.
            // The dev filter intercepts dev-* tokens from the frontend dev-login shortcut
            // before they reach BearerTokenAuthenticationFilter (which would reject them as invalid JWTs).
            // Real Keycloak JWTs pass through to the standard OAuth2 resource server filter.
            http.oauth2ResourceServer(oauth2 -> oauth2
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            );
            http.addFilterBefore(new DevModeAuthenticationFilter(/* hybridMode */ true),
                    org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter.class);
        }
        return http.build();
    }

    /**
     * Filter that injects a mock authentication principal in dev mode.
     *
     * <p>Two modes of operation:
     * <ol>
     *   <li><b>Dev-token</b> — if the Authorization header contains a token that starts with
     *       {@code dev-} (e.g. {@code dev-admin-token}, {@code dev-officer-token}) the token
     *       is parsed to determine which CBS role to inject.  This matches exactly what the
     *       frontend {@code authStore.devLogin()} stores as the access token.</li>
     *   <li><b>No-token fallback</b> — if no Authorization header is present and no
     *       authentication has been established yet, a default {@code CBS_ADMIN} principal
     *       is injected so that unauthenticated Swagger / actuator calls still work locally.
     *       (Real browsers will always send the dev token.)</li>
     * </ol>
     *
     * <p>{@code @PreAuthorize} annotations are still enforced — the injected authorities
     * determine which endpoints are accessible, so role-based authorization is still tested
     * locally.
     */
    static class DevModeAuthenticationFilter extends OncePerRequestFilter {

        private static final org.slf4j.Logger flog =
                org.slf4j.LoggerFactory.getLogger(DevModeAuthenticationFilter.class);

        /** When true, only intercept dev-* tokens and let real JWTs pass through. */
        private final boolean hybridMode;

        DevModeAuthenticationFilter() { this(false); }
        DevModeAuthenticationFilter(boolean hybridMode) { this.hybridMode = hybridMode; }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {

            if (SecurityContextHolder.getContext().getAuthentication() != null) {
                chain.doFilter(request, response);
                return;
            }

            String authHeader = request.getHeader("Authorization");

            // In hybrid mode, only handle dev-* tokens; let real JWTs pass to OAuth2 resource server
            if (hybridMode && !isDevToken(authHeader)) {
                chain.doFilter(request, response);
                return;
            }

            List<SimpleGrantedAuthority> authorities = resolveDevAuthorities(authHeader);

            String principalName = derivePrincipal(authHeader);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(principalName, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
            flog.debug("Dev mode: injected principal '{}' with authorities {} for {} {}",
                    principalName, authorities, request.getMethod(), request.getRequestURI());

            if (hybridMode && isDevToken(authHeader)) {
                // Wrap the request to hide the dev Authorization header from the downstream
                // BearerTokenAuthenticationFilter, which would otherwise try to parse the
                // dev token as a JWT and overwrite our authentication with a failure.
                chain.doFilter(new DevTokenStrippingRequestWrapper(request), response);
            } else {
                chain.doFilter(request, response);
            }
        }

        private boolean isDevToken(String authHeader) {
            return authHeader != null && authHeader.startsWith("Bearer dev-");
        }

        /**
         * Derive authorities from the dev token format used by the frontend authStore.
         * Token format: {@code dev-<role>-token} where {@code <role>} is one of
         * {@code admin}, {@code officer}, {@code teller}.
         */
        private List<SimpleGrantedAuthority> resolveDevAuthorities(String authHeader) {
            if (authHeader != null && authHeader.startsWith("Bearer dev-")) {
                String token = authHeader.substring("Bearer ".length()).toLowerCase();
                if (token.contains("admin")) {
                    return List.of(
                            new SimpleGrantedAuthority("ROLE_CBS_ADMIN"),
                            new SimpleGrantedAuthority("ROLE_CBS_OFFICER"));
                }
                if (token.contains("officer")) {
                    return List.of(new SimpleGrantedAuthority("ROLE_CBS_OFFICER"));
                }
                if (token.contains("teller")) {
                    return List.of(new SimpleGrantedAuthority("ROLE_TELLER"));
                }
            }
            // No token or unrecognised — inject full admin for convenience (Swagger, curl, etc.)
            return List.of(
                    new SimpleGrantedAuthority("ROLE_CBS_ADMIN"),
                    new SimpleGrantedAuthority("ROLE_CBS_OFFICER"));
        }

        private String derivePrincipal(String authHeader) {
            if (authHeader != null && authHeader.startsWith("Bearer dev-")) {
                String token = authHeader.substring("Bearer ".length()).toLowerCase();
                if (token.contains("admin"))   return "dev-admin";
                if (token.contains("officer")) return "dev-officer";
                if (token.contains("teller"))  return "dev-teller";
            }
            return "dev-user";
        }
    }

    /**
     * Request wrapper that hides the Authorization header from downstream filters.
     * Used in hybrid mode to prevent BearerTokenAuthenticationFilter from trying
     * to parse a dev-* token as a JWT after DevModeAuthenticationFilter has already
     * established the security context.
     */
    static class DevTokenStrippingRequestWrapper extends HttpServletRequestWrapper {
        DevTokenStrippingRequestWrapper(HttpServletRequest request) { super(request); }

        @Override
        public String getHeader(String name) {
            if ("Authorization".equalsIgnoreCase(name)) return null;
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if ("Authorization".equalsIgnoreCase(name)) return Collections.emptyEnumeration();
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> names = Collections.list(super.getHeaderNames()).stream()
                    .filter(n -> !"Authorization".equalsIgnoreCase(n))
                    .toList();
            return Collections.enumeration(names);
        }
    }

    @Bean
    public JwtDecoder jwtDecoder(OAuth2ResourceServerProperties properties) {
        String issuerUri = properties.getJwt().getIssuerUri();
        if (!StringUtils.hasText(issuerUri)) {
            // Dev/local mode: no OIDC provider configured — permit-all is active, decoder is unused
            byte[] keyBytes = new byte[32];
            javax.crypto.SecretKey key = new javax.crypto.spec.SecretKeySpec(keyBytes, "HmacSHA256");
            return NimbusJwtDecoder.withSecretKey(key).build();
        }

        List<String> acceptedAudiences = parseCsv(cbsProperties.getSecurity().getJwt().getAcceptedAudiences());
        if (acceptedAudiences.isEmpty()) {
            throw new IllegalStateException("cbs.security.jwt.accepted-audiences must include at least one audience or client ID");
        }

        String jwkSetUri = StringUtils.hasText(properties.getJwt().getJwkSetUri())
                ? properties.getJwt().getJwkSetUri()
                : issuerUri.replaceAll("/+$", "") + "/protocol/openid-connect/certs";

        JwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuerUri),
                new AcceptedAudienceValidator(acceptedAudiences)
        );
        if (jwtDecoder instanceof NimbusJwtDecoder nimbusJwtDecoder) {
            nimbusJwtDecoder.setJwtValidator(validator);
            return nimbusJwtDecoder;
        }

        throw new IllegalStateException("Unsupported JwtDecoder implementation: " + jwtDecoder.getClass().getName());
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            var authorities = new java.util.ArrayList<org.springframework.security.core.GrantedAuthority>();

            // 1. Keycloak realm_access.roles (primary source)
            var realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess != null && realmAccess.get("roles") instanceof java.util.Collection<?> roles) {
                roles.forEach(role -> {
                    String r = String.valueOf(role);
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + r));
                    // Map Keycloak built-in "admin" / "realm-admin" → CBS_ADMIN so that
                    // realm administrators don't need a separate CBS_ADMIN role assignment.
                    if ("admin".equalsIgnoreCase(r) || "realm-admin".equalsIgnoreCase(r)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_CBS_ADMIN"));
                        authorities.add(new SimpleGrantedAuthority("ROLE_CBS_OFFICER"));
                        log.debug("JWT role '{}' mapped to ROLE_CBS_ADMIN + ROLE_CBS_OFFICER", r);
                    }
                });
            }

            // 2. Top-level 'roles' claim (non-Keycloak providers, or custom mappers)
            var topLevelRoles = jwt.getClaimAsStringList("roles");
            if (topLevelRoles != null) {
                topLevelRoles.forEach(r -> {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + r));
                    if ("admin".equalsIgnoreCase(r) || "administrator".equalsIgnoreCase(r)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_CBS_ADMIN"));
                        authorities.add(new SimpleGrantedAuthority("ROLE_CBS_OFFICER"));
                        log.debug("JWT top-level role '{}' mapped to ROLE_CBS_ADMIN + ROLE_CBS_OFFICER", r);
                    }
                });
            }

            // 3. Keycloak resource_access roles for the configured client
            var resourceAccess = jwt.getClaimAsMap("resource_access");
            if (resourceAccess != null) {
                resourceAccess.forEach((client, access) -> {
                    if (access instanceof java.util.Map<?, ?> accessMap
                            && accessMap.get("roles") instanceof java.util.Collection<?> clientRoles) {
                        clientRoles.forEach(role ->
                            authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
                    }
                });
            }

            if (authorities.isEmpty()) {
                log.warn("JWT for subject '{}' has no recognisable role claims (checked realm_access.roles, roles, resource_access). " +
                        "Ensure the Keycloak realm has a CBS_ADMIN role and it is assigned to this user.",
                        jwt.getSubject());
            }
            return authorities;
        });
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> allowedOrigins = parseCsv(cbsProperties.getSecurity().getCors().getAllowedOrigins());
        if (!allowedOrigins.isEmpty()) {
            configuration.setAllowedOrigins(allowedOrigins);
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "X-Request-Id"));
        configuration.setAllowCredentials(!allowedOrigins.isEmpty());
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> parseCsv(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return List.of();
        }

        return Arrays.stream(rawValue.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toList();
    }
}
