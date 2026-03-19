package com.cbs.security.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Benchmark-only security override.
 * Keep this isolated to the loadtest profile; normal startup should use SecurityConfig.
 */
@Configuration
@Profile("loadtest")
public class LoadTestSecurityConfig {

    @Bean
    @Order(0)
    public SecurityFilterChain loadTestSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/**")
                .csrf(AbstractHttpConfigurer::disable)
                .oauth2ResourceServer(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(new OncePerRequestFilter() {
                    @Override
                    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                                    FilterChain filterChain) throws ServletException, IOException {
                        SecurityContext context = SecurityContextHolder.createEmptyContext();
                        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                                "load-test",
                                "N/A",
                                List.of(
                                        new SimpleGrantedAuthority("ROLE_CBS_ADMIN"),
                                        new SimpleGrantedAuthority("ROLE_CBS_OFFICER"),
                                        new SimpleGrantedAuthority("ROLE_CBS_VIEWER"),
                                        new SimpleGrantedAuthority("ROLE_PORTAL_USER")
                                )
                        ));
                        SecurityContextHolder.setContext(context);
                        try {
                            filterChain.doFilter(request, response);
                        } finally {
                            SecurityContextHolder.clearContext();
                        }
                    }
                }, AnonymousAuthenticationFilter.class);
        return http.build();
    }
}
