package com.cbs;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@TestConfiguration
public class TestSecurityConfig {

    @Bean
    @Primary
    @Order(0)
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/**")
            .csrf(AbstractHttpConfigurer::disable)
            .oauth2ResourceServer(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(a -> a.anyRequest().permitAll())
            .addFilterBefore(new OncePerRequestFilter() {
                @Override
                protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                                FilterChain filterChain) throws ServletException, IOException {
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                        "integration-test",
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
