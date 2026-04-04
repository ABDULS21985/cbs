package com.cbs.fees.islamic.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public final class IslamicFeeSupport {

    public static final BigDecimal HUNDRED = new BigDecimal("100");
    public static final Set<String> UJRAH_CLASSIFICATIONS = Set.of("UJRAH_PERMISSIBLE", "UJRAH_COST_RECOVERY", "WAKALAH_FEE");
    public static final Set<String> CHARITY_CLASSIFICATIONS = Set.of("PENALTY_CHARITY");
    public static final Set<String> ACTIVE_STATUSES = Set.of("ACTIVE");
    public static final Set<String> PENDING_STATUSES = Set.of("PENDING_SSB_APPROVAL");

    private IslamicFeeSupport() {
    }

    public static BigDecimal money(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : amount.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal nvl(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    public static boolean matchesAny(String value, Collection<String> options) {
        if (options == null || options.isEmpty()) {
            return true;
        }
        if (options.stream().anyMatch("ALL"::equalsIgnoreCase)) {
            return true;
        }
        return value != null && options.stream().filter(Objects::nonNull).anyMatch(v -> v.equalsIgnoreCase(value));
    }

    public static String nextRef(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    public static String feeCalcBreakdown(String label, BigDecimal base, BigDecimal rate, BigDecimal result) {
        if (base == null || rate == null) {
            return label + ": " + money(result);
        }
        return label + ": " + money(rate) + "% of " + money(base) + " = " + money(result);
    }

    public static LocalDate monthStart(LocalDate date) {
        YearMonth ym = YearMonth.from(date);
        return ym.atDay(1);
    }

    public static LocalDate yearStart(LocalDate date) {
        return LocalDate.of(date.getYear(), 1, 1);
    }

    public static String requiredRoleForAuthorityLevel(String authorityLevel) {
        return switch (normalize(authorityLevel)) {
            case "OFFICER" -> "CBS_OFFICER";
            case "BRANCH_MANAGER" -> "BRANCH_MANAGER";
            case "REGIONAL_MANAGER" -> "REGIONAL_MANAGER";
            case "HEAD_OFFICE" -> "HEAD_OFFICE";
            default -> "CBS_ADMIN";
        };
    }

    public static boolean currentUserHasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        String expected = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        return authentication.getAuthorities().stream()
                .anyMatch(granted -> expected.equalsIgnoreCase(granted.getAuthority()));
    }

    public static String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    public static Instant instantNow() {
        return Instant.now();
    }

    @SuppressWarnings("unchecked")
    public static BigDecimal toDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof Map<?, ?> map && map.containsKey("value")) {
            return toDecimal(map.get("value"));
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static List<String> emptyIfNull(List<String> list) {
        return list == null ? List.of() : list;
    }
}
