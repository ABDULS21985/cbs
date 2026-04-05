package com.cbs.rulesengine.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.entity.*;
import com.cbs.rulesengine.repository.BusinessRuleRepository;
import com.cbs.rulesengine.repository.DecisionTableRepository;
import com.cbs.rulesengine.repository.DecisionTableRowRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DecisionTableEvaluator {

    private final DecisionTableRepository decisionTableRepository;
    private final DecisionTableRowRepository decisionTableRowRepository;
    private final BusinessRuleRepository businessRuleRepository;
    private final CurrentTenantResolver currentTenantResolver;

    public String cacheKey(Long tableId) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return tableId + ":tenant:" + (tenantId == null ? 0L : tenantId);
    }

    public String cacheKeyForRule(String ruleCode) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return ruleCode + ":tenant:" + (tenantId == null ? 0L : tenantId);
    }

    public DecisionResultResponse evaluate(Long tableId, Map<String, Object> inputs) {
        DecisionTableDefinition definition = getTableDefinition(tableId);
        List<RowMatch> matches = findMatches(definition, inputs);
        return applyHitPolicy(definition.hitPolicy(), definition.outputColumns(), matches);
    }

    public DecisionResultResponse evaluateByRuleCode(String ruleCode, Map<String, Object> inputs) {
        DecisionTableDefinition definition = getActiveTableDefinitionByRuleCode(ruleCode);
        List<RowMatch> matches = findMatches(definition, inputs);
        return applyHitPolicy(definition.hitPolicy(), definition.outputColumns(), matches);
    }

    @Cacheable(cacheNames = "decision-table-definitions", key = "#root.target.cacheKey(#tableId)")
    public DecisionTableDefinition getTableDefinition(Long tableId) {
        DecisionTable table = decisionTableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("DecisionTable", "id", tableId));
        List<DecisionTableRow> rows = decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(tableId);
        return toDefinition(table, rows);
    }

    @Cacheable(cacheNames = "decision-table-rule-code", key = "#root.target.cacheKeyForRule(#ruleCode)")
    public DecisionTableDefinition getActiveTableDefinitionByRuleCode(String ruleCode) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        BusinessRule rule = resolveRuleByCode(ruleCode, tenantId);
        DecisionTable table = decisionTableRepository.findByRuleIdAndStatus(rule.getId(), BusinessRuleStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("DecisionTable", "ruleCode", ruleCode));
        List<DecisionTableRow> rows = decisionTableRowRepository.findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(table.getId());
        return toDefinition(table, rows);
    }

    private DecisionTableDefinition toDefinition(DecisionTable table, List<DecisionTableRow> rows) {
        return new DecisionTableDefinition(
                table.getId(),
                table.getRule().getId(),
                table.getTableName(),
                new ArrayList<>(table.getInputColumns()),
                new ArrayList<>(table.getOutputColumns()),
                table.getHitPolicy(),
                rows.stream()
                        .map(row -> new DecisionRowDefinition(
                                row.getId(),
                                row.getRowNumber(),
                                new ArrayList<>(row.getInputValues()),
                                new ArrayList<>(row.getOutputValues()),
                                row.getPriority() == null ? row.getRowNumber() : row.getPriority()
                        ))
                        .toList()
        );
    }

    private BusinessRule resolveRuleByCode(String ruleCode, Long tenantId) {
        if (tenantId != null) {
            Optional<BusinessRule> tenantRule = businessRuleRepository.findByRuleCodeAndTenantId(ruleCode, tenantId);
            if (tenantRule.isPresent()) {
                return tenantRule.get();
            }
        }
        return businessRuleRepository.findByRuleCodeAndTenantIdIsNull(ruleCode)
                .orElseThrow(() -> new ResourceNotFoundException("BusinessRule", "ruleCode", ruleCode));
    }

    private List<RowMatch> findMatches(DecisionTableDefinition definition, Map<String, Object> inputs) {
        List<RowMatch> matches = new ArrayList<>();
        for (DecisionRowDefinition row : definition.rows()) {
            if (matchesRow(definition.inputColumns(), row.inputValues(), inputs)) {
                matches.add(new RowMatch(
                        row.id(),
                        row.priority(),
                        buildOutputs(definition.outputColumns(), row.outputValues())
                ));
            }
        }
        return matches;
    }

    private boolean matchesRow(List<Map<String, Object>> inputColumns, List<Map<String, Object>> inputValues,
                               Map<String, Object> inputs) {
        if (inputColumns.size() != inputValues.size()) {
            throw new BusinessException("Decision table input column definition does not match row cell count");
        }

        for (int index = 0; index < inputColumns.size(); index++) {
            Map<String, Object> column = inputColumns.get(index);
            Map<String, Object> cell = inputValues.get(index);
            String columnName = String.valueOf(column.get("name"));
            String columnType = String.valueOf(column.get("type"));
            Object inputValue = inputs.get(columnName);
            if (!matchesCell(columnType, inputValue, cell)) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesCell(String columnType, Object inputValue, Map<String, Object> cell) {
        if (cell == null || cell.isEmpty() || isWildcardCell(cell)) {
            return true;
        }

        return switch (normalizeType(columnType)) {
            case "STRING", "TEXT" -> matchesStringCell(inputValue, cell);
            case "DECIMAL_RANGE", "INTEGER_RANGE", "NUMBER", "DECIMAL", "INTEGER" -> matchesNumericCell(inputValue, cell);
            case "BOOLEAN" -> matchesBooleanCell(inputValue, cell);
            case "LIST", "ENUM" -> matchesListCell(inputValue, cell);
            case "DATE", "DATE_RANGE" -> matchesDateCell(inputValue, cell);
            default -> throw new BusinessException("Unsupported decision table column type: " + columnType);
        };
    }

    private Map<String, Object> buildOutputs(List<Map<String, Object>> outputColumns, List<Map<String, Object>> outputValues) {
        if (outputColumns.size() != outputValues.size()) {
            throw new BusinessException("Decision table output column definition does not match row cell count");
        }
        Map<String, Object> outputs = new LinkedHashMap<>();
        for (int index = 0; index < outputColumns.size(); index++) {
            String outputName = String.valueOf(outputColumns.get(index).get("name"));
            String outputType = String.valueOf(outputColumns.get(index).get("type"));
            Map<String, Object> cell = outputValues.get(index);
            outputs.put(outputName, resolveOutputValue(outputType, cell));
        }
        return outputs;
    }

    private DecisionResultResponse applyHitPolicy(DecisionTableHitPolicy hitPolicy, List<Map<String, Object>> outputColumns,
                                                  List<RowMatch> matches) {
        if (matches.isEmpty()) {
            return DecisionResultResponse.builder()
                    .matched(false)
                    .outputs(Map.of())
                    .matchedOutputs(List.of())
                    .matchedRowIds(List.of())
                    .hitPolicy(hitPolicy)
                    .build();
        }

        List<Long> matchedRowIds = matches.stream().map(RowMatch::rowId).toList();
        List<Map<String, Object>> matchedOutputs = matches.stream().map(RowMatch::outputs).toList();

        Map<String, Object> outputs = switch (hitPolicy) {
            case FIRST_MATCH -> matches.getFirst().outputs();
            case ALL_MATCHES -> Map.of("matches", matchedOutputs);
            case PRIORITY -> matches.stream()
                    .min(Comparator.comparing(RowMatch::priority))
                    .orElseThrow()
                    .outputs();
            case COLLECT_SUM -> aggregateNumericOutputs(outputColumns, matches, AggregateOperation.SUM);
            case COLLECT_MIN -> aggregateNumericOutputs(outputColumns, matches, AggregateOperation.MIN);
            case COLLECT_MAX -> aggregateNumericOutputs(outputColumns, matches, AggregateOperation.MAX);
        };

        return DecisionResultResponse.builder()
                .matched(true)
                .outputs(outputs)
                .matchedOutputs(matchedOutputs)
                .matchedRowIds(matchedRowIds)
                .hitPolicy(hitPolicy)
                .build();
    }

    private Map<String, Object> aggregateNumericOutputs(List<Map<String, Object>> outputColumns, List<RowMatch> matches,
                                                        AggregateOperation operation) {
        Map<String, Object> aggregated = new LinkedHashMap<>();
        for (Map<String, Object> column : outputColumns) {
            String name = String.valueOf(column.get("name"));
            List<BigDecimal> values = matches.stream()
                    .map(match -> toBigDecimal(match.outputs().get(name)))
                    .filter(Objects::nonNull)
                    .toList();
            if (values.isEmpty()) {
                continue;
            }
            BigDecimal result = switch (operation) {
                case SUM -> values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                case MIN -> values.stream().min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
                case MAX -> values.stream().max(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
            };
            aggregated.put(name, result.stripTrailingZeros());
        }
        return aggregated;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean matchesStringCell(Object inputValue, Map<String, Object> cell) {
        String operator = resolveOperator(cell);
        String input = inputValue == null ? null : String.valueOf(inputValue).trim();

        return switch (operator) {
            case "IS_NULL" -> input == null || input.isBlank();
            case "NOT_NULL" -> input != null && !input.isBlank();
            case "CONTAINS" -> input != null && containsNormalized(input, cell.get("value"));
            case "STARTS_WITH" -> input != null && startsWithNormalized(input, cell.get("value"));
            case "ENDS_WITH" -> input != null && endsWithNormalized(input, cell.get("value"));
            case "REGEX" -> input != null && matchesRegex(input, cell.get("value"));
            case "NOT_IN" -> input != null && !matchesAnyValue(input, cellValues(cell));
            case "IN" -> input != null && matchesAnyValue(input, cellValues(cell));
            case "NOT_EQUALS" -> input != null && !Objects.equals(normalize(input), normalize(cell.get("value")));
            default -> input != null && Objects.equals(normalize(input), normalize(cell.get("value")));
        };
    }

    private boolean matchesNumericCell(Object inputValue, Map<String, Object> cell) {
        String operator = resolveOperator(cell);
        BigDecimal input = toBigDecimal(inputValue);
        if (input == null) {
            return false;
        }

        BigDecimal value = toBigDecimal(cell.get("value"));
        BigDecimal from = toBigDecimal(cell.get("from"));
        BigDecimal to = toBigDecimal(cell.get("to"));

        return switch (operator) {
            case "GT" -> value != null && input.compareTo(value) > 0;
            case "GTE" -> value != null && input.compareTo(value) >= 0;
            case "LT" -> value != null && input.compareTo(value) < 0;
            case "LTE" -> value != null && input.compareTo(value) <= 0;
            case "NOT_EQUALS" -> value != null && input.compareTo(value) != 0;
            case "BETWEEN" -> isWithinRange(input, from, to, cell);
            default -> value != null
                    ? input.compareTo(value) == 0
                    : isWithinRange(input, from, to, cell);
        };
    }

    private boolean matchesBooleanCell(Object inputValue, Map<String, Object> cell) {
        String operator = resolveOperator(cell);
        Boolean input = toBoolean(inputValue);
        return switch (operator) {
            case "IS_NULL" -> input == null;
            case "NOT_NULL" -> input != null;
            default -> input != null && Objects.equals(input, toBoolean(cell.get("value")));
        };
    }

    private boolean matchesListCell(Object inputValue, Map<String, Object> cell) {
        if (inputValue == null) {
            return false;
        }
        boolean matched = matchesAnyValue(inputValue, cellValues(cell));
        return "NOT_IN".equals(resolveOperator(cell)) ? !matched : matched;
    }

    private boolean matchesDateCell(Object inputValue, Map<String, Object> cell) {
        String operator = resolveOperator(cell);
        LocalDate input = toLocalDate(inputValue);
        if (input == null) {
            return false;
        }

        LocalDate value = toLocalDate(cell.get("value"));
        LocalDate from = toLocalDate(cell.get("from"));
        LocalDate to = toLocalDate(cell.get("to"));

        return switch (operator) {
            case "GT" -> value != null && input.isAfter(value);
            case "GTE" -> value != null && (input.isAfter(value) || input.isEqual(value));
            case "LT" -> value != null && input.isBefore(value);
            case "LTE" -> value != null && (input.isBefore(value) || input.isEqual(value));
            case "NOT_EQUALS" -> value != null && !input.isEqual(value);
            case "BETWEEN" -> isWithinDateRange(input, from, to, cell);
            default -> value != null
                    ? input.isEqual(value)
                    : isWithinDateRange(input, from, to, cell);
        };
    }

    private Object resolveOutputValue(String outputType, Map<String, Object> cell) {
        if (cell == null || cell.isEmpty()) {
            return null;
        }
        if (cell.containsKey("values")) {
            return cellValues(cell);
        }
        if (!cell.containsKey("value")) {
            return cell;
        }

        Object value = cell.get("value");
        return switch (normalizeType(outputType)) {
            case "DECIMAL", "INTEGER", "DECIMAL_RANGE", "INTEGER_RANGE", "NUMBER" -> toBigDecimal(value);
            case "BOOLEAN" -> toBoolean(value);
            case "LIST", "ENUM" -> cellValues(cell);
            case "DATE", "DATE_RANGE" -> toLocalDate(value);
            default -> value;
        };
    }

    private boolean isWildcardCell(Map<String, Object> cell) {
        if (Boolean.TRUE.equals(cell.get("wildcard"))) {
            return true;
        }
        if ("ANY".equals(resolveOperator(cell))) {
            return true;
        }
        if ("*".equals(String.valueOf(cell.get("value")))) {
            return true;
        }
        return cellValues(cell).stream().anyMatch(value -> "*".equals(String.valueOf(value)));
    }

    private String resolveOperator(Map<String, Object> cell) {
        Object operator = cell.get("operator");
        return operator == null ? "EQUALS" : String.valueOf(operator).trim().toUpperCase(Locale.ROOT);
    }

    private List<?> cellValues(Map<String, Object> cell) {
        Object rawValues = cell.get("values");
        if (rawValues instanceof List<?> list) {
            return list;
        }
        if (rawValues instanceof String text && !text.isBlank()) {
            return Arrays.stream(text.split(","))
                    .map(String::trim)
                    .filter(item -> !item.isEmpty())
                    .toList();
        }
        Object rawValue = cell.get("value");
        return rawValue == null ? List.of() : List.of(rawValue);
    }

    private boolean isWithinRange(BigDecimal input, BigDecimal from, BigDecimal to, Map<String, Object> cell) {
        if (from == null && to == null) {
            return false;
        }
        boolean includeFrom = !Boolean.FALSE.equals(cell.get("includeFrom"));
        boolean includeTo = !Boolean.FALSE.equals(cell.get("includeTo"));
        boolean afterFrom = from == null || (includeFrom ? input.compareTo(from) >= 0 : input.compareTo(from) > 0);
        boolean beforeTo = to == null || (includeTo ? input.compareTo(to) <= 0 : input.compareTo(to) < 0);
        return afterFrom && beforeTo;
    }

    private boolean isWithinDateRange(LocalDate input, LocalDate from, LocalDate to, Map<String, Object> cell) {
        if (from == null && to == null) {
            return false;
        }
        boolean includeFrom = !Boolean.FALSE.equals(cell.get("includeFrom"));
        boolean includeTo = !Boolean.FALSE.equals(cell.get("includeTo"));
        boolean afterFrom = from == null || (includeFrom ? !input.isBefore(from) : input.isAfter(from));
        boolean beforeTo = to == null || (includeTo ? !input.isAfter(to) : input.isBefore(to));
        return afterFrom && beforeTo;
    }

    private boolean matchesAnyValue(Object inputValue, List<?> values) {
        String normalizedInput = normalize(inputValue);
        return values.stream()
                .map(this::normalize)
                .anyMatch(candidate -> Objects.equals(candidate, normalizedInput));
    }

    private boolean containsNormalized(Object inputValue, Object expected) {
        String input = normalize(inputValue);
        String value = normalize(expected);
        return input != null && value != null && input.contains(value);
    }

    private boolean startsWithNormalized(Object inputValue, Object expected) {
        String input = normalize(inputValue);
        String value = normalize(expected);
        return input != null && value != null && input.startsWith(value);
    }

    private boolean endsWithNormalized(Object inputValue, Object expected) {
        String input = normalize(inputValue);
        String value = normalize(expected);
        return input != null && value != null && input.endsWith(value);
    }

    private boolean matchesRegex(Object inputValue, Object expression) {
        if (inputValue == null || expression == null) {
            return false;
        }
        try {
            return String.valueOf(inputValue).matches(String.valueOf(expression));
        } catch (Exception ex) {
            throw new BusinessException("Invalid decision table regex expression: " + expression);
        }
    }

    private Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }
        return Boolean.valueOf(String.valueOf(value));
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        try {
            return LocalDate.parse(String.valueOf(value));
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String normalizeType(String columnType) {
        return columnType == null ? "STRING" : columnType.trim().toUpperCase(Locale.ROOT);
    }

    private String normalize(Object value) {
        return value == null ? null : String.valueOf(value).trim().toUpperCase(Locale.ROOT);
    }

    private record RowMatch(Long rowId, Integer priority, Map<String, Object> outputs) {
    }

    private enum AggregateOperation { SUM, MIN, MAX }

    public record DecisionTableDefinition(
            Long id,
            Long ruleId,
            String tableName,
            List<Map<String, Object>> inputColumns,
            List<Map<String, Object>> outputColumns,
            DecisionTableHitPolicy hitPolicy,
            List<DecisionRowDefinition> rows
    ) implements Serializable {
    }

    public record DecisionRowDefinition(
            Long id,
            Integer rowNumber,
            List<Map<String, Object>> inputValues,
            List<Map<String, Object>> outputValues,
            Integer priority
    ) implements Serializable {
    }
}
