package com.cbs.common.audit;

import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class CurrentCustomerProvider {

    private final CustomerRepository customerRepository;

    public Customer getCurrentCustomer() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BusinessException("Authentication required", "AUTHENTICATION_REQUIRED");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof Jwt jwt)) {
            throw new BusinessException("Authenticated customer token is required", "CUSTOMER_TOKEN_REQUIRED");
        }

        Long customerId = firstLongClaim(jwt, "customerId", "customer_id");
        if (customerId != null) {
            return customerRepository.findById(customerId)
                    .orElseThrow(() -> new BusinessException("Authenticated customer context is invalid", "INVALID_CUSTOMER_CONTEXT"));
        }

        String cif = firstTextClaim(jwt, "cif", "cifNumber", "customer_cif");
        if (StringUtils.hasText(cif)) {
            return customerRepository.findByCifNumber(cif)
                    .orElseThrow(() -> new BusinessException("Authenticated customer CIF is invalid", "INVALID_CUSTOMER_CONTEXT"));
        }

        String email = firstTextClaim(jwt, "email");
        if (StringUtils.hasText(email)) {
            return customerRepository.findByEmail(email)
                    .orElseThrow(() -> new BusinessException("Authenticated customer email is invalid", "INVALID_CUSTOMER_CONTEXT"));
        }

        throw new BusinessException("Customer identifier claim is required in the access token", "MISSING_CUSTOMER_CONTEXT");
    }

    private Long firstLongClaim(Jwt jwt, String... claimNames) {
        for (String claimName : claimNames) {
            Object value = jwt.getClaims().get(claimName);
            if (value instanceof Number number) {
                return number.longValue();
            }
            if (value instanceof String text && StringUtils.hasText(text)) {
                try {
                    return Long.parseLong(text);
                } catch (NumberFormatException ignored) {
                    // Try the next claim.
                }
            }
        }
        return null;
    }

    private String firstTextClaim(Jwt jwt, String... claimNames) {
        for (String claimName : claimNames) {
            String value = jwt.getClaimAsString(claimName);
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
