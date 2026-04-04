package com.cbs.rulesengine.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.rulesengine.dto.*;
import com.cbs.rulesengine.entity.BusinessRule;
import com.cbs.rulesengine.entity.DecisionTable;
import com.cbs.rulesengine.entity.DecisionTableRow;
import com.cbs.rulesengine.repository.DecisionTableRepository;
import com.cbs.rulesengine.repository.DecisionTableRowRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DecisionTableService {

    private final DecisionTableRepository decisionTableRepository;
    private final DecisionTableRowRepository decisionTableRowRepository;
    private final BusinessRuleService businessRuleService;
    private final CurrentTenantResolver currentTenantResolver;

    @Transactional
    @CacheEvict(cacheNames = {"decision-table-definitions", "decision-table-rule-code"}, allEntries = true)
    public DecisionTableResponse createDecisionTable(Long ruleId, CreateDecisionTableRequest request) {
        BusinessRule rule = businessRuleService.getRuleEntity(ruleId);
        DecisionTable table = DecisionTable.builder()
                .rule(rule)
                .tableName(request.getTableName())
                .description(request.getDescription())
                .inputColumns(request.getInputColumns())
                .outputColumns(request.getOutputColumns())
                .hitPolicy(request.getHitPolicy())
                .status(request.getStatus())
                .tableVersion(1)
                .tenantId(rule.getTenantId())
                .build();
        DecisionTable saved = decisionTableRepository.save(table);
        businessRuleService.createNewVersion(ruleId, "Decision table created: " + saved.getTableName());
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {"decision-table-definitions", "decision-table-rule-code"}, allEntries = true)
    public DecisionTableResponse updateDecisionTable(Long tableId, UpdateDecisionTableRequest request) {
        DecisionTable table = getDecisionTableEntity(tableId);
        if (request.getTableName() != null) table.setTableName(request.getTableName());
        if (request.getDescription() != null) table.setDescription(request.getDescription());
        if (request.getInputColumns() != null) table.setInputColumns(new ArrayList<>(request.getInputColumns()));
        if (request.getOutputColumns() != null) table.setOutputColumns(new ArrayList<>(request.getOutputColumns()));
        if (request.getHitPolicy() != null) table.setHitPolicy(request.getHitPolicy());
        if (request.getStatus() != null) table.setStatus(request.getStatus());
        table.setTableVersion(table.getTableVersion() + 1);
        DecisionTable saved = decisionTableRepository.save(table);
        businessRuleService.createNewVersion(table.getRule().getId(), "Decision table updated: " + saved.getTableName());
        return toResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {"decision-table-definitions", "decision-table-rule-code"}, allEntries = true)
    public DecisionTableRowResponse addRow(Long tableId, DecisionTableRowRequest request) {
        DecisionTable table = getDecisionTableEntity(tableId);
        DecisionTableRow row = DecisionTableRow.builder()
                .decisionTable(table)
                .rowNumber(request.getRowNumber())
                .inputValues(new ArrayList<>(request.getInputValues()))
                .outputValues(new ArrayList<>(request.getOutputValues()))
                .description(request.getDescription())
                .isActive(Boolean.TRUE.equals(request.getIsActive()))
                .priority(request.getPriority() != null ? request.getPriority() : request.getRowNumber())
                .build();
        DecisionTableRow saved = decisionTableRowRepository.save(row);
        table.setTableVersion(table.getTableVersion() + 1);
        decisionTableRepository.save(table);
        businessRuleService.createNewVersion(table.getRule().getId(), "Decision table row added");
        return toRowResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {"decision-table-definitions", "decision-table-rule-code"}, allEntries = true)
    public DecisionTableRowResponse updateRow(Long rowId, DecisionTableRowRequest request) {
        DecisionTableRow row = decisionTableRowRepository.findById(rowId)
                .orElseThrow(() -> new ResourceNotFoundException("DecisionTableRow", "id", rowId));
        validateTenant(row.getDecisionTable().getTenantId());
        row.setRowNumber(request.getRowNumber());
        row.setInputValues(new ArrayList<>(request.getInputValues()));
        row.setOutputValues(new ArrayList<>(request.getOutputValues()));
        row.setDescription(request.getDescription());
        row.setIsActive(Boolean.TRUE.equals(request.getIsActive()));
        row.setPriority(request.getPriority() != null ? request.getPriority() : request.getRowNumber());
        DecisionTableRow saved = decisionTableRowRepository.save(row);
        DecisionTable table = row.getDecisionTable();
        table.setTableVersion(table.getTableVersion() + 1);
        decisionTableRepository.save(table);
        businessRuleService.createNewVersion(table.getRule().getId(), "Decision table row updated");
        return toRowResponse(saved);
    }

    @Transactional
    @CacheEvict(cacheNames = {"decision-table-definitions", "decision-table-rule-code"}, allEntries = true)
    public void deleteRow(Long rowId) {
        DecisionTableRow row = decisionTableRowRepository.findById(rowId)
                .orElseThrow(() -> new ResourceNotFoundException("DecisionTableRow", "id", rowId));
        validateTenant(row.getDecisionTable().getTenantId());
        DecisionTable table = row.getDecisionTable();
        Long ruleId = table.getRule().getId();
        decisionTableRowRepository.delete(row);
        table.setTableVersion(table.getTableVersion() + 1);
        decisionTableRepository.save(table);
        businessRuleService.createNewVersion(ruleId, "Decision table row deleted");
    }

    @Transactional
    @CacheEvict(cacheNames = {"decision-table-definitions", "decision-table-rule-code"}, allEntries = true)
    public void reorderRows(Long tableId, List<Long> rowIdsInOrder) {
        DecisionTable table = getDecisionTableEntity(tableId);
        Map<Long, DecisionTableRow> rowsById = decisionTableRowRepository.findByDecisionTableIdOrderByRowNumberAsc(tableId)
                .stream()
                .collect(java.util.stream.Collectors.toMap(DecisionTableRow::getId, row -> row));

        if (rowsById.size() != rowIdsInOrder.size() || !rowsById.keySet().containsAll(rowIdsInOrder)) {
            throw new BusinessException("reorderRows must contain every row ID exactly once");
        }

        int index = 1;
        for (Long rowId : rowIdsInOrder) {
            DecisionTableRow row = rowsById.get(rowId);
            row.setRowNumber(index);
            if (row.getPriority() == null || row.getPriority() < 1) {
                row.setPriority(index);
            }
            decisionTableRowRepository.save(row);
            index++;
        }

        table.setTableVersion(table.getTableVersion() + 1);
        decisionTableRepository.save(table);
        businessRuleService.createNewVersion(table.getRule().getId(), "Decision table rows reordered");
    }

    public DecisionTableResponse getDecisionTable(Long tableId) {
        return toResponse(getDecisionTableEntity(tableId));
    }

    public List<DecisionTableSummary> getDecisionTablesByRule(Long ruleId) {
        businessRuleService.getRuleEntity(ruleId);
        return decisionTableRepository.findByRuleIdOrderByCreatedAtDesc(ruleId).stream()
                .map(this::toSummary)
                .toList();
    }

    DecisionTable getDecisionTableEntity(Long tableId) {
        DecisionTable table = decisionTableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("DecisionTable", "id", tableId));
        validateTenant(table.getTenantId());
        return table;
    }

    private void validateTenant(Long entityTenantId) {
        Long currentTenantId = currentTenantResolver.getCurrentTenantId();
        if (currentTenantId != null && entityTenantId != null && !Objects.equals(currentTenantId, entityTenantId)) {
            throw new BusinessException("Decision table does not belong to the current tenant");
        }
    }

    private DecisionTableResponse toResponse(DecisionTable table) {
        List<DecisionTableRowResponse> rows = decisionTableRowRepository.findByDecisionTableIdOrderByRowNumberAsc(table.getId())
                .stream()
                .map(this::toRowResponse)
                .toList();
        return DecisionTableResponse.builder()
                .id(table.getId())
                .ruleId(table.getRule().getId())
                .tableName(table.getTableName())
                .description(table.getDescription())
                .inputColumns(table.getInputColumns())
                .outputColumns(table.getOutputColumns())
                .hitPolicy(table.getHitPolicy())
                .status(table.getStatus())
                .tableVersion(table.getTableVersion())
                .tenantId(table.getTenantId())
                .rows(rows)
                .createdAt(table.getCreatedAt())
                .updatedAt(table.getUpdatedAt())
                .build();
    }

    private DecisionTableSummary toSummary(DecisionTable table) {
        return DecisionTableSummary.builder()
                .id(table.getId())
                .tableName(table.getTableName())
                .hitPolicy(table.getHitPolicy())
                .status(table.getStatus())
                .tableVersion(table.getTableVersion())
                .updatedAt(table.getUpdatedAt())
                .build();
    }

    private DecisionTableRowResponse toRowResponse(DecisionTableRow row) {
        return DecisionTableRowResponse.builder()
                .id(row.getId())
                .rowNumber(row.getRowNumber())
                .inputValues(row.getInputValues())
                .outputValues(row.getOutputValues())
                .description(row.getDescription())
                .isActive(row.getIsActive())
                .priority(row.getPriority())
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }
}
