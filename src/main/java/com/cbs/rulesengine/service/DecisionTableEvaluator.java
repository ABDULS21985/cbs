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
        return switch (columnType) {
            case "STRING" -> {
                Object value = cell.get("value");
                yield "*".equals(value) || Objects.equals(normalize(inputValue), normalize(value));
            }
            case "DECIMAL_RANGE", "INTEGER_RANGE" -> {
                BigDecimal input = toBigDecimal(inputValue);
                BigDecimal from = toBigDecimal(cell.get("from"));
                BigDecimal to = toBigDecimal(cell.get("to"));
                yield input != null && from != null && to != null
                        && input.compareTo(from) >= 0
                        && input.compareTo(to) <= 0;
            }
            case "BOOLEAN" -> Objects.equals(Boolean.valueOf(String.valueOf(inputValue)),
                    Boolean.valueOf(String.valueOf(cell.get("value"))));
            case "LIST" -> {
                List<?> values = cell.get("values") instanceof List<?> list ? list : List.of();
                yield values.stream().map(this::normalize).anyMatch(item -> Objects.equals(item, normalize(inputValue)));
            }
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
            Map<String, Object> cell = outputValues.get(index);
            outputs.put(outputName, cell.containsKey("value") ? cell.get("value") : cell);
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
