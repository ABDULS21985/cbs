package com.cbs.segmentation.engine;

import com.cbs.customer.entity.Customer;
import com.cbs.segmentation.entity.RuleOperator;
import com.cbs.segmentation.entity.SegmentRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Evaluates a set of segment rules against a customer entity.
 * Rules within the same logical group are AND-ed together.
 * Different logical groups are OR-ed together.
 */
@Component
@Slf4j
public class SegmentRuleEvaluator {

    /**
     * Evaluates all rules against a customer.
     * Groups are OR-ed; rules within a group are AND-ed.
     */
    public boolean evaluate(Customer customer, List<SegmentRule> rules) {
        if (rules == null || rules.isEmpty()) {
            return false;
        }

        List<SegmentRule> activeRules = rules.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .toList();

        if (activeRules.isEmpty()) {
            return false;
        }

        // Group rules by logicalGroup
        Map<Integer, List<SegmentRule>> groups = activeRules.stream()
                .collect(Collectors.groupingBy(SegmentRule::getLogicalGroup));

        // OR across groups: if any group matches fully, the segment matches
        for (Map.Entry<Integer, List<SegmentRule>> entry : groups.entrySet()) {
            boolean groupMatches = true;
            for (SegmentRule rule : entry.getValue()) {
                if (!evaluateRule(customer, rule)) {
                    groupMatches = false;
                    break;
                }
            }
            if (groupMatches) {
                return true;
            }
        }

        return false;
    }

    private boolean evaluateRule(Customer customer, SegmentRule rule) {
        try {
            String fieldValue = resolveFieldValue(customer, rule.getFieldName());
            return applyOperator(fieldValue, rule.getOperator(), rule.getFieldValue(), rule.getFieldValueTo());
        } catch (Exception e) {
            log.warn("Error evaluating rule [field={}, operator={}]: {}",
                    rule.getFieldName(), rule.getOperator(), e.getMessage());
            return false;
        }
    }

    /**
     * Resolves a field value from the customer entity using reflection.
     * Supports dot-notation for nested fields and computed fields like "age".
     */
    private String resolveFieldValue(Customer customer, String fieldName) {
        // Handle computed fields
        if ("age".equalsIgnoreCase(fieldName)) {
            if (customer.getDateOfBirth() == null) return null;
            return String.valueOf(Period.between(customer.getDateOfBirth(), LocalDate.now()).getYears());
        }

        // Handle direct fields via getter
        try {
            String getterName = "get" + Character.toUpperCase(fieldName.charAt(0)) + fieldName.substring(1);
            Method getter = Customer.class.getMethod(getterName);
            Object value = getter.invoke(customer);
            return value != null ? value.toString() : null;
        } catch (NoSuchMethodException e) {
            // Try enum name for enum fields
            try {
                String getterName = "get" + Character.toUpperCase(fieldName.charAt(0)) + fieldName.substring(1);
                Method getter = Customer.class.getMethod(getterName);
                Object value = getter.invoke(customer);
                if (value instanceof Enum<?> enumVal) {
                    return enumVal.name();
                }
                return value != null ? value.toString() : null;
            } catch (Exception ex) {
                log.debug("Cannot resolve field '{}' on Customer: {}", fieldName, ex.getMessage());
                return null;
            }
        } catch (Exception e) {
            log.debug("Cannot resolve field '{}' on Customer: {}", fieldName, e.getMessage());
            return null;
        }
    }

    private boolean applyOperator(String actualValue, RuleOperator operator, String expectedValue, String expectedValueTo) {
        return switch (operator) {
            case EQUALS -> Objects.equals(normalise(actualValue), normalise(expectedValue));
            case NOT_EQUALS -> !Objects.equals(normalise(actualValue), normalise(expectedValue));
            case CONTAINS -> actualValue != null && actualValue.toLowerCase().contains(expectedValue.toLowerCase());
            case NOT_CONTAINS -> actualValue != null && !actualValue.toLowerCase().contains(expectedValue.toLowerCase());
            case STARTS_WITH -> actualValue != null && actualValue.toLowerCase().startsWith(expectedValue.toLowerCase());
            case ENDS_WITH -> actualValue != null && actualValue.toLowerCase().endsWith(expectedValue.toLowerCase());
            case IS_NULL -> actualValue == null || actualValue.isBlank();
            case IS_NOT_NULL -> actualValue != null && !actualValue.isBlank();
            case IN -> actualValue != null && parseList(expectedValue).contains(normalise(actualValue));
            case NOT_IN -> actualValue != null && !parseList(expectedValue).contains(normalise(actualValue));
            case GREATER_THAN -> compareNumeric(actualValue, expectedValue) > 0;
            case LESS_THAN -> compareNumeric(actualValue, expectedValue) < 0;
            case GREATER_OR_EQUAL -> compareNumeric(actualValue, expectedValue) >= 0;
            case LESS_OR_EQUAL -> compareNumeric(actualValue, expectedValue) <= 0;
            case BETWEEN -> {
                if (!StringUtils.hasText(expectedValueTo)) yield false;
                int cmpLow = compareNumeric(actualValue, expectedValue);
                int cmpHigh = compareNumeric(actualValue, expectedValueTo);
                yield cmpLow >= 0 && cmpHigh <= 0;
            }
        };
    }

    private String normalise(String value) {
        return value != null ? value.trim().toLowerCase() : null;
    }

    private Set<String> parseList(String csv) {
        if (csv == null) return Set.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .collect(Collectors.toSet());
    }

    private int compareNumeric(String actual, String expected) {
        if (actual == null || expected == null) return 0;
        try {
            double a = Double.parseDouble(actual.trim());
            double e = Double.parseDouble(expected.trim());
            return Double.compare(a, e);
        } catch (NumberFormatException ex) {
            return actual.compareToIgnoreCase(expected);
        }
    }
}
