package com.cbs.zakat.service;

import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.zakat.entity.ZakatDomainEnums;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

final class ZakatSupport {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private ZakatSupport() {
    }

    static BigDecimal money(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal rate(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP)
                : value.setScale(6, RoundingMode.HALF_UP);
    }

    static String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    static String hijriLabel(HijriDateResponse response) {
        if (response == null || response.getHijriYear() == null || response.getHijriMonth() == null || response.getHijriDay() == null) {
            return null;
        }
        return response.getHijriDay() + " " + response.getHijriMonthName() + " " + response.getHijriYear();
    }

    static boolean isSaudiNational(String nationality) {
        if (!StringUtils.hasText(nationality)) {
            return false;
        }
        String normalized = normalize(nationality);
        return "SA".equals(normalized) || "SAU".equals(normalized) || "KSA".equals(normalized);
    }

    static String buildReference(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    static boolean matchesPattern(String pattern, String candidate) {
        if (!StringUtils.hasText(pattern) || !StringUtils.hasText(candidate)) {
            return false;
        }
        String normalizedPattern = pattern.trim();
        if ("*".equals(normalizedPattern)) {
            return true;
        }
        if (!normalizedPattern.contains("*")) {
            return normalizedPattern.equalsIgnoreCase(candidate);
        }
        String regex = "^" + Pattern.quote(normalizedPattern)
                .replace("\\*", ".*") + "$";
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE).matcher(candidate).matches();
    }

    static Map<String, Object> adjustment(String code, String description, BigDecimal amount,
                                          ZakatDomainEnums.AdjustmentDirection direction) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("code", code);
        map.put("description", description);
        map.put("amount", money(amount));
        map.put("direction", direction != null ? direction.name() : null);
        return map;
    }

    static BigDecimal signedAdjustment(Map<String, Object> adjustment) {
        if (adjustment == null) {
            return ZERO;
        }
        Object amountValue = adjustment.get("amount");
        BigDecimal amount = amountValue instanceof BigDecimal decimal
                ? decimal
                : amountValue == null ? BigDecimal.ZERO : new BigDecimal(String.valueOf(amountValue));
        String direction = String.valueOf(adjustment.get("direction"));
        if (ZakatDomainEnums.AdjustmentDirection.DECREASE.name().equalsIgnoreCase(direction)) {
            return money(amount).negate();
        }
        return money(amount);
    }
}